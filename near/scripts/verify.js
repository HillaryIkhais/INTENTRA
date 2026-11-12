// Independent verifier: talks only to NEAR JSON-RPC. It does not import the
// INTENTRA SDK and does not trust transaction return values from the runner.
const fs = require('fs');
const path = require('path');

const RPC = process.env.NEAR_RPC || 'https://rpc.testnet.fastnear.com';
const EVIDENCE = path.join(__dirname, '..', 'evidence');
const scenario = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'testnet-scenario.json'), 'utf8'));
const deployment = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'deployment.json'), 'utf8'));

async function rpc(method, params, attempt = 0) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'verify', method, params }),
  });
  const json = await response.json();
  if (json.error) {
    const rateLimited = json.error.code === -429 || /rate|deprecated/i.test(json.error.message || '');
    if (rateLimited && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

async function view(methodName, args) {
  const result = await rpc('query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: deployment.contract_id,
    method_name: methodName,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
  });
  return JSON.parse(Buffer.from(result.result, 'base64').toString('utf8'));
}

async function account(accountId) {
  return rpc('query', {
    request_type: 'view_account',
    finality: 'final',
    account_id: accountId,
  });
}

async function tx(hash, sender) {
  return rpc('tx', { tx_hash: hash, sender_account_id: sender, wait_until: 'FINAL' });
}

function receiptStatus(outcome) {
  const failures = [];
  const logs = [];
  for (const receipt of outcome.receipts_outcome || []) {
    const status = receipt.outcome.status;
    if (status && status.Failure) {
      const failure = status.Failure;
      const text = JSON.stringify(failure);
      failures.push(text);
    }
    logs.push(...((receipt.outcome && receipt.outcome.logs) || []));
  }
  const success =
    (outcome.status && outcome.status.SuccessValue !== undefined) && failures.length === 0;
  return { success, failures, logs, rawStatus: outcome.status };
}

const results = [];
function check(id, description, pass, evidence) {
  results.push({ id, description, pass: Boolean(pass), evidence });
}

async function main() {
  const deploymentAccount = await account(deployment.contract_id);
  check(
    'D1',
    'deployed code hash matches recorded deployment',
    deploymentAccount.code_hash === deployment.code_hash,
    { rpc: deploymentAccount.code_hash, recorded: deployment.code_hash }
  );

  const grantTx = receiptStatus(await tx(scenario.steps[0].txHash, scenario.accounts.owner));
  check('D2', 'init/deposit/grant transactions succeeded', grantTx.success, {
    grant: grantTx.rawStatus,
    init: deployment.init_tx,
    deposit: deployment.deposit_tx,
  });

  const root = await view('get_capability', { capability_id: scenario.capability_ids.root });
  const b = await view('get_capability', { capability_id: scenario.capability_ids.b });
  const c = await view('get_capability', { capability_id: scenario.capability_ids.c });
  const stats = await view('get_stats', {});

  check('A1', 'root is 1 NEAR, owned by Agent A', root && root.max_total === '1000000000000000000000000' && root.agent_id === scenario.accounts.agent_a, root && { max_total: root.max_total, agent_id: root.agent_id });
  check('A2', 'B capability is 0.4 NEAR and is a child of root', b && b.parent_id === scenario.capability_ids.root && b.max_total === '400000000000000000000000', b && { parent_id: b.parent_id, max_total: b.max_total });
  check('A3', 'C capability is 0.15 NEAR and is a child of B', c && c.parent_id === scenario.capability_ids.b && c.max_total === '150000000000000000000000', c && { parent_id: c.parent_id, max_total: c.max_total });
  check('A4', 'B reserved 0.15 NEAR for C and spent 0', b && b.total_allocated === '150000000000000000000000' && b.total_spent === '0', { allocated: b && b.total_allocated, spent: b && b.total_spent });

  const attackStep = scenario.steps.find((s) => s.name === 'attack_escalation');
  const attackTx = receiptStatus(await tx(attackStep.txHash, scenario.accounts.agent_b));
  check(
    'E1',
    '0.8 NEAR escalation from a 0.4 NEAR parent was rejected by the contract',
    !attackTx.success && attackTx.failures.some((f) => f.includes('ATTENUATION')),
    attackTx.failures
  );

  const splitStep = scenario.steps.find((s) => s.name === 'attack_budget_split');
  const splitTx = receiptStatus(await tx(splitStep.txHash, scenario.accounts.owner));
  check(
    'E2',
    'a second 0.7 NEAR allocation was rejected by aggregate reservation',
    !splitTx.success && splitTx.failures.some((f) => f.includes('BUDGET_RESERVATION')),
    splitTx.failures
  );

  check(
    'E3',
    'rejected requests emitted no delegation event and created no child',
    !attackTx.logs.some((line) => line.includes('"event":"delegate"')) &&
      !splitTx.logs.some((line) => line.includes('"event":"delegate"')),
    { attack_logs: attackTx.logs, split_logs: splitTx.logs }
  );
  check('E4', 'root allocation stayed at 0.4 NEAR after rejected split', root.total_allocated === '400000000000000000000000', {
    root_total_allocated: root.total_allocated,
  });

  const validStep = scenario.steps.find((s) => s.name === 'delegate_c_valid');
  const validTx = receiptStatus(await tx(validStep.txHash, scenario.accounts.agent_b));
  check('V1', '0.15 NEAR delegation from B to C succeeded', validTx.success, validTx.rawStatus);

  const execStep = scenario.steps.find((s) => s.name === 'execute_authorized');
  const execTx = receiptStatus(await tx(execStep.txHash, scenario.accounts.agent_c));
  check('X1', 'authorized 0.1 NEAR transfer transaction succeeded', execTx.success, execTx.rawStatus);
  check(
    'X2',
    'transfer was settled by the private callback',
    execTx.logs.some((line) => line.includes('"event":"settle"') && line.includes('"success":true')),
    execTx.logs.filter((line) => line.includes('settle'))
  );

  const execution = await view('get_execution', { execution_id: scenario.execution.execution_id });
  check('X3', 'execution state is COMPLETED with the authorized amount', execution && execution.status === 'COMPLETED' && execution.amount === '100000000000000000000000', execution);

  const recipient = await account(scenario.accounts.recipient);
  const expectedDelta = BigInt(scenario.amounts_yocto.executed_amount);
  const actualDelta = BigInt(recipient.amount) - BigInt(scenario.execution.recipient_before);
  check('X4', 'recipient balance increased by exactly 0.1 NEAR', actualDelta === expectedDelta, {
    expected_delta: expectedDelta.toString(),
    actual_delta: actualDelta.toString(),
  });

  const revokeStep = scenario.steps.find((s) => s.name === 'revoke_root');
  const revokeTx = receiptStatus(await tx(revokeStep.txHash, scenario.accounts.owner));
  check('R1', 'owner revocation transaction succeeded', revokeTx.success, revokeTx.rawStatus);

  const rootAfter = await view('get_capability', { capability_id: scenario.capability_ids.root });
  const bAfter = await view('get_capability', { capability_id: scenario.capability_ids.b });
  const cAfter = await view('get_capability', { capability_id: scenario.capability_ids.c });
  const usableC = await view('is_usable', { capability_id: scenario.capability_ids.c });
  check('R2', 'root is marked revoked', rootAfter.revoked === true, { revoked: rootAfter.revoked });
  check('R3', 'descendants are not individually rewritten but are unusable', bAfter.revoked === false && cAfter.revoked === false && usableC === false, {
    b_revoked: bAfter.revoked,
    c_revoked: cAfter.revoked,
    c_usable: usableC,
  });

  const lineage = await view('get_lineage', { capability_id: scenario.capability_ids.c });
  check('R4', 'C lineage is C -> B -> root', lineage.length === 3 && lineage[0].id === scenario.capability_ids.c && lineage[2].id === scenario.capability_ids.root, lineage.map((x) => x.id));

  const postB = receiptStatus(await tx(scenario.steps.find((s) => s.name === 'execute_b_after_revoke').txHash, scenario.accounts.agent_b));
  const postC = receiptStatus(await tx(scenario.steps.find((s) => s.name === 'execute_c_after_revoke').txHash, scenario.accounts.agent_c));
  check('R5', 'B cannot execute after ancestor revocation', !postB.success && postB.failures.some((f) => f.includes('REVOKED')), postB.failures);
  check('R6', 'C cannot execute after ancestor revocation', !postC.success && postC.failures.some((f) => f.includes('REVOKED')), postC.failures);
  check('R7', 'post-revocation attempts produced no financial event', ![...postB.logs, ...postC.logs].some((line) => line.includes('"event":"execute"') || line.includes('"event":"settle"')), { b: postB.logs, c: postC.logs });

  const executions = await view('get_executions', { capability_id: scenario.capability_ids.c });
  check('X5', 'exactly one execution exists for C and it is COMPLETED', executions.length === 1 && executions[0].status === 'COMPLETED', executions);

  const report = {
    generated_at: new Date().toISOString(),
    network: 'testnet',
    rpc: RPC,
    contract_id: deployment.contract_id,
    code_hash: deploymentAccount.code_hash,
    evidence_file: 'evidence/testnet-scenario.json',
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
    },
  };
  fs.writeFileSync(path.join(EVIDENCE, 'verification-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  for (const result of results) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.id} ${result.description}`);
  }
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
