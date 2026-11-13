// Independent verifier for the budget-conservation demo. Talks only to NEAR
// JSON-RPC: it does not import the INTENTRA SDK and does not trust the demo
// runner's boolean checks. Every claim is re-derived from chain state,
// transaction receipts, or access-key permissions.
const fs = require('fs');
const path = require('path');

const RPC = process.env.NEAR_RPC || 'https://rpc.testnet.fastnear.com';
const EVIDENCE = path.join(__dirname, '..', 'evidence');
const demo = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'budget-demo.json'), 'utf8'));
const deployment = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'budget-deployment.json'), 'utf8'));

const NEAR = 1_000_000_000_000_000_000_000_000n;

async function rpc(method, params, attempt = 0) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'verify-budget', method, params }),
  });
  const json = await response.json();
  if (json.error) {
    const retryable =
      json.error.code === -429 || /rate|deprecated|timeout/i.test(json.error.message || '');
    if (retryable && attempt < 5) {
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
  return rpc('query', { request_type: 'view_account', finality: 'final', account_id: accountId });
}

async function accessKey(accountId, publicKey) {
  return rpc('query', {
    request_type: 'view_access_key',
    finality: 'final',
    account_id: accountId,
    public_key: publicKey,
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
    if (status && status.Failure) failures.push(JSON.stringify(status.Failure));
    logs.push(...((receipt.outcome && receipt.outcome.logs) || []));
  }
  const success =
    outcome.status && outcome.status.SuccessValue !== undefined && failures.length === 0;
  return { success, failures, logs };
}

const results = [];
function check(id, description, pass, evidence) {
  results.push({ id, description, pass: Boolean(pass), evidence });
}

function step(name) {
  return demo.steps.find((entry) => entry.name === name);
}

function u128(value) {
  return BigInt(value || '0');
}

async function main() {
  const deploymentAccount = await account(deployment.contract_id);
  check('B1', 'deployed code hash matches the recorded budget deployment', deploymentAccount.code_hash === deployment.code_hash, {
    rpc: deploymentAccount.code_hash,
    recorded: deployment.code_hash,
  });

  // --- delegation tree -----------------------------------------------------
  const grantTx = receiptStatus(await tx(step('grant_root_a_1_00').txHash, demo.accounts.owner));
  const delegateBTx = receiptStatus(await tx(step('delegate_b_0_40').txHash, demo.accounts.agent_a));
  const delegateCTx = receiptStatus(await tx(step('delegate_c_0_15').txHash, demo.accounts.agent_b));
  check('B2', 'grant and both delegations succeeded', grantTx.success && delegateBTx.success && delegateCTx.success, {
    grant: grantTx.success,
    delegate_b: delegateBTx.success,
    delegate_c: delegateCTx.success,
  });

  const root = await view('get_capability', { capability_id: demo.capability_ids.root });
  const b = await view('get_capability', { capability_id: demo.capability_ids.b });
  const c = await view('get_capability', { capability_id: demo.capability_ids.c });

  check(
    'B3',
    'root holds 1.00 NEAR, delegated 0.40 to B, and spent 0.60',
    root.max_total === NEAR.toString() &&
      root.total_allocated === (NEAR * 4n / 10n).toString() &&
      root.total_spent === (NEAR * 6n / 10n).toString(),
    { max_total: root.max_total, allocated: root.total_allocated, spent: root.total_spent }
  );
  check(
    'B4',
    'B holds 0.40 NEAR, delegated 0.15 to C, and spent 0.25',
    b.max_total === (NEAR * 4n / 10n).toString() &&
      b.total_allocated === (NEAR * 15n / 100n).toString() &&
      b.total_spent === (NEAR * 25n / 100n).toString(),
    { max_total: b.max_total, allocated: b.total_allocated, spent: b.total_spent }
  );
  check(
    'B5',
    'C holds 0.15 NEAR and spent exactly 0.15',
    c.max_total === (NEAR * 15n / 100n).toString() &&
      c.total_allocated === '0' &&
      c.total_spent === (NEAR * 15n / 100n).toString(),
    { max_total: c.max_total, allocated: c.total_allocated, spent: c.total_spent }
  );

  const nodes = [root, b, c];
  const conservationHolds = nodes.every(
    (node) => u128(node.total_spent) + u128(node.total_allocated) <= u128(node.max_total)
  );
  const spentSum = nodes.reduce((sum, node) => sum + u128(node.total_spent), 0n);
  check('B6', 'every node satisfies spent + allocated <= max_total', conservationHolds, nodes.map((node) => ({
    id: node.id,
    spent: node.total_spent,
    allocated: node.total_allocated,
    max_total: node.max_total,
    remaining: node.remaining,
  })));
  check('B7', 'total spent across the tree is exactly 1.00 NEAR', spentSum === NEAR, {
    total_spent: spentSum.toString(),
  });

  // --- double-commitment attacks ------------------------------------------
  const attackA = receiptStatus(await tx(step('attack_a_spend_0_61').txHash, demo.accounts.agent_a));
  const attackB = receiptStatus(await tx(step('attack_b_spend_0_26').txHash, demo.accounts.agent_b));
  check(
    'B8',
    'A spending 0.61 against a 1.00 root with 0.40 reserved was rejected by BUDGET_RESERVATION',
    !attackA.success && attackA.failures.some((entry) => entry.includes('BUDGET_RESERVATION')),
    attackA.failures
  );
  check(
    'B9',
    'B spending 0.26 against a 0.40 capability with 0.15 reserved was rejected by BUDGET_RESERVATION',
    !attackB.success && attackB.failures.some((entry) => entry.includes('BUDGET_RESERVATION')),
    attackB.failures
  );
  check(
    'B10',
    'rejected attacks emitted no execute or settle event',
    ![...attackA.logs, ...attackB.logs].some(
      (line) => line.includes('"event":"execute"') || line.includes('"event":"settle"')
    ),
    { attack_a: attackA.logs, attack_b: attackB.logs }
  );

  // --- legitimate settlement ---------------------------------------------
  const spendNames = ['spend_a_0_60', 'spend_b_0_25', 'spend_c_0_15'];
  const spendSenders = [demo.accounts.agent_a, demo.accounts.agent_b, demo.accounts.agent_c];
  const spendReceipts = [];
  for (let index = 0; index < spendNames.length; index += 1) {
    const outcome = receiptStatus(await tx(step(spendNames[index]).txHash, spendSenders[index]));
    spendReceipts.push(outcome);
  }
  check(
    'B11',
    'all three legitimate spends succeeded and were settled by the private callback',
    spendReceipts.every(
      (outcome) =>
        outcome.success &&
        outcome.logs.some(
          (line) => line.includes('"event":"settle"') && line.includes('"success":true')
        )
    ),
    spendReceipts.map((outcome) => ({ success: outcome.success, logs: outcome.logs.length }))
  );

  const amountKeys = { spend_a_0_60: 'spend_a', spend_b_0_25: 'spend_b', spend_c_0_15: 'spend_c' };
  const executionChecks = [];
  for (const name of spendNames) {
    const execution = await view('get_execution', { execution_id: demo.executions[name].executionId });
    executionChecks.push({
      name,
      ok:
        execution &&
        execution.status === 'COMPLETED' &&
        execution.amount === demo.amounts_yocto[amountKeys[name]],
      status: execution && execution.status,
      amount: execution && execution.amount,
      expected: demo.amounts_yocto[amountKeys[name]],
    });
  }
  check('B12', 'each spend execution is COMPLETED with the expected amount', executionChecks.every((entry) => entry.ok), executionChecks);

  const recipient = await account(demo.accounts.recipient);
  const recipientDelta = BigInt(recipient.amount) - BigInt(demo.recipient.before);
  check('B13', 'recipient balance increased by exactly 1.00 NEAR', recipientDelta === NEAR, {
    before: demo.recipient.before,
    after: recipient.amount,
    delta: recipientDelta.toString(),
  });

  // --- revocation cascade -------------------------------------------------
  const revokeTx = receiptStatus(await tx(step('revoke_root_a').txHash, demo.accounts.owner));
  check('B14', 'owner revocation transaction succeeded', revokeTx.success, revokeTx.success);
  const usableB = await view('is_usable', { capability_id: demo.capability_ids.b });
  const usableC = await view('is_usable', { capability_id: demo.capability_ids.c });
  check('B15', 'B and C are unusable after root revocation', usableB === false && usableC === false, {
    usable_b: usableB,
    usable_c: usableC,
  });

  const postB = receiptStatus(await tx(step('execute_b_after_revoke').txHash, demo.accounts.agent_b));
  const postC = receiptStatus(await tx(step('execute_c_after_revoke').txHash, demo.accounts.agent_c));
  check(
    'B16',
    'post-revocation executions were rejected by lineage enforcement',
    !postB.success &&
      !postC.success &&
      postB.failures.some((entry) => entry.includes('REVOKED')) &&
      postC.failures.some((entry) => entry.includes('REVOKED')),
    { b: postB.failures, c: postC.failures }
  );

  // --- vault conservation -------------------------------------------------
  const vault = await view('get_vault', {});
  const regrant = await view('get_capability', { capability_id: demo.capability_ids.regrant });
  check(
    'B17',
    'vault committed authority equals the single live re-granted root',
    vault.committed === regrant.max_total && vault.live_roots === 1,
    { committed: vault.committed, regrant_max_total: regrant.max_total, live_roots: vault.live_roots }
  );
  check(
    'B18',
    'vault available equals liquid minus committed',
    u128(vault.available) === u128(vault.liquid) - u128(vault.committed),
    vault
  );

  const overGrant = step('regrant_over_available');
  const exactGrant = step('regrant_exact_available');
  check(
    'B19',
    'granting more than the available vault balance was rejected by VAULT',
    overGrant.status !== 'SUCCESS' &&
      (overGrant.errorCode === 'VAULT_EXHAUSTED' || /VAULT/.test(String(overGrant.error || ''))),
    { status: overGrant.status, error: overGrant.error, errorCode: overGrant.errorCode }
  );
  check(
    'B20',
    'granting the available vault balance minus the storage reserve succeeded',
    exactGrant.status === 'SUCCESS' &&
      regrant.max_total ===
        (u128(demo.vault.before_regrant.available) - u128(demo.storage_reserve)).toString(),
    {
      status: exactGrant.status,
      tx: exactGrant.txHash,
      regrant_max_total: regrant.max_total,
      available: demo.vault.before_regrant.available,
      storage_reserve: demo.storage_reserve,
    }
  );

  check(
    'B21',
    'after the three legitimate spends the vault has no committed authority',
    demo.vault.after_spend.committed === '0' &&
      demo.vault.after_spend.available === demo.vault.after_spend.liquid,
    demo.vault.after_spend
  );

  // --- scoped function-call keys -----------------------------------------
  const expectedMethods = ['delegate', 'execute_transfer', 'revoke'];
  for (const [agentId, publicKey] of Object.entries(demo.scoped_keys)) {
    const key = await accessKey(agentId, publicKey);
    const permission = key && key.permission && key.permission.FunctionCall;
    const methods = (permission && permission.method_names) || [];
    const matches =
      permission &&
      permission.receiver_id === deployment.contract_id &&
      permission.allowance &&
      expectedMethods.every((method) => methods.includes(method)) &&
      !methods.includes('grant_root');
    check(
      `B22.${agentId.split('.')[0]}`,
      `scoped key on ${agentId} is limited to the contract and three methods`,
      Boolean(matches),
      {
        public_key: publicKey,
        receiver_id: permission && permission.receiver_id,
        method_names: methods,
        allowance: permission && permission.allowance,
      }
    );
  }

  const restrictions = demo.scoped_restrictions || [];
  check(
    'B23',
    'scoped keys could not call grant_root, transfer directly, or attach a deposit',
    restrictions.length === 3 && restrictions.every((entry) => entry.status !== 'SUCCESS'),
    restrictions.map((entry) => ({ name: entry.name, status: entry.status, error: entry.error }))
  );

  const report = {
    generated_at: new Date().toISOString(),
    network: 'testnet',
    rpc: RPC,
    contract_id: deployment.contract_id,
    code_hash: deploymentAccount.code_hash,
    evidence_file: 'evidence/budget-demo.json',
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter((entry) => entry.pass).length,
      failed: results.filter((entry) => !entry.pass).length,
    },
  };
  fs.writeFileSync(
    path.join(EVIDENCE, 'budget-verification.json'),
    JSON.stringify(report, null, 2)
  );
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
