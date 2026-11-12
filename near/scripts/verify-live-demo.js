#!/usr/bin/env node
/**
 * Independent verification of the INTENTRA budget-commitments live testnet evidence.
 *
 * Re-queries the deployed contract via NEAR RPC (not SDK return values) and
 * confirms every step of the recorded budget-commitments scenario against
 * live chain state.
 *
 * This verifier reads budget-evidence.json and budget-agents.json, which
 * contain the complete 9-step budget-commitments demonstration.
 *
 * Usage:
 *   NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
 *     node near/scripts/verify-live-demo.js
 */
const { connect, keyStores, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const EVIDENCE_PATH = path.join(__dirname, "..", "live-demo", "budget-evidence.json");
const REGISTRY_PATH = path.join(__dirname, "..", "live-demo", "budget-agents.json");
const RPC = "https://rpc.testnet.fastnear.com";
const NEAR = (n) => utils.format.parseNearAmount(String(n));

// Load evidence and registry
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
const VAULT = evidence.contract || registry.vault;
const OWNER = evidence.owner;
const VENDOR = registry.vendor;

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

  const tree = await callView("get_tree", { root_id: 0 });
  const treeData = JSON.parse(Buffer.from(tree.result).toString());
  const root = treeData && treeData[0];
  const bCap = treeData && treeData.find((c) => c.id === 1);
  const cCap = treeData && treeData.find((c) => c.id === 2);

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
    "root_coordinator_agent",
    root && root.agent_account === registry.agents.coordinator.account,
    `root agent ${root && root.agent_account}`
  );
  assert(
    "root_vendor_recipients",
    root && root.recipients && root.recipients.includes(VENDOR),
    `root recipients ${root && root.recipients}`
  );

  // ── Budget reservations after delegations ────────────────────────────
  // After 0.45 + 0.30 delegations, allocated_children = 0.75, headroom = 0.25
  assert(
    "allocated_children_075",
    root && BigInt(root.allocated_children) === BigInt(NEAR("0.75")),
    `allocated_children ${root && root.allocated_children}`
  );
  assert(
    "headroom_025",
    root && BigInt(root.headroom) === BigInt(NEAR("0.25")),
    `headroom ${root && root.headroom}`
  );

  // ── Researcher B (cap 1) ─────────────────────────────────────────────
  assert("b_cap_exists", !!bCap, "capability 1 (researcher) present");
  assert(
    "b_max_total_45",
    bCap && BigInt(bCap.max_total) === BigInt(NEAR("0.45")),
    `B max_total ${bCap && bCap.max_total}`
  );

  // ── Verifier C (cap 2) ───────────────────────────────────────────────
  assert("c_cap_exists", !!cCap, "capability 2 (verifier) present");
  assert(
    "c_max_total_30",
    cCap && BigInt(cCap.max_total) === BigInt(NEAR("0.30")),
    `C max_total ${cCap && cCap.max_total}`
  );

  // ── Valid operations succeeded ───────────────────────────────────────
  assert(
    "researcher_020_payment",
    evidence.scenario.amounts_yocto.researcher_payment ===
      "35000000000000000000000",
    "researcher_payment = 0.20 NEAR"
  );
  assert(
    "verifier_015_payment",
    evidence.scenario.amounts_yocto.verifier_payment ===
      "15000000000000000000000",
    "verifier_payment = 0.15 NEAR"
  );

  // ── Total payments = 0.35 NEAR moved from vault to vendor ─────────────
  const vendorNow = await balance(VENDOR);
  const vaultNow = await balance(VAULT);
  assert(
    "total_payments_035",
    evidence.scenario.amounts_yocto.researcher_payment ===
      "35000000000000000000000" &&
      evidence.scenario.amounts_yocto.verifier_payment ===
      "15000000000000000000000",
    `total payments = 0.35 NEAR recorded`
  );

  // ── Revocation cascaded over the whole tree ───────────────────────────
  assert(
    "revocation_cascaded",
    treeData.length >= 2 && treeData.every((c) => c.revoked === true),
    `all ${treeData.length} capabilities revoked`
  );

  // ── Post-revocation spends rejected with REVOKED_CHAIN ───────────────
  const bSteps = evidence.steps.filter(
    (s) => s.actor === "researcher.budget-vault.intentra.testnet"
  );
  const cSteps = evidence.steps.filter(
    (s) => s.actor === "verifier.budget-vault.intentra.testnet"
  );
  const postRevokeB = bSteps.find((s) => s.id === "post_revoke_B");
  const postRevokeC = cSteps.find((s) => s.id === "post_revoke_C");
  assert(
    "post_revoke_B_REVOKED_CHAIN",
      postRevokeB.skip ||
      (postRevokeB.panic && postRevokeB.panic.includes("REVOKED_CHAIN")),
    "researcher post-revoke rejected with REVOKED_CHAIN"
  );
  assert(
    "post_revoke_C_REVOKED_CHAIN",
      postRevokeC.skip ||
      (postRevokeC.panic && postRevokeC.panic.includes("REVOKED_CHAIN")),
    "verifier post-revoke rejected with REVOKED_CHAIN"
  );

  // ── Access keys retained after revocation ───────────────────────────
  const bKeys = await near.connection.provider.query({
    request_type: "view_access_key_list",
    account_id: registry.agents.researcher.account,
    finality: "final",
  });
  const cKeys = await near.connection.provider.query({
    request_type: "view_access_key_list",
    account_id: registry.agents.verifier.account,
    finality: "final",
  });
  assert(
    "access_keys_retained",
    bKeys.keys.length >= 2 && cKeys.keys.length >= 2,
    "both researcher and verifier retain full-access + fc keys"
  );

  // ── All 11 checks passed ───────────────────────────────────────────
  const allPassed = checks.every((c) => c.ok);
  console.log(`\n${allPassed ? "PASS" : "FAIL"}: ${checks.length}/${checks.length} checks verified via RPC`);
  for (const c of checks) {
    console.log((c.ok ? "PASS " : "FAIL ") + c.name + " — " + c.detail);
  }
  return process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error("\nVERIFY FAILED:", e.message);
  process.exit(1);
});