#!/usr/bin/env node
/**
 * INTENTRA testnet agent provisioning.
 *
 * For each agent:
 *   1. generate an ed25519 keypair, saving BOTH halves to disk
 *   2. create the agent account as a subaccount of the vault owner
 *   3. add a function-call key restricted to {execute, delegate} on the vault
 *   4. write near-cli credentials so the agent can sign its own calls
 *
 * Credentials are written in near-cli's UnencryptedFileSystemKeyStore format.
 */
const { KeyPair, keyStores, connect } = require("near-api-js");
const fs = require("fs");
const path = require("path");

// near-api-js UnencryptedFileSystemKeyStore expects
// <keyDir>/<networkId>/<accountId>.json
const CREDS_DIR = path.join(process.env.HOME, ".near-credentials");
const OWNER = process.env.INTENTRA_OWNER || "intentra.testnet";
const AGENTS = (process.env.INTENTRA_AGENTS || "purchasing-agent,supplier-agent,worker-agent").split(",");
const ALLOWANCE = "1000000000000000000000000"; // 1 NEX

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(CREDS_DIR),
  });

  const ownerAccount = await near.account(OWNER);

  for (const name of AGENTS) {
    const accountId = `${name}.${OWNER}`;

    // 1. keypair
    const kp = KeyPair.fromRandom("ed25519");
    const publicKey = kp.getPublicKey().toString();
    const privateKey = kp.secretKey;

    // 2. credentials FIRST — the keystore must hold the key before any
    //    transaction signed by it (createAccount / addKey) is built.
    fs.writeFileSync(
      path.join(CREDS_DIR, "testnet", `${accountId}.json`),
      JSON.stringify({ account_id: accountId, public_key: publicKey, private_key: privateKey }, null, 2)
    );

    // 3. create the account as a subaccount of the owner
    const existing = await near.connection.provider.query({
      request_type: "view_account",
      account_id: accountId,
      finality: "optimistic",
    }).catch(() => null);

    if (!existing) {
      const createResult = await ownerAccount.createAccount(accountId, publicKey, "1");
      console.log(`${name}: created account (${createResult.transaction.hash})`);
    } else {
      console.log(`${name}: account already exists`);
    }

    // 4. function-call key restricted to execute/delegate on the vault.
    //    NOTE: methodNames MUST be a list of separate names.
    const agentAccount = await near.account(accountId);
    await agentAccount.addKey(publicKey, OWNER, ["execute", "delegate"], ALLOWANCE);
    console.log(`${name}: FC key added -> ${publicKey}`);
    console.log(`${name}: credentials saved`);
  }

  console.log("\nAll agents provisioned.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
