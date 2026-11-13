// Budget-conservation demo. The main product path goes through the INTENTRA
// SDK: owner grant -> recursive delegation -> rejected double-commitment
// attempts -> exact legitimate spends -> cascading revocation.
//
// Agents sign with scoped function-call keys (delegate / execute_transfer /
// revoke only). The raw near-api-js checks at the end prove those keys cannot
// call grant_root, transfer directly, or attach a deposit.
const fs = require('fs');
const path = require('path');
const { connect, keyStores, KeyPair, transactions, utils } = require('near-api-js');
const { IntentraNearClient, IntentraSession } = require('../sdk/dist');
const {
  connectWith,
  credentials,
  CONTRACT_ID,
  NODE_URL,
  yoctoNear,
  writeJson,
} = require('./lib');

const AGENT_A = 'intentra-hb26-a.testnet';
const AGENT_B = 'intentra-hb26-b.testnet';
const AGENT_C = 'intentra-hb26-c.testnet';
const RECIPIENT = 'intentra-hb26-recipient.testnet';
// BigInt yoctoNEAR. Passing BigInt to the SDK means "already yocto"; passing a
// decimal string would be interpreted as NEAR and multiplied by 1e24 again.
const NEAR = (value) => yoctoNear(value);
// Storing a capability consumes contract storage, which reduces the vault's
// liquid balance. Reserve a small buffer so the re-grant does not commit the
// last sliver that the grant itself needs for storage.
const STORAGE_RESERVE = yoctoNear('0.01');
const CRED_DIR = path.join(__dirname, '..', '.credentials');

function scopedCred(agent) {
  return JSON.parse(fs.readFileSync(path.join(CRED_DIR, `${agent}.scoped.json`), 'utf8'));
}

async function scopedAccount(agent) {
  const cred = scopedCred(agent);
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey('testnet', agent, KeyPair.fromString(cred.secret_key));
  const near = await connect({ networkId: 'testnet', nodeUrl: NODE_URL, keyStore });
  return near.account(agent);
}

function outcomeStatus(outcome) {
  if (!outcome || !outcome.status) return 'UNKNOWN';
  if (outcome.status.SuccessValue !== undefined) return 'SUCCESS';
  if (outcome.status.Failure !== undefined) return 'FAILURE';
  return JSON.stringify(outcome.status);
}

function outcomeFailure(outcome) {
  const failure = outcome && outcome.status && outcome.status.Failure;
  if (!failure) return undefined;
  try {
    const action = failure.ActionError;
    if (action && action.kind && action.kind.ExecutionError !== undefined) {
      return String(action.kind.ExecutionError);
    }
    return JSON.stringify(action || failure);
  } catch (_) {
    return JSON.stringify(failure);
  }
}

// Attempt an action with a scoped key and return a normalised failure record.
async function rejected(label, fn) {
  try {
    const outcome = await fn();
    return {
      name: label,
      status: outcomeStatus(outcome),
      txHash: outcome && outcome.transaction_outcome && outcome.transaction_outcome.id,
      failure: outcomeFailure(outcome),
      error: outcomeStatus(outcome) === 'FAILURE' ? outcomeFailure(outcome) : undefined,
    };
  } catch (error) {
    return { name: label, status: 'REJECTED', error: error && (error.message || String(error)) };
  }
}

