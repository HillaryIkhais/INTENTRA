#!/usr/bin/env node
/**
 * Add new function-call keys with higher allowances to demo agent accounts.
 * Existing FC keys (0.03 NEAR allowance) remain in place; new keys (1.0 NEAR)
 * are added alongside them for gas-heavy operations.
 */
const { KeyPair, keyStores, connect, transactions, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const RPC = "https://rpc.testnet.fastnear.com";
const CREDS = path.join(process.env.HOME, ".near-credentials");
const VAULT = process.env.INTENTRA_VAULT || "budget-vault.intentra.testnet";
const AGENTS = ["coordinator", "researcher", "verifier", "vendor"];
const FC_ALLOWANCE = "1.0"; // 1.0 NEAR allowance per key

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(CREDS),
  });

  const registryPath = path.join(__dirname, "..", "live-demo", "budget-agents.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  for (const name of AGENTS) {
    const accountId = `${name}.${VAULT}`;
    const meta = registry.agents[name];

    // Generate new FC key
    const fk = KeyPair.fromRandom("ed25519");
    const fcPk = fk.getPublicKey().toString();

    const agentAcct = await near.account(accountId);
    const r = await agentAcct.signAndSendTransaction({
      receiverId: accountId,
      actions: [
        transactions.addKey(
          fk.getPublicKey(),
          transactions.functionCallAccessKey(VAULT, ["execute", "delegate"], utils.format.parseNearAmount(FC_ALLOWANCE))
        ),
      ],
    });
    if (r.status.Failure) {
      throw new Error(`${name}: addKey failed ${JSON.stringify(r.status.Failure)}`);
    }
    console.log(`${name}: new FC key -> ${VAULT} (${r.transaction.hash}) pk=${fcPk} allowance=1.0 NEAR`);

    // Update registry: switch to the new key
    meta.fc_public_key = fcPk;
    meta.fc_key_file = `${accountId}.fc2.json`;

    fs.writeFileSync(
      path.join(CREDS, "testnet", `${accountId}.fc2.json`),
      JSON.stringify({
        account_id: accountId,
        public_key: fcPk,
        private_key: fk.secretKey,
      }, null, 2) + "\n"
    );
  }

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`\nRegistry updated: ${registryPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
