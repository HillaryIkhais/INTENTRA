const path = require('path');
const { IntentraNearClient, IntentraSession } = require('../sdk/dist');
const { credentials, CONTRACT_ID, writeJson } = require('./lib');

const AGENT_A = 'intentra-hb26-a.testnet';
const AGENT_B = 'intentra-hb26-b.testnet';
const RECIPIENT = 'intentra-hb26-c.testnet';

async function main() {
  const ownerCred = credentials(CONTRACT_ID);
  const aCred = credentials(AGENT_A);
  const bCred = credentials(AGENT_B);

  const owner = await IntentraNearClient.connect({
    contractId: CONTRACT_ID,
    accountId: CONTRACT_ID,
    secretKey: ownerCred.secret_key,
  });
  const a = await IntentraNearClient.connect({
    contractId: CONTRACT_ID,
    accountId: AGENT_A,
    secretKey: aCred.secret_key,
  });
  const b = await IntentraNearClient.connect({
    contractId: CONTRACT_ID,
    accountId: AGENT_B,
    secretKey: bCred.secret_key,
  });
  const readOnly = await IntentraNearClient.connect({ contractId: CONTRACT_ID });

  const checks = [];
  const check = (id, description, pass, evidence) =>
    checks.push({ id, description, pass: Boolean(pass), evidence });

  const before = await readOnly.getStats();

  const grant = await owner.grantRoot({
    agentId: AGENT_A,
    maxTotal: '0.2',
    maxPerAction: '0.1',
    allowedActions: ['transfer'],
    allowedAssets: ['NEAR'],
    canDelegate: true,
  });
  check('S1', 'SDK grantRoot created a root capability', grant.tx.ok && grant.capabilityId > 0, {
    capability_id: grant.capabilityId,
    tx: grant.tx.txHash,
    error: grant.tx.error,
  });

  const sessionA = await IntentraSession.open(a, grant.capabilityId);
  const capabilityA = await sessionA.capability();
  check(
    'S2',
    'SDK can inspect the root capability',
    capabilityA && capabilityA.max_total === '200000000000000000000000',
    capabilityA
  );

  const delegated = await sessionA.delegate({
    childAgentId: AGENT_B,
    maxTotal: '0.05',
    maxPerAction: '0.05',
    canDelegate: true,
  });
  check('S3', 'SDK delegate created a narrower child capability', delegated.tx.ok, {
    capability_id: delegated.capabilityId,
    tx: delegated.tx.txHash,
    error: delegated.tx.error,
  });

  const sessionB = await IntentraSession.open(b, delegated.capabilityId);

  let attack;
  try {
    attack = await sessionB.delegate({
      childAgentId: 'intentra-hb26-c.testnet',
      maxTotal: '0.1',
      maxPerAction: '0.1',
      canDelegate: false,
    });
  } catch (error) {
    attack = { error };
  }
  check('S4', 'SDK surfaces authority escalation as an understandable error', attack.error && attack.error.code === 'AUTHORITY_ESCALATION', {
    code: attack.error && attack.error.code,
    message: attack.error && attack.error.message,
  });

  const execution = await sessionB.execute({
    amount: '0.01',
    recipient: RECIPIENT,
  });
  const executionState = execution.executionId
    ? await readOnly.getExecution(execution.executionId)
    : null;
  check(
    'S5',
    'SDK executed a real transfer and it settled',
    execution.tx.ok && executionState && executionState.status === 'COMPLETED',
    {
      execution_id: execution.executionId,
      tx: execution.tx.txHash,
      state: executionState,
    }
  );

  const lineage = await readOnly.getLineage(delegated.capabilityId);
  check('S6', 'SDK reads the full lineage B -> A root', lineage.length === 2 && lineage[1].id === grant.capabilityId, lineage.map((x) => x.id));

  const revoke = await owner.revoke(grant.capabilityId, 'SDK check revocation');
  check('S7', 'SDK revoke succeeded', revoke.ok, { tx: revoke.txHash, error: revoke.error });

  let blocked;
  try {
    blocked = await sessionB.execute({ amount: '0.01', recipient: RECIPIENT });
  } catch (error) {
    blocked = { error };
  }
  const blockedTx = blocked.tx;
  check(
    'S8',
    'SDK reports revoked lineage after ancestor revocation',
    (blocked.error && blocked.error.code === 'REVOKED_LINEAGE') ||
      (blockedTx && !blockedTx.ok && blockedTx.errorCode === 'REVOKED_LINEAGE'),
    {
      thrown: blocked.error && { code: blocked.error.code, message: blocked.error.message },
      tx: blockedTx && { hash: blockedTx.txHash, error: blockedTx.error, code: blockedTx.errorCode },
    }
  );

  const after = await readOnly.getStats();
  check('S9', 'read-only client can inspect contract stats', after.capability_count >= before.capability_count + 2, {
    before,
    after,
  });

  const report = {
    generated_at: new Date().toISOString(),
    contract_id: CONTRACT_ID,
    sdk: '@intentra/near',
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => !c.pass).length,
    },
  };
  writeJson(path.join(__dirname, '..', 'evidence', 'sdk-check.json'), report);
  console.log(JSON.stringify(report.summary, null, 2));
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id} ${c.description}`);
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