async function main() {
  const contract = CONTRACT_ID;
  const ownerId = process.env.INTENTRA_OWNER || contract;
  const ownerCred = credentials(ownerId);
  const owner = await IntentraNearClient.connect({
    contractId: contract,
    accountId: ownerId,
    secretKey: ownerCred.secret_key,
  });
  const agentA = await IntentraNearClient.connect({
    contractId: contract,
    accountId: AGENT_A,
    secretKey: scopedCred(AGENT_A).secret_key,
  });
  const agentB = await IntentraNearClient.connect({
    contractId: contract,
    accountId: AGENT_B,
    secretKey: scopedCred(AGENT_B).secret_key,
  });
  const agentC = await IntentraNearClient.connect({
    contractId: contract,
    accountId: AGENT_C,
    secretKey: scopedCred(AGENT_C).secret_key,
  });
  const readOnly = await IntentraNearClient.connect({ contractId: contract });

  const recipient = await connectWith(RECIPIENT);
  const recipientBefore = (await recipient.account.state()).amount;
  const vaultBefore = await readOnly.getVault();

  const steps = [];
  const record = (name, value) => {
    const step = { name, ...value };
    steps.push(step);
    console.log(
      `${name}: ${step.status || ''}${step.errorCode ? ` [${step.errorCode}]` : ''}${
        step.error ? ` (${String(step.error).slice(0, 120)})` : ''
      } tx=${step.txHash || '-'}`
    );
    return step;
  };

  // 1. Owner grants A exactly 1.00 NEAR of authority.
  const grant = await owner.grantRoot({
    agentId: AGENT_A,
    maxTotal: NEAR(1),
    maxPerAction: NEAR(1),
    allowedActions: ['transfer'],
    allowedAssets: ['NEAR'],
    canDelegate: true,
  });
  record('grant_root_a_1_00', {
    status: grant.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: grant.tx.txHash,
    error: grant.tx.error,
    errorCode: grant.tx.errorCode,
    capabilityId: grant.capabilityId,
  });
  const rootId = grant.capabilityId;

  // 2. A reserves 0.40 for B; B reserves 0.15 for C.
  const sessionA = await IntentraSession.open(agentA, rootId);
  const delegateB = await sessionA.delegate({
    childAgentId: AGENT_B,
    maxTotal: NEAR(0.4),
    maxPerAction: NEAR(0.4),
    canDelegate: true,
  });
  record('delegate_b_0_40', {
    status: delegateB.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: delegateB.tx.txHash,
    capabilityId: delegateB.capabilityId,
  });
  const bId = delegateB.capabilityId;

  const sessionB = await IntentraSession.open(agentB, bId);
  const delegateC = await sessionB.delegate({
    childAgentId: AGENT_C,
    maxTotal: NEAR(0.15),
    maxPerAction: NEAR(0.15),
    canDelegate: false,
  });
  record('delegate_c_0_15', {
    status: delegateC.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: delegateC.tx.txHash,
    capabilityId: delegateC.capabilityId,
  });
  const cId = delegateC.capabilityId;
  const sessionC = await IntentraSession.open(agentC, cId);

  // 3. Double-commitment attacks. A's own 1.00 limit looks sufficient for 0.61,
  //    but 0.40 is already promised to B. B's own 0.40 limit looks sufficient
  //    for 0.26, but 0.15 is promised to C.
  const attackA = await sessionA.execute({
    amount: NEAR(0.61),
    recipient: RECIPIENT,
    requestId: `attack-a-${Date.now()}`,
  });
  record('attack_a_spend_0_61', {
    status: attackA.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: attackA.tx.txHash,
    error: attackA.tx.error,
    errorCode: attackA.tx.errorCode,
  });

  const attackB = await sessionB.execute({
    amount: NEAR(0.26),
    recipient: RECIPIENT,
    requestId: `attack-b-${Date.now()}`,
  });
  record('attack_b_spend_0_26', {
    status: attackB.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: attackB.tx.txHash,
    error: attackB.tx.error,
    errorCode: attackB.tx.errorCode,
  });

  // 4. Legitimate spends: A 0.60 + B 0.25 + C 0.15 = exactly 1.00 NEAR.
  const executions = {};
  for (const [name, session, amount] of [
    ['spend_a_0_60', sessionA, NEAR(0.6)],
    ['spend_b_0_25', sessionB, NEAR(0.25)],
    ['spend_c_0_15', sessionC, NEAR(0.15)],
  ]) {
    const execution = await session.execute({
      amount,
      recipient: RECIPIENT,
      requestId: `${name}-${Date.now()}`,
    });
    const state = execution.executionId
      ? await readOnly.getExecution(execution.executionId)
      : null;
    executions[name] = {
      executionId: execution.executionId,
      status: state && state.status,
      amount: amount.toString(),
    };
    record(name, {
      status: execution.tx.ok ? 'SUCCESS' : 'FAILURE',
      txHash: execution.tx.txHash,
      error: execution.tx.error,
      errorCode: execution.tx.errorCode,
      executionId: execution.executionId,
      settlement: state && state.status,
    });
  }

  const vaultAfterSpend = await readOnly.getVault();
  const capabilitiesAfterSpend = {
    root: await readOnly.getCapability(rootId),
    b: await readOnly.getCapability(bId),
    c: await readOnly.getCapability(cId),
  };

  // 5. Revoke A. B and C are invalidated transitively by lineage.
  const revoke = await owner.revoke(rootId, 'owner revoked coordinator authority');
  record('revoke_root_a', { status: revoke.ok ? 'SUCCESS' : 'FAILURE', txHash: revoke.txHash, error: revoke.error });

  const postB = await sessionB.execute({
    amount: NEAR(0.01),
    recipient: RECIPIENT,
    requestId: `post-revoke-b-${Date.now()}`,
  });
  record('execute_b_after_revoke', {
    status: postB.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: postB.tx.txHash,
    error: postB.tx.error,
    errorCode: postB.tx.errorCode,
  });

  const postC = await sessionC.execute({
    amount: NEAR(0.01),
    recipient: RECIPIENT,
    requestId: `post-revoke-c-${Date.now()}`,
  });
  record('execute_c_after_revoke', {
    status: postC.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: postC.tx.txHash,
    error: postC.tx.error,
    errorCode: postC.tx.errorCode,
  });

  const usableAfterRevoke = {
    root: await readOnly.isUsable(rootId),
    b: await readOnly.isUsable(bId),
    c: await readOnly.isUsable(cId),
  };

  // 6. Vault conservation: after every transfer settled, the root's unspent
  //    authority is zero. Re-granting more than the actual remaining vault
  //    balance must be rejected; granting exactly the remaining balance works.
  const vaultBeforeRegrant = await readOnly.getVault();
  const available = BigInt(vaultBeforeRegrant.available);

  let overGrant;
  try {
    overGrant = await owner.grantRoot({
      agentId: AGENT_A,
      maxTotal: available + 1n,
      maxPerAction: NEAR(1),
      allowedActions: ['transfer'],
      allowedAssets: ['NEAR'],
      canDelegate: true,
    });
    record('regrant_over_available', {
      status: overGrant.tx.ok ? 'SUCCESS' : 'FAILURE',
      txHash: overGrant.tx.txHash,
      error: overGrant.tx.error,
      errorCode: overGrant.tx.errorCode,
    });
  } catch (error) {
    record('regrant_over_available', {
      status: 'FAILURE',
      error: error.message || String(error),
      errorCode: error.code,
    });
  }

  const exactGrant = await owner.grantRoot({
    agentId: AGENT_A,
    maxTotal: available - STORAGE_RESERVE,
    maxPerAction: available - STORAGE_RESERVE,
    allowedActions: ['transfer'],
    allowedAssets: ['NEAR'],
    canDelegate: true,
  });
  record('regrant_exact_available', {
    status: exactGrant.tx.ok ? 'SUCCESS' : 'FAILURE',
    txHash: exactGrant.tx.txHash,
    error: exactGrant.tx.error,
    capabilityId: exactGrant.capabilityId,
  });
  const regrantId = exactGrant.capabilityId;

  // 7. Scoped function-call keys cannot escalate beyond their permissions.
  const scopedRestrictions = [];
  const aRaw = await scopedAccount(AGENT_A);
  aRaw.accessKeyByPublicKeyCache = {};

  scopedRestrictions.push(
    await rejected('scoped_key_cannot_call_grant_root', async () => {
      const [, signed] = await aRaw.signTransaction(contract, [
        transactions.functionCall(
          'grant_root',
          {
            agent_id: AGENT_B,
            max_total: NEAR(1).toString(),
            max_per_action: NEAR(1).toString(),
            allowed_actions: ['transfer'],
            allowed_assets: ['NEAR'],
            prohibited_actions: [],
            allowed_recipients: null,
            can_delegate: true,
            expires_at_ns: null,
          },
          150_000_000_000_000n,
          0n
        ),
      ]);
      return aRaw.connection.provider.sendTransaction(signed);
    })
  );

  scopedRestrictions.push(
    await rejected('scoped_key_cannot_transfer_directly', async () => {
      aRaw.accessKeyByPublicKeyCache = {};
      const [, signed] = await aRaw.signTransaction(RECIPIENT, [
        transactions.transfer(yoctoNear('0.001')),
      ]);
      return aRaw.connection.provider.sendTransaction(signed);
    })
  );

  scopedRestrictions.push(
    await rejected('scoped_key_cannot_attach_deposit', async () => {
      aRaw.accessKeyByPublicKeyCache = {};
      const [, signed] = await aRaw.signTransaction(contract, [
        transactions.functionCall(
          'execute_transfer',
          {
            capability_id: rootId,
            amount: '1',
            recipient: RECIPIENT,
            request_id: `deposit-attempt-${Date.now()}`,
          },
          150_000_000_000_000n,
          yoctoNear('0.001')
        ),
      ]);
      return aRaw.connection.provider.sendTransaction(signed);
    })
  );

  for (const restriction of scopedRestrictions) {
    steps.push(restriction);
    console.log(`${restriction.name}: ${restriction.status} (${String(restriction.error).slice(0, 120)})`);
  }

  const recipientAfter = (await recipient.account.state()).amount;
  const vaultFinal = await readOnly.getVault();
  const capabilitiesFinal = {
    root: await readOnly.getCapability(rootId),
    b: await readOnly.getCapability(bId),
    c: await readOnly.getCapability(cId),
    regrant: await readOnly.getCapability(regrantId),
  };

  const recipientDelta = (BigInt(recipientAfter) - BigInt(recipientBefore)).toString();
  const totalSpent =
    BigInt(capabilitiesFinal.root.total_spent) +
    BigInt(capabilitiesFinal.b.total_spent) +
    BigInt(capabilitiesFinal.c.total_spent);

  const checks = {
    grant_succeeded: grant.tx.ok,
    delegations_succeeded: delegateB.tx.ok && delegateC.tx.ok,
    attack_a_rejected:
      !attackA.tx.ok && attackA.tx.errorCode === 'BUDGET_RESERVATION',
    attack_b_rejected:
      !attackB.tx.ok && attackB.tx.errorCode === 'BUDGET_RESERVATION',
    all_legitimate_spends_settled: Object.values(executions).every(
      (entry) => entry.status === 'COMPLETED'
    ),
    total_spent_is_exactly_1_near: totalSpent === BigInt(NEAR(1)),
    recipient_received_exactly_1_near: BigInt(recipientDelta) === NEAR(1),
    revoke_succeeded: revoke.ok,
    descendants_unusable: !usableAfterRevoke.b && !usableAfterRevoke.c,
    post_revoke_b_rejected:
      !postB.tx.ok && postB.tx.errorCode === 'REVOKED_LINEAGE',
    post_revoke_c_rejected:
      !postC.tx.ok && postC.tx.errorCode === 'REVOKED_LINEAGE',
    vault_after_spend_has_no_committed_authority: vaultAfterSpend.committed === '0',
    vault_available_equals_liquid_after_spend:
      vaultAfterSpend.available === vaultAfterSpend.liquid,
    over_grant_rejected: (() => {
      const step = steps.find((entry) => entry.name === 'regrant_over_available');
      return step && step.status !== 'SUCCESS';
    })(),
    exact_regrant_succeeded: exactGrant.tx.ok,
    scoped_keys_reject_escalation: scopedRestrictions.every(
      (entry) => entry.status !== 'SUCCESS'
    ),
  };

  const report = {
    generated_at: new Date().toISOString(),
    network: 'testnet',
    contract_id: contract,
    sdk: '@intentra/near',
    accounts: {
      owner: ownerId,
      agent_a: AGENT_A,
      agent_b: AGENT_B,
      agent_c: AGENT_C,
      recipient: RECIPIENT,
    },
    capability_ids: { root: rootId, b: bId, c: cId, regrant: regrantId },
    amounts_yocto: {
      root: NEAR(1).toString(),
      b: NEAR(0.4).toString(),
      c: NEAR(0.15).toString(),
      attack_a: NEAR(0.61).toString(),
      attack_b: NEAR(0.26).toString(),
      spend_a: NEAR(0.6).toString(),
      spend_b: NEAR(0.25).toString(),
      spend_c: NEAR(0.15).toString(),
    },
    executions,
    scoped_keys: {
      [AGENT_A]: scopedCred(AGENT_A).public_key,
      [AGENT_B]: scopedCred(AGENT_B).public_key,
      [AGENT_C]: scopedCred(AGENT_C).public_key,
    },
    scoped_restrictions: scopedRestrictions,
    vault: {
      before: vaultBefore,
      after_spend: vaultAfterSpend,
      before_regrant: vaultBeforeRegrant,
      final: vaultFinal,
    },
    storage_reserve: STORAGE_RESERVE.toString(),
    capabilities: {
      after_spend: capabilitiesAfterSpend,
      final: capabilitiesFinal,
    },
    usable_after_revoke: usableAfterRevoke,
    recipient: {
      before: recipientBefore,
      after: recipientAfter,
      delta: recipientDelta,
    },
    total_spent: totalSpent.toString(),
    steps,
    checks,
  };

  writeJson(path.join(__dirname, '..', 'evidence', 'budget-demo.json'), report);
  console.log(JSON.stringify(checks, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
