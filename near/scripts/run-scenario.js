const path = require('path');
const {
  connectWith,
  call,
  view,
  yoctoNear,
  CONTRACT_ID,
  writeJson,
} = require('./lib');

const OWNER = CONTRACT_ID;
const AGENT_A = 'intentra-hb26-a.testnet';
const AGENT_B = 'intentra-hb26-b.testnet';
const AGENT_C = 'intentra-hb26-c.testnet';
const RECIPIENT = 'intentra-hb26-recipient.testnet';

const NEAR = (n) => yoctoNear(n).toString();

function eventData(step, name) {
  const event = step.events.find((e) => e.event === name);
  return event ? event.data : undefined;
}

async function main() {
  const owner = await connectWith(OWNER);
  const a = await connectWith(AGENT_A);
  const b = await connectWith(AGENT_B);
  const c = await connectWith(AGENT_C);
  const recipient = await connectWith(RECIPIENT);

  const recipientBefore = (await recipient.account.state()).amount;
  const steps = [];
  const record = (name, result, extra = {}) => {
    const step = { name, ...result, ...extra };
    steps.push(step);
    console.log(
      `${name}: ${step.status}${step.failure ? ` (${step.failure})` : ''} tx=${step.txHash}`
    );
    return step;
  };

  // 1. Owner grants root authority: 1 NEAR total, 1 NEAR per action.
  const grant = record(
    'grant_root',
    await call(owner.account, CONTRACT_ID, 'grant_root', {
      agent_id: AGENT_A,
      max_total: NEAR(1),
      max_per_action: NEAR(1),
      allowed_actions: ['transfer'],
      allowed_assets: ['NEAR'],
      prohibited_actions: [],
      allowed_recipients: null,
      can_delegate: true,
      expires_at_ns: null,
    })
  );
  const rootId = eventData(grant, 'grant').capability_id;

  // 2. Agent A delegates 0.4 NEAR to Agent B.
  const delegateB = record(
    'delegate_b',
    await call(a.account, CONTRACT_ID, 'delegate', {
      parent_id: rootId,
      child_agent_id: AGENT_B,
      max_total: NEAR(0.4),
      max_per_action: NEAR(0.4),
      allowed_actions: ['transfer'],
      allowed_assets: ['NEAR'],
      prohibited_actions: [],
      allowed_recipients: null,
      can_delegate: true,
      expires_at_ns: null,
    })
  );
  const bId = eventData(delegateB, 'delegate').capability_id;

  // 3. ATTACK: Agent B attempts to delegate 0.8 NEAR to Agent C, twice its own
  //    0.4 NEAR allocation. This must be rejected.
  const attack = record(
    'attack_escalation',
    await call(b.account, CONTRACT_ID, 'delegate', {
      parent_id: bId,
      child_agent_id: AGENT_C,
      max_total: NEAR(0.8),
      max_per_action: NEAR(0.8),
      allowed_actions: ['transfer'],
      allowed_assets: ['NEAR'],
      prohibited_actions: [],
      allowed_recipients: null,
      can_delegate: false,
      expires_at_ns: null,
    })
  );

  // 4. AGGREGATE RESERVATION: A tries to allocate another 0.7 NEAR while 0.4 is
  //    already reserved by B. 0.4 + 0.7 > 1.0 and must be rejected.
  const split = record(
    'attack_budget_split',
    await call(a.account, CONTRACT_ID, 'delegate', {
      parent_id: rootId,
      child_agent_id: 'intentra-hb26-d.testnet',
      max_total: NEAR(0.7),
      max_per_action: NEAR(0.7),
      allowed_actions: ['transfer'],
      allowed_assets: ['NEAR'],
      prohibited_actions: [],
      allowed_recipients: null,
      can_delegate: false,
      expires_at_ns: null,
    })
  );

  // 5. VALID: Agent B delegates 0.15 NEAR to Agent C.
  const delegateC = record(
    'delegate_c_valid',
    await call(b.account, CONTRACT_ID, 'delegate', {
      parent_id: bId,
      child_agent_id: AGENT_C,
      max_total: NEAR(0.15),
      max_per_action: NEAR(0.15),
      allowed_actions: ['transfer'],
      allowed_assets: ['NEAR'],
      prohibited_actions: [],
      allowed_recipients: null,
      can_delegate: false,
      expires_at_ns: null,
    })
  );
  const cId = eventData(delegateC, 'delegate').capability_id;

  // 6. EXECUTE: Agent C performs a real 0.1 NEAR transfer.
  const execution = record(
    'execute_authorized',
    await call(c.account, CONTRACT_ID, 'execute_transfer', {
      capability_id: cId,
      amount: NEAR(0.1),
      recipient: RECIPIENT,
      request_id: `payout-${Date.now()}`,
    }),
    { capability_id: cId, request_id: 'generated' }
  );

  const executionId = eventData(execution, 'execute').execution_id;
  const executionEvent = eventData(execution, 'execute');
  const executionState = await view(c.account, CONTRACT_ID, 'get_execution', {
    execution_id: executionId,
  });

  // 7. REVOKE: owner revokes the root capability. Descendants must become
  //    unable to execute even though their own records are not marked revoked.
  const revoke = record(
    'revoke_root',
    await call(owner.account, CONTRACT_ID, 'revoke', {
      capability_id: rootId,
      reason: 'owner revoked root authority',
    }),
    { capability_id: rootId }
  );

  const bAfterRevoke = record(
    'execute_b_after_revoke',
    await call(b.account, CONTRACT_ID, 'execute_transfer', {
      capability_id: bId,
      amount: NEAR(0.01),
      recipient: RECIPIENT,
      request_id: `post-revoke-b-${Date.now()}`,
    })
  );

  const cAfterRevoke = record(
    'execute_c_after_revoke',
    await call(c.account, CONTRACT_ID, 'execute_transfer', {
      capability_id: cId,
      amount: NEAR(0.01),
      recipient: RECIPIENT,
      request_id: `post-revoke-c-${Date.now()}`,
    })
  );

  const recipientAfter = (await recipient.account.state()).amount;

  const state = {
    root: await view(owner.account, CONTRACT_ID, 'get_capability', { capability_id: rootId }),
    b: await view(owner.account, CONTRACT_ID, 'get_capability', { capability_id: bId }),
    c: await view(owner.account, CONTRACT_ID, 'get_capability', { capability_id: cId }),
    lineage_c: await view(owner.account, CONTRACT_ID, 'get_lineage', { capability_id: cId }),
    is_usable_c: await view(owner.account, CONTRACT_ID, 'is_usable', { capability_id: cId }),
    is_usable_root: await view(owner.account, CONTRACT_ID, 'is_usable', {
      capability_id: rootId,
    }),
    executions_c: await view(owner.account, CONTRACT_ID, 'get_executions', {
      capability_id: cId,
    }),
    stats: await view(owner.account, CONTRACT_ID, 'get_stats', {}),
  };

  const report = {
    network: 'testnet',
    contract_id: CONTRACT_ID,
    generated_at: new Date().toISOString(),
    accounts: { owner: OWNER, agent_a: AGENT_A, agent_b: AGENT_B, agent_c: AGENT_C, recipient: RECIPIENT },
    amounts_yocto: {
      root_max_total: NEAR(1),
      b_max_total: NEAR(0.4),
      attack_max_total: NEAR(0.8),
      split_max_total: NEAR(0.7),
      c_max_total: NEAR(0.15),
      executed_amount: NEAR(0.1),
      post_revoke_amount: NEAR(0.01),
    },
    capability_ids: { root: rootId, b: bId, c: cId },
    execution: {
      execution_id: executionId,
      event: executionEvent,
      final_state: executionState,
      recipient_before: recipientBefore,
      recipient_after: recipientAfter,
      recipient_delta: (BigInt(recipientAfter) - BigInt(recipientBefore)).toString(),
    },
    steps,
    state,
    checks: {
      attack_rejected: attack.status === 'FAILURE',
      attack_reason: attack.failure,
      split_rejected: split.status === 'FAILURE',
      split_reason: split.failure,
      valid_delegation_succeeded: delegateC.status === 'SUCCESS',
      authorized_execution_succeeded: execution.status === 'SUCCESS',
      authorized_execution_settled: executionState && executionState.status === 'COMPLETED',
      revoke_succeeded: revoke.status === 'SUCCESS',
      b_blocked_after_revoke:
        bAfterRevoke.status === 'FAILURE' && /REVOKED/.test(bAfterRevoke.failure || ''),
      c_blocked_after_revoke:
        cAfterRevoke.status === 'FAILURE' && /REVOKED/.test(cAfterRevoke.failure || ''),
      no_unauthorized_execution:
        (!state.executions_c || state.executions_c.filter((e) => e.status === 'COMPLETED').length === 1),
      lineage_transitively_invalid: state.is_usable_c === false && state.is_usable_root === false,
    },
  };

  writeJson(path.join(__dirname, '..', 'evidence', 'testnet-scenario.json'), report);
  console.log(JSON.stringify(report.checks, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
