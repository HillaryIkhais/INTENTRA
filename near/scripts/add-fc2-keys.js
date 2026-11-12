#!/usr/bin/env node
/**
 * Add a new INTENTRA function-call key (restricted to the fresh vault) to each
 * existing agent account. The agent accounts already exist (as subaccounts of
 * intentra.testnet) and hold their own full-access keys; here we ADD a second
 * FC key whose receiver is the NEW vault, without touching the old one.
 *
 * Writes <agent>.intentra.testnet.fc2.json credentials keyed to the new vault.
 */
const { KeyPair, keyStores, connect, transactions, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const RPC = "https://rpc.testnet.fastnear.com";
const CREDS = path.join(process.env.HOME, ".near-credentials");
const VAULT = process.env.INTENTRA_VAULT || "supplier.intentra.testnet";
const AGENTS = ["ops-agent", "payee-agent", "worker-agent", "probe-agent"];
const ALLOWANCE = utils.format.parseNearAmount("0.3");

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(CREDS),
  });

  for (const name of AGENTS) {
    const accountId = `${name}.intentra.testnet`;
    const acct = await near.account(accountId);

    // agent's own full-access key signs the addKey.
    const agentCreds = JSON.parse(
      fs.readFileSync(path.join(CREDS, "testnet", `${accountId}.json`), "utf8")
    );
    const agentKp = KeyPair.fromString(agentCreds.private_key);

    // new function-call key for the new vault.
    const fcKp = KeyPair.fromRandom("ed25519");
    const fcPk = fcKp.getPublicKey().toString();

    const r = await acct.signAndSendTransaction({
      receiverId: accountId,
      actions: [
        transactions.addKey(
          fcKp.getPublicKey(),
          transactions.functionCallAccessKey(VAULT, ["execute", "delegate"], ALLOWANCE)
        ),
      ],
    });
    if (r.status.Failure) throw new Error(`${name}: addKey failed ${JSON.stringify(r.status.Failure)}`);

    const creds = { account_id: accountId, public_key: fcPk, private_key: fcKp.secretKey };
    fs.writeFileSync(
      path.join(CREDS, "testnet", `${accountId}.fc2.json`),
      JSON.stringify(creds, null, 2) + "\n"
    );
    console.log(`${name}: FC2 key -> ${VAULT} (${r.transaction.hash}) pk=${fcPk}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
