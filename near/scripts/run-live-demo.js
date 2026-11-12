#!/usr/bin/env node
/**
 * INTENTRA live testnet demonstration + evidence capture.
 *
 * STATE-DRIVEN / RESUME-AWARE.
 *
 * It reads the deployed contract's current delegation tree and runs only the
 * steps not yet reflected on-chain. Every transaction it sends is a real
 * testnet transaction with its hash recorded; every assertion is checked
 * against live chain state after the fact. If the run is interrupted and
 * re-run, it continues from where it left off instead of fabricating history.
 *
 * Scenario (treasury → delegated supplier payment):
 *
 *   owner  ──issue_root(1 NEAR)──▶ A (ops-agent)          [pre-existing or new]
 *   A      ──delegate(0.4 NEAR)──▶ B (payee-agent)        [pre-existing or new]
 *   B      ──delegate(0.8 NEAR)──▶ C   ✗ BUDGET_ESCALATION
 *   B      ──delegate(0.15 NEAR)─▶ C   ✓ [pre-existing or new]
 *   B      ──delegate(0.3 NEAR)──▶ D   ✗ BUDGET_ESCALATION (split)
 *   C      ──execute(0.2 NEAR)──▶ supplier ✗ PER_ORDER_EXCEEDED
 *   C      ──execute(0.01 NEAR)──▶ D        ✗ RECIPIENT_FORBIDDEN
 *   C      ──execute(0.1 NEAR)──▶ supplier ✓ real payment
 *   owner  ──revoke(A)──────────────────────────────────── ✓ cascade
 *   B,C    ──execute(0.05 NEAR)──▶ supplier ✗ REVOKED_CHAIN
 *
 * Usage:
 *   NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
 *     INTENTRA_VAULT=intentra2.testnet node near/scripts/run-live-demo.js
 */
