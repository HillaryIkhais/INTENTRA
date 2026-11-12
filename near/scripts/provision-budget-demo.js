#!/usr/bin/env node
/**
 * Provision agent accounts + FC keys for the INTENTRA budget-commitments demo.
 *
 * Vault: budget-vault.intentra.testnet (owner + vault, freshly deployed)
 * Agents: coordinator, researcher, verifier, vendor (subaccounts of the vault)
 *
 * Each agent gets:
 *   1. A subaccount under the vault owner (with a small balance for gas)
 *   2. A function-call key restricted to {execute, delegate} on the vault
 *
 * Secrets are written under ~/.near-credentials/testnet/ and never committed.
 * A public registry is written to near/live-demo/budget-agents.json.
 */
const { KeyPair, keyStores, connect, transactions, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const RPC = process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org";
const CREDS = path.join(process.env.HOME, ".near-credentials");
const VAULT = process.env.INTENTRA_VAULT || "budget-vault.intentra.testnet";
const OWNER = VAULT; // vault account is also the owner
const AGENT_BALANCE = "0.05";
const FC_ALLOWANCE = "1.0";

const AGENTS = ["coordinator", "researcher", "verifier", "vendor"];

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(CREDS),
  });
  const owner = await near.account(OWNER);

  const registry = {
    network: "testnet",
    owner: OWNER,
    vault: VAULT,
    rpc: RPC,
    agent_method_names: ["execute", "delegate"],
    agents: {},
  };

  for (const name of AGENTS) {
    const accountId = `${name}.${OWNER}`;

    // 1. Generate account key.
    const ak = KeyPair.fromRandom("ed25519");
    fs.mkdirSync(path.join(CREDS, "testnet"), { recursive: true });
    fs.writeFileSync(
      path.join(CREDS, "testnet", `${accountId}.json`),
      JSON.stringify({
        account_id: accountId,
        public_key: ak.getPublicKey().toString(),
        private_key: ak.secretKey,
      }, null, 2) + "\n"
    );

    // 2. Create subaccount.
    const r1 = await owner.createAccount(
      accountId,
      ak.getPublicKey().toString(),
      utils.format.parseNearAmount(AGENT_BALANCE)
    );
    if (r1.status.Failure) {
      throw new Error(`${name}: createAccount failed ${JSON.stringify(r1.status.Failure)}`);
    }
    console.log(`${name}: created ${accountId} (${r1.transaction.hash})`);

    // 3. Generate FC key and add it restricted to the vault.
    const fk = KeyPair.fromRandom("ed25519");
    const fcPk = fk.getPublicKey().toString();

    const agentAcct = await near.account(accountId);
    const r2 = await agentAcct.signAndSendTransaction({
      receiverId: accountId,
      actions: [
        transactions.addKey(
          fk.getPublicKey(),
          transactions.functionCallAccessKey(VAULT, ["execute", "delegate"], utils.format.parseNearAmount(FC_ALLOWANCE))
        ),
      ],
    });
    if (r2.status.Failure) {
      throw new Error(`${name}: addKey failed ${JSON.stringify(r2.status.Failure)}`);
    }
    console.log(`${name}: FC key -> ${VAULT} (${r2.transaction.hash}) pk=${fcPk}`);

    fs.writeFileSync(
      path.join(CREDS, "testnet", `${accountId}.fc.json`),
      JSON.stringify({
        account_id: accountId,
        public_key: fcPk,
        private_key: fk.secretKey,
      }, null, 2) + "\n"
    );

    registry.agents[name] = {
      account: accountId,
      fc_public_key: fcPk,
      fc_key_file: `${accountId}.fc.json`,
    };
  }

  registry.vendor = registry.agents.vendor.account;
  fs.writeFileSync(
    path.join(__dirname, "..", "live-demo", "budget-agents.json"),
    JSON.stringify(registry, null, 2) + "\n"
  );
  console.log(`\nRegistry written to near/live-demo/budget-agents.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
