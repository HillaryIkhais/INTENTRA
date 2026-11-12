#!/usr/bin/env node
/**
 * INTENTRA testnet agent provisioning.
 *
 * Each agent gets TWO keys, which is the point of the key-lifecycle model:
 *
 *   1. an account key (FullAccess) — used only for the agent's own account
 *      administration. It is NOT registered in the vault and therefore gives
 *      no spending authority.
 *   2. a function-call key restricted to {execute, delegate} on the vault,
 *      with a small gas allowance. This is the key the vault registers as
 *      the agent's capability identity.
 *
 * Secrets are written under ~/.near-credentials/testnet/ and never committed.
 * A public-only registry is written to near/live-demo/agents.json.
 *
 * Re-running the script REUSES existing keys instead of rotating them, so a
 * repeat run cannot orphan an on-chain account.
 */
const { KeyPair, keyStores, connect, utils } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const CREDS = path.join(process.env.HOME, ".near-credentials");
const REGISTRY = path.join(__dirname, "..", "live-demo", "agents.json");

const OWNER = process.env.INTENTRA_OWNER || "intentra.testnet";
const VAULT = process.env.INTENTRA_VAULT || OWNER;
const ACCOUNT_BALANCE = process.env.INTENTRA_AGENT_BALANCE || "0.6";
const ALLOWANCE = process.env.INTENTRA_FC_ALLOWANCE || "0.5";
const MIN_BALANCE = "0.4"; // yoctoNEAR string below which we top up

const AGENTS = (
  process.env.INTENTRA_AGENTS ||
  "ops-agent,payee-agent,worker-agent,probe-agent"
).split(",");
const SUPPLIER = process.env.INTENTRA_SUPPLIER || "supplier";

const nearToYocto = (n) => utils.format.parseNearAmount(String(n));

function readKeyFile(accountId) {
  const file = path.join(CREDS, "testnet", `${accountId}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return { file, keyPair: KeyPair.fromString(j.private_key), json: j };
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

async function accountExists(near, accountId) {
  try {
    await near.connection.provider.query({
      request_type: "view_account",
      account_id: accountId,
      finality: "optimistic",
    });
    return true;
  } catch {
    return false;
  }
}

async function onChainKeys(near, accountId) {
  const res = await near.connection.provider.query({
    request_type: "view_access_key_list",
    account_id: accountId,
    finality: "optimistic",
  });
  return res.keys;
}

async function waitForAccount(near, accountId, tries = 30) {
  for (let i = 0; i < tries; i++) {
    if (await accountExists(near, accountId)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const near = await connect({
    networkId: "testnet",
    nodeUrl: process.env.NEAR_RPC_URL || "https://rpc.testnet.fastnear.com",
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(CREDS),
  });
  const ownerAccount = await near.account(OWNER);

  const registry = {
    network: "testnet",
    owner: OWNER,
    vault: VAULT,
    rpc: "https://rpc.testnet.fastnear.com",
    agent_method_names: ["execute", "delegate"],
    agents: {},
  };

  for (const name of AGENTS) {
    const accountId = `${name}.${OWNER}`;

    // 1. account key — reuse if present, never rotate silently.
    let accountKey = readKeyFile(accountId);
    if (!accountKey) {
      const kp = KeyPair.fromRandom("ed25519");
      const file = path.join(CREDS, "testnet", `${accountId}.json`);
      writeJson(file, {
        account_id: accountId,
        public_key: kp.getPublicKey().toString(),
        private_key: kp.secretKey,
      });
      accountKey = { file, keyPair: kp };
    }
    const accountPk = accountKey.keyPair.getPublicKey().toString();

    // 2. restricted function-call key — separate key, reused if present.
    const fcFile = path.join(CREDS, "testnet", `${accountId}.fc.json`);
    let fcKey;
    if (fs.existsSync(fcFile)) {
      const j = JSON.parse(fs.readFileSync(fcFile, "utf8"));
      fcKey = { file: fcFile, keyPair: KeyPair.fromString(j.private_key) };
    } else {
      const kp = KeyPair.fromRandom("ed25519");
      writeJson(fcFile, {
        account_id: accountId,
        public_key: kp.getPublicKey().toString(),
        private_key: kp.secretKey,
      });
      fcKey = { file: fcFile, keyPair: kp };
    }
    const fcPk = fcKey.keyPair.getPublicKey().toString();

    // 3. create the account only if it does not exist.
    if (!(await accountExists(near, accountId))) {
      const r = await ownerAccount.createAccount(
        accountId,
        accountPk,
        nearToYocto(ACCOUNT_BALANCE)
      );
      console.log(`${name}: created ${accountId} (${r.transaction.hash})`);
      if (!(await waitForAccount(near, accountId))) {
        throw new Error(`${name}: account not visible after creation`);
      }
    } else {
      const keys = await onChainKeys(near, accountId);
      if (!keys.some((k) => k.public_key.toString() === accountPk)) {
        throw new Error(
          `${name}: ${accountId} exists but its on-chain keys do not include ` +
            `the stored account key ${accountPk}. Refusing to continue: ` +
            `this account cannot be administered with local credentials.`
        );
      }
      console.log(`${name}: account exists`);
    }

    // 4. top up if the account cannot pay gas.
    const acct = await near.connection.provider.query({
      request_type: "view_account",
      account_id: accountId,
      finality: "optimistic",
    });
    if (BigInt(acct.amount) < BigInt(nearToYocto(MIN_BALANCE))) {
      const r = await ownerAccount.sendMoney(
        accountId,
        nearToYocto(ACCOUNT_BALANCE)
      );
      console.log(`${name}: topped up (${r.transaction.hash})`);
    }

    // 5. install the restricted function-call key if absent.
    const keys = await onChainKeys(near, accountId);
    const hasFc = keys.some((k) => {
      if (k.public_key.toString() !== fcPk) return false;
      const perm = k.access_key.permission;
      return (
        perm &&
        perm !== "FullAccess" &&
        perm.FunctionCall &&
        perm.FunctionCall.receiver_id === VAULT
      );
    });
    if (hasFc) {
      console.log(`${name}: FC key already installed`);
    } else {
      const agentAccount = await near.account(accountId);
      const r = await agentAccount.addKey(
        fcPk,
        VAULT,
        ["execute", "delegate"],
        nearToYocto(ALLOWANCE)
      );
      console.log(`${name}: FC key installed (${r.transaction.hash})`);
    }

    registry.agents[name] = {
      account: accountId,
      account_key_public: accountPk,
      fc_public_key: fcPk,
      fc_key_file: path.relative(process.env.HOME, fcFile),
    };
    console.log(`${name}: fc_pk = ${fcPk}`);
  }

  // 6. supplier account: the allowlisted payment recipient.
  const supplierId = `${SUPPLIER}.${OWNER}`;
  if (!(await accountExists(near, supplierId))) {
    const kp = readKeyFile(supplierId)?.keyPair || KeyPair.fromRandom("ed25519");
    writeJson(path.join(CREDS, "testnet", `${supplierId}.json`), {
      account_id: supplierId,
      public_key: kp.getPublicKey().toString(),
      private_key: kp.secretKey,
    });
    const r = await ownerAccount.createAccount(
      supplierId,
      kp.getPublicKey().toString(),
      nearToYocto("0.1")
    );
    console.log(`supplier: created ${supplierId} (${r.transaction.hash})`);
  } else {
    console.log(`supplier: account exists`);
  }
  registry.supplier = supplierId;

  writeJson(REGISTRY, registry);
  console.log(`\nRegistry written to ${REGISTRY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