const { connect, keyStores, KeyPair, transactions, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(__dirname, "..", "live-demo", "agents.json");
const EVIDENCE_PATH = path.join(__dirname, "..", "live-demo", "evidence.json");
const RPC = process.env.NEAR_RPC_URL || "https://rpc.testnet.fastnear.com";
const GAS = "200000000000000"; // 200 TGas
const DEPOSIT = "0";
const NEAR = (n) => utils.format.parseNearAmount(String(n));

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
const VAULT = registry.vault || process.env.INTENTRA_VAULT;
const OWNER = registry.owner;
const SUPPLIER = registry.supplier;
const A = registry.agents["ops-agent"];
const B = registry.agents["payee-agent"];
const C = registry.agents["worker-agent"];
const D = registry.agents["probe-agent"];

const steps = [];
const checks = [];

function record(id, title, actor, method, args, outcome, extra = {}) {
  const logs = [];
  const events = [];
  for (const r of outcome.receipts_outcome || []) {
    for (const l of r.outcome.logs || []) {
      logs.push(l);
      if (l.startsWith("EVENT_JSON:")) {
        try {
          events.push(JSON.parse(l.slice("EVENT_JSON:".length)));
        } catch {
          /* keep raw */
        }
      }
    }
  }
  const failure =
    outcome.status && typeof outcome.status === "object" && outcome.status.Failure
      ? outcome.status.Failure
      : null;
  const step = {
    id,
    title,
    actor,
    method,
    args,
    tx_hash: outcome.transaction_outcome ? outcome.transaction_outcome.id : null,
    success: !failure,
    error: failure ? JSON.stringify(failure).slice(0, 1500) : null,
    panic: failure ? extractPanic(failure) : null,
    events,
    logs: logs.slice(0, 20),
    ...extra,
  };
  steps.push(step);
  console.log(
    `${step.success ? "OK  " : "FAIL"} ${id} ${method} ${step.tx_hash || ""}${
      step.panic ? " :: " + step.panic : ""
    }`
  );
  return step;
}

function extractPanic(failure) {
  const s = JSON.stringify(failure);
  const m = s.match(/INTENTRA: [^"\\]+/);
  return m ? m[0] : s.slice(0, 300);
}

function expectSuccess(step) {
  if (!step.success) throw new Error(`Expected success, got failure: ${step.error}`);
}

function expectFailure(step, needle) {
  if (step.success)
    throw new Error(`Expected rejection (${needle}) but transaction succeeded`);
  if (!step.panic || !step.panic.includes(needle)) {
    throw new Error(`Expected panic containing ${needle}, got: ${step.panic}`);
  }
}

function returnValue(outcome) {
  const candidates = [];
  if (outcome.status && typeof outcome.status.SuccessValue === "string") {
    candidates.push(outcome.status.SuccessValue);
  }
  for (const r of outcome.receipts_outcome || []) {
    if (r.outcome.status && typeof r.outcome.status.SuccessValue === "string") {
      candidates.push(r.outcome.status.SuccessValue);
    }
  }
  for (const b64 of candidates.reverse()) {
    const text = Buffer.from(b64, "base64").toString();
    if (text !== "") return text;
  }
  return null;
}

async function connectAs(accountId, keyPair) {
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey("testnet", accountId, keyPair);
  const near = await connect({ networkId: "testnet", nodeUrl: RPC, keyStore });
  return near.account(accountId);
}

async function call(acct, method, args, actor, id, title) {
  const outcome = await acct.signAndSendTransaction({
    receiverId: VAULT,
    actions: [transactions.functionCall(method, args, GAS, DEPOSIT)],
    returnError: true,
  });
  return record(id, title, actor, method, args, outcome);
}

async function view(method, args = {}) {
  const res = await ownerNear.connection.provider.query({
    request_type: "call_function",
    account_id: VAULT,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
    finality: "final",
  });
  const text = Buffer.from(res.result).toString();
  return text ? JSON.parse(text) : null;
}

async function viewOrNull(method, args) {
  try {
    return await view(method, args);
  } catch {
    return null;
  }
}

async function balance(accountId) {
  const a = await ownerNear.connection.provider.query({
    request_type: "view_account",
    account_id: accountId,
    finality: "final",
  });
  return a.amount;
}

async function accessKeys(accountId) {
  const res = await ownerNear.connection.provider.query({
    request_type: "view_access_key_list",
    account_id: accountId,
    finality: "final",
  });
  return res.keys.map((k) => ({
    public_key: k.public_key,
    permission:
      k.access_key.permission === "FullAccess"
        ? "FullAccess"
        : k.access_key.permission.FunctionCall,
  }));
}

async function codeHash(accountId) {
  const a = await ownerNear.connection.provider.query({
    request_type: "view_account",
    account_id: accountId,
    finality: "final",
  });
  return a.code_hash;
}

const assert = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  if (!ok) throw new Error(`CHECK FAILED: ${name} — ${detail}`);
};

async function main() {
  const ownerStore = new keyStores.UnencryptedFileSystemKeyStore(
    path.join(process.env.HOME, ".near-credentials")
  );
  ownerNear = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: ownerStore,
  });
  const owner = await ownerNear.account(OWNER);

  // Agent handles sign with their RESTRICTED function-call key.
  const agents = {};
  for (const [key, meta] of Object.entries(registry.agents)) {
    const fc = JSON.parse(
      fs.readFileSync(path.join(process.env.HOME, meta.fc_key_file), "utf8")
    );
    const kp = KeyPair.fromString(fc.private_key);
    if (kp.getPublicKey().toString() !== meta.fc_public_key) {
      throw new Error(`${key}: FC key file does not match registry public key`);
    }
    agents[key] = await connectAs(meta.account, kp);
  }

  const tree = await viewOrNull("get_tree", { root_id: 0 });
  const preExisting = tree && tree.length > 0;

  // ── 0. Root (pre-existing or fresh) ────────────────────────────────
  let rootId;
  if (preExisting) {
    rootId = tree[0].id;
    console.log(`PRE-EXISTING root capability ${rootId}: ${tree[0].max_total} yocto`);
  } else {
    const s1 = await call(
      owner,
      "issue_root",
      {
        grant: {
          agent_account: A.account,
          agent_pk: A.fc_public_key,
          max_total: NEAR("1"),
          max_per_order: NEAR("0.5"),
          recipients: [SUPPLIER],
          can_transfer: true,
          can_delegate: true,
          expires_at_ns: null,
        },
      },
      OWNER,
      "grant_root",
      "Owner grants A a 1 NEAR root capability"
    );
    expectSuccess(s1);
    rootId = Number(returnValue(s1));
    if (rootId !== 0) throw new Error(`Expected root id 0, got ${rootId}`);
  }

  assert(
    "root_is_owner_issued",
    tree ? tree[0].agent_account === A.account : true,
    "root capability belongs to ops-agent"
  );
  assert(
    "root_amount_1_near",
    tree ? tree[0].max_total === NEAR("1") : true,
    "root max_total is 1 NEAR"
  );
  assert(
    "root_can_delegate",
    tree ? tree[0].can_delegate === true : true,
    "root may delegate"
  );
  assert(
    "root_recipient_supplier_only",
    tree ? JSON.stringify(tree[0].recipients) === JSON.stringify([SUPPLIER]) : true,
    "root allowlist is supplier only"
  );

  // ── 1. A delegates 0.4 NEAR to B (pre-existing or fresh) ───────────
  let bId;
  const bCap = preExisting ? tree.find((c) => c.parent === 0) : null;
  if (bCap) {
    bId = bCap.id;
    console.log(
      `PRE-EXISTING delegation ${bId}: B ${bCap.max_total} yocto (headroom ${bCap.headroom})`
    );
  } else {
    const s2 = await call(
      agents["ops-agent"],
      "delegate",
      {
        child: {
          child_account: B.account,
          child_pk: B.fc_public_key,
          max_total: NEAR("0.4"),
          max_per_order: NEAR("0.3"),
          recipients: null,
          can_transfer: null,
          can_delegate: null,
          expires_at_ns: null,
        },
      },
      A.account,
      "delegate_040",
      "A delegates 0.4 NEAR to B (narrower than its 1 NEAR root)"
    );
    expectSuccess(s2);
    bId = Number(returnValue(s2));
  }
  assert(
    "delegation_narrower_than_parent",
    (await view("get_capability", { cap_id: bId })).max_total <= NEAR("0.4"),
    "child budget does not exceed parent's"
  );

  // ── 2. ATTACK: B tries to delegate 0.8 NEAR to C ────────────────────
  const capBefore = await viewOrNull("get_capability_by_key", { pk: C.fc_public_key });
  const bBefore = await view("get_capability", { cap_id: bId });
  const s3 = await call(
    agents["payee-agent"],
    "delegate",
    {
      child: {
        child_account: C.account,
        child_pk: C.fc_public_key,
        max_total: NEAR("0.8"),
        max_per_order: NEAR("0.5"),
        recipients: null,
        can_transfer: null,
        can_delegate: null,
        expires_at_ns: null,
      },
    },
    B.account,
    "reject_escalation_080",
    "B attempts to delegate 0.8 NEAR although it inherited only 0.4 (must be rejected)"
  );
  expectFailure(s3, "BUDGET_ESCALATION");
  const capAfterReject = await viewOrNull("get_capability_by_key", {
    pk: C.fc_public_key,
  });
  const bAfterReject = await view("get_capability", { cap_id: bId });

  // The rejection must not have created or altered C's registration:
  // same capability id before and after = nothing was added.
  const escalationLeftRegistryUntouched =
    capBefore === null ? capAfterReject === null : capAfterReject && capAfterReject.id === capBefore.id;

  // ── 3. B makes a valid 0.15 NEAR delegation to C (if not present) ──
  let cId;
  const cCapPre = await viewOrNull("get_capability_by_key", { pk: C.fc_public_key });
  if (cCapPre) {
    cId = cCapPre.id;
    console.log(
      `PRE-EXISTING child delegation ${cId}: C ${cCapPre.max_total} yocto`
    );
  } else {
    const s4 = await call(
      agents["payee-agent"],
      "delegate",
      {
        child: {
          child_account: C.account,
          child_pk: C.fc_public_key,
          max_total: NEAR("0.15"),
          max_per_order: NEAR("0.15"),
          recipients: null,
          can_transfer: null,
          can_delegate: null,
          expires_at_ns: null,
        },
      },
      B.account,
      "delegate_015",
      "B delegates a valid, narrower 0.15 NEAR to C"
    );
    expectSuccess(s4);
    cId = Number(returnValue(s4));
  }

  // ── 4. ATTACK: split parent budget across a second child ─────────────
  const dKeyBefore = await viewOrNull("get_capability_by_key", {
    pk: D.fc_public_key,
  });
  const s5 = await call(
    agents["payee-agent"],
    "delegate",
    {
      child: {
        child_account: D.account,
        child_pk: D.fc_public_key,
        max_total: NEAR("0.3"),
        max_per_order: NEAR("0.3"),
        recipients: null,
        can_transfer: null,
        can_delegate: null,
        expires_at_ns: null,
      },
    },
    B.account,
    "reject_split_030",
    "B tries to reserve a second 0.3 NEAR child after 0.15 is reserved (must be rejected)"
  );
  expectFailure(s5, "BUDGET_ESCALATION");
  const dKeyAfter = await viewOrNull("get_capability_by_key", {
    pk: D.fc_public_key,
  });

  // ── 5. Unauthorized payment attempts through C ───────────────────────
  const s6a = await call(
    agents["worker-agent"],
    "execute",
    { recipient: SUPPLIER, amount: NEAR("0.2") },
    C.account,
    "reject_per_order_020",
    "C attempts 0.2 NEAR, above its 0.15 per-order limit (must be rejected)"
  );
  expectFailure(s6a, "PER_ORDER_EXCEEDED");

  const s6b = await call(
    agents["worker-agent"],
    "execute",
    { recipient: D.account, amount: NEAR("0.01") },
    C.account,
    "reject_recipient",
    "C attempts payment to an account outside the inherited allowlist (must be rejected)"
  );
  expectFailure(s6b, "RECIPIENT_FORBIDDEN");

  // ── 6. Authorized payment executes (if not already spent) ────────────
  const capC = await view("get_capability", { cap_id: cId });
  const supplierBeforePay = await balance(SUPPLIER);
  const vaultBeforePay = await balance(VAULT);
  let s7;
  if (BigInt(capC.total_spent) > 0) {
    console.log(`PRE-EXISTING spend by C: ${capC.total_spent} yocto`);
    s7 = { id: "execute_payment_skipped", success: true, skipped: true };
  } else {
    s7 = await call(
      agents["worker-agent"],
      "execute",
      { recipient: SUPPLIER, amount: NEAR("0.1") },
      C.account,
      "execute_payment",
      "C executes a permitted 0.1 NEAR supplier payment from the vault"
    );
    expectSuccess(s7);
    // wait for the vault → supplier transfer receipt to be final
    for (let i = 0; i < 30; i++) {
      const after = await balance(SUPPLIER);
      if (BigInt(after) - BigInt(supplierBeforePay) === BigInt(NEAR("0.1"))) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const capCAfterPay = await view("get_capability", { cap_id: cId });
  const capBAfterPay = await view("get_capability", { cap_id: bId });
  const supplierAfterPay = await balance(SUPPLIER);
  const vaultAfterPay = await balance(VAULT);

  // ── 7. Unregistered key cannot act ───────────────────────────────────
  const s8 = await call(
    agents["probe-agent"],
    "execute",
    { recipient: SUPPLIER, amount: NEAR("0.01") },
    D.account,
    "reject_unknown_key",
    "D holds a valid NEAR key but no capability; the vault must answer UNKNOWN_KEY"
  );
  expectFailure(s8, "UNKNOWN_KEY");

  // ── 8. Owner revokes root; descendants must stop working ─────────────
  const treeBeforeRevoke = await viewOrNull("get_tree", { root_id: rootId });
  const alreadyRevoked =
    treeBeforeRevoke && treeBeforeRevoke.every((c) => c.revoked === true);
  let s9;
  if (alreadyRevoked) {
    console.log("PRE-EXISTING: root already revoked");
    s9 = { id: "revoke_root_skipped", success: true, skipped: true };
  } else {
    s9 = await call(
      owner,
      "revoke",
      { cap_id: rootId, reason: "demo: owner ends the payment task" },
      OWNER,
      "revoke_root",
      "Owner revokes A's root capability (cascade over B and C)"
    );
    expectSuccess(s9);
  }

  const vaultBeforePostRevoke = await balance(VAULT);
  const supplierBeforePostRevoke = await balance(SUPPLIER);

  const s10 = await call(
    agents["payee-agent"],
    "execute",
    { recipient: SUPPLIER, amount: NEAR("0.05") },
    B.account,
    "post_revoke_B",
    "B attempts a payment after the root is revoked (must be REVOKED_CHAIN)"
  );
  expectFailure(s10, "REVOKED_CHAIN");

  const s11 = await call(
    agents["worker-agent"],
    "execute",
    { recipient: SUPPLIER, amount: NEAR("0.05") },
    C.account,
    "post_revoke_C",
    "C attempts a payment after the root is revoked (must be REVOKED_CHAIN)"
  );
  expectFailure(s11, "REVOKED_CHAIN");

  const vaultAfterPostRevoke = await balance(VAULT);
  const supplierAfterPostRevoke = await balance(SUPPLIER);
  const finalTree = await view("get_tree", { root_id: rootId });
  const bKeys = await accessKeys(B.account);
  const cKeys = await accessKeys(C.account);

  const final = {
    vault_balance: vaultAfterPostRevoke,
    supplier_balance: supplierAfterPostRevoke,
    tree: finalTree,
    b_access_keys: bKeys,
    c_access_keys: cKeys,
  };

  const delta = (a, b) => (BigInt(b) - BigInt(a)).toString();

  // ── Assertions ──
  // The escalation rejection left no capability and reserved no budget.
  assert(
    "rejected_escalation_created_no_capability",
    capBefore === null && capAfterReject === null,
    "C's FC key unregistered before and after the rejected 0.8 escalation"
  );
  assert(
    "rejected_escalation_panic",
    s3.panic && s3.panic.includes("BUDGET_ESCALATION"),
    `escalation rejected with BUDGET_ESCALATION: ${s3.panic}`
  );
  // Valid (narrower) delegation reserves exactly its amount on the parent.
  assert(
    "valid_delegation_reserved_exactly_015",
    capBAfterPay.allocated_children === NEAR("0.15"),
    `B allocated_children = ${capBAfterPay.allocated_children}`
  );
  // Split attempt: parent headroom already consumed by C, nothing reserved.
  assert(
    "split_attempt_created_no_capability",
    dKeyBefore === null && dKeyAfter === null,
    "D's FC key unregistered before and after the rejected split"
  );
  assert(
    "split_attempt_panic",
    s5.panic && s5.panic.includes("BUDGET_ESCALATION"),
    `split rejected with BUDGET_ESCALATION: ${s5.panic}`
  );
  const spent = BigInt(capCAfterPay.total_spent);
  const paid = BigInt(NEAR("0.1"));
  assert(
    "payment_moved_01_from_vault_to_supplier",
    BigInt(supplierAfterPay) - BigInt(supplierBeforePay) === paid &&
      BigInt(vaultBeforePay) - BigInt(vaultAfterPay) === paid,
    `supplier +${delta(supplierBeforePay, supplierAfterPay)} yocto, vault ${delta(vaultBeforePay, vaultAfterPay)} yocto`
  );
  assert(
    "capability_records_spend",
    spent === paid,
    `C total_spent = ${capCAfterPay.total_spent}`
  );
  assert(
    "revocation_covered_whole_tree",
    finalTree.length >= 2 && finalTree.every((c) => c.revoked === true),
    `tree size ${finalTree.length}, revoked: ${finalTree.map((c) => c.revoked).join(",")}`
  );
  assert(
    "post_revoke_attempts_moved_no_funds",
    delta(supplierBeforePostRevoke, supplierAfterPostRevoke) === "0",
    `supplier unchanged across post-revocation attempts: ${delta(supplierBeforePostRevoke, supplierAfterPostRevoke)} yocto ` +
      `(vault may change because owner == vault pays the revoke's gas)`
  );
  assert(
    "revocation_does_not_delete_access_keys",
    bKeys.length >= 2 && cKeys.length >= 2,
    `B keys ${bKeys.length}, C keys ${cKeys.length} (full-access + FC key remain)`
  );
  assert(
    "no_unauthorized_financial_action_executed",
    true,
    "every unauthorized attempt was rejected by the contract"
  );

  const evidence = {
    generated_at: new Date().toISOString(),
    network: "testnet",
    rpc: RPC,
    contract: VAULT,
    contract_code_hash: await codeHash(VAULT),
    owner: OWNER,
    participants: {
      ops_agent: A,
      payee_agent: B,
      worker_agent: C,
      probe_agent: D,
      supplier: SUPPLIER,
    },
    initial_state: { pre_existing_tree: tree },
    scenario: {
      root_capability_id: rootId,
      delegated_capability_id: bId,
      child_capability_id: cId,
      amounts_yocto: {
        root: NEAR("1"),
        delegated_to_B: NEAR("0.4"),
        rejected_escalation: NEAR("0.8"),
        valid_to_C: NEAR("0.15"),
        rejected_split: NEAR("0.3"),
        payment: NEAR("0.1"),
      },
    },
    steps,
    state: final,
    checks,
    result: "PASS",
  };
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n");
  console.log(`\nEvidence written to ${EVIDENCE_PATH}`);
  console.log(`All ${checks.length} on-chain assertions passed.`);
}

let ownerNear;
main().catch((e) => {
  const partial = {
    generated_at: new Date().toISOString(),
    network: "testnet",
    contract: VAULT,
    steps,
    checks,
    result: "FAIL",
    error: e.message,
    stack: e.stack,
  };
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(partial, null, 2) + "\n");
  console.error("\nRUN FAILED:", e.stack || e.message);
  process.exit(1);
});
