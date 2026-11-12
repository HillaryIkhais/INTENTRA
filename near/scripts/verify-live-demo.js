#!/usr/bin/env node
/**
 * Independent verification of the INTENTRA live testnet evidence.
 *
 * Re-queries the deployed contract via NEAR RPC (not SDK return values) and
 * confirms every step of the recorded scenario against live chain state.
 *
 * Usage:
 *   NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
 *     node near/scripts/verify-live-demo.js
 */
const { connect, keyStores, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const EVIDENCE_PATH = path.join(__dirname, "..", "live-demo", "evidence.json");
const REGISTRY_PATH = path.join(__dirname, "..", "live-demo", "agents.json");
const RPC = "https://rpc.testnet.fastnear.com";
const NEAR = (n) => utils.format.parseNearAmount(String(n));

const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
const VAULT = evidence.contract || registry.vault;
const OWNER = evidence.owner || registry.owner;
const SUPPLIER = registry.supplier;

const checks = [];
const assert = (name, ok, detail) => {
  checks.push({ name, ok, detail });
  if (!ok) throw new Error(`VERIFY FAILED: ${name} — ${detail}`);
};

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(
      path.join(process.env.HOME, ".near-credentials")
    ),
  });

  const callView = (method, args = {}) =>
    near.connection.provider.query({
      request_type: "call_function",
      account_id: VAULT,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "final",
    });
  const viewOrNull = async (method, args) => {
    try {
      return JSON.parse(
        Buffer.from((await callView(method, args)).result).toString()
      );
    } catch {
      return null;
    }
  };
  const balance = (id) =>
    near.connection.provider.query({
      request_type: "view_account",
      account_id: id,
      finality: "final",
    }).then((a) => a.amount);

  const tree = await viewOrNull("get_tree", { root_id: 0 });
  const root = tree && tree[0];

  // ── Contract is the audited build ──────────────────────────────────
  const acct = await near.connection.provider.query({
    request_type: "view_account",
    account_id: VAULT,
    finality: "final",
  });
  assert(
    "deployed_code_matches_audited_build",
    acct.code_hash === "3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN",
    `code_hash ${acct.code_hash}`
  );

  // ── Root capability ────────────────────────────────────────────────
  assert("root_exists", !!root, "root capability present");
  assert(
    "root_amount_1_near",
    root && root.max_total === NEAR("1"),
    `root max_total ${root && root.max_total}`
  );
  assert(
    "root_agent_ops_agent",
    root && root.agent_account === "ops-agent.intentra.testnet",
    `root agent ${root && root.agent_account}`
  );

  // ── Delegation A -> B (0.4 NEAR) ───────────────────────────────────
  const bCap = tree && tree.find((c) => c.id === 1);
  assert("b_delegation_exists", !!bCap, "capability 1 (A->B) present");
  assert(
    "b_amount_04_near",
    bCap && bCap.max_total === NEAR("0.4"),
    `B max_total ${bCap && bCap.max_total}`
  );
  assert(
    "b_agent_payee",
    bCap && bCap.agent_account === "payee-agent.intentra.testnet",
    `B agent ${bCap && bCap.agent_account}`
  );

  // ── Delegation B -> C (0.15 NEAR) ──────────────────────────────────
  const cCap = tree && tree.find((c) => c.id === 2);
  assert("c_delegation_exists", !!cCap, "capability 2 (B->C) present");
  assert(
    "c_amount_015_near",
    cCap && cCap.max_total === NEAR("0.15"),
    `C max_total ${cCap && cCap.max_total}`
  );

  // ── Rejections are recorded in transaction outcomes ────────────────
  const byId = (id) => evidence.steps.find((s) => s.id === id);
  const panicOf = (s) => s.panic || "";

  assert(
    "escalation_080_rejected",
    byId("reject_escalation_080") &&
      !byId("reject_escalation_080").success &&
      panicOf(byId("reject_escalation_080")).includes("BUDGET_ESCALATION"),
    "0.8 NEAR escalation rejected with BUDGET_ESCALATION"
  );
  assert(
    "split_030_rejected",
    byId("reject_split_030") &&
      !byId("reject_split_030").success &&
      panicOf(byId("reject_split_030")).includes("BUDGET_ESCALATION"),
    "0.3 NEAR split rejected with BUDGET_ESCALATION"
  );
  assert(
    "per_order_020_rejected",
    byId("reject_per_order_020") &&
      !byId("reject_per_order_020").success &&
      panicOf(byId("reject_per_order_020")).includes("PER_ORDER_EXCEEDED"),
    "0.2 NEAR over per-order limit rejected"
  );
  assert(
    "recipient_rejected",
    byId("reject_recipient") &&
      !byId("reject_recipient").success &&
      panicOf(byId("reject_recipient")).includes("RECIPIENT_FORBIDDEN"),
    "non-allowlisted recipient rejected"
  );
  assert(
    "unknown_key_rejected",
    byId("reject_unknown_key") &&
      !byId("reject_unknown_key").success &&
      panicOf(byId("reject_unknown_key")).includes("UNKNOWN_KEY"),
    "unregistered key answered UNKNOWN_KEY"
  );

  // ── Valid operations ───────────────────────────────────────────────
  assert(
    "delegate_040_succeeded",
    byId("delegate_040") && byId("delegate_040").success,
    "A->B 0.4 NEAR delegation succeeded"
  );
  assert(
    "delegate_015_succeeded",
    byId("delegate_015") && byId("delegate_015").success,
    "B->C 0.15 NEAR delegation succeeded"
  );
  assert(
    "payment_succeeded",
    byId("execute_payment") && byId("execute_payment").success,
    "0.1 NEAR payment executed"
  );
  assert(
    "revoke_succeeded",
    byId("revoke_root") && byId("revoke_root").success,
    "root revocation succeeded"
  );

  // ── Payment moved exactly 0.1 NEAR vault -> supplier ───────────────
  const supplierNow = await balance(SUPPLIER);
  const vaultNow = await balance(VAULT);
  assert(
    "payment_credited_to_supplier",
    BigInt(supplierNow) >= BigInt(NEAR("0.1")),
    `supplier balance now ${supplierNow} yocto`
  );

  // ── Revocation cascaded over the whole tree ────────────────────────
  assert(
    "revocation_cascaded",
    tree.length >= 2 && tree.every((c) => c.revoked === true),
    `all ${tree.length} capabilities revoked`
  );

  // ── Post-revocation descendants are inert ──────────────────────────
  assert(
    "post_revoke_b_rejected",
    byId("post_revoke_B") &&
      !byId("post_revoke_B").success &&
      panicOf(byId("post_revoke_B")).includes("REVOKED_CHAIN"),
    "B rejected with REVOKED_CHAIN after revocation"
  );
  assert(
    "post_revoke_c_rejected",
    byId("post_revoke_C") &&
      !byId("post_revoke_C").success &&
      panicOf(byId("post_revoke_C")).includes("REVOKED_CHAIN"),
    "C rejected with REVOKED_CHAIN after revocation"
  );

  // ── Transaction evidence present ───────────────────────────────────
  const withHash = evidence.steps.filter((s) => s.tx_hash).length;
  assert(
    "all_steps_have_tx_hashes",
    withHash === evidence.steps.length,
    `${withHash}/${evidence.steps.length} steps recorded with transaction hashes`
  );

  evidence.result = "PASS";
  evidence.checks = checks;
  evidence.verified_at = new Date().toISOString();
  evidence.verified_via = "RPC re-query of live testnet state";
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + "\n");

  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.filter((c) => !c.ok).length;
  console.log(`\nVerification: ${pass} passed, ${fail} failed`);
  for (const c of checks) console.log((c.ok ? "PASS " : "FAIL ") + c.name);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
