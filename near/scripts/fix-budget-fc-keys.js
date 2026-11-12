#!/usr/bin/env node
/**
 * Add any missing FC keys to demo agent accounts.
 * Uses the account's full-access key from ~/.near-credentials/testnet/.
 * Idempotent: skips keys already on-chain.
 */
const { KeyPair, keyStores, connect, transactions, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const RPC = process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org";
const CREDS = path.join(process.env.HOME, ".near-credentials");
const VAULT = process.env.INTENTRA_VAULT || "budget-vault.intentra.testnet";
const AGENTS = ["coordinator", "researcher", "verifier", "vendor"];
const FC_ALLOWANCE = "1.0";

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
    const fcKeyFile = path.join(CREDS, "testnet", meta.fc_key_file);

    const fcData = JSON.parse(fs.readFileSync(fcKeyFile, "utf8"));
    const fcPk = fcData.public_key;

    const agentAcct = await near.account(accountId);
    const keys = await agentAcct.getAccessKeys();
    const already = keys.some(k => k.public_key.toString() === fcPk);
    if (already) {
      console.log(`${name}: FC key ${fcPk} already on-chain`);
      continue;
    }

    const r = await agentAcct.signAndSendTransaction({
      receiverId: accountId,
      actions: [
        transactions.addKey(
          KeyPair.fromString(fcData.private_key).getPublicKey(),
          transactions.functionCallAccessKey(VAULT, ["execute", "delegate"], utils.format.parseNearAmount(FC_ALLOWANCE))
        ),
      ],
    });
    if (r.status.Failure) {
      throw new Error(`${name}: addKey failed ${JSON.stringify(r.status.Failure)}`);
    }
    console.log(`${name}: FC key added -> ${VAULT} (${r.transaction.hash}) pk=${fcPk}`);
  }

  console.log("\nAll FC keys verified on-chain.");
}

main().catch((e) => { console.error(e); process.exit(1); });
