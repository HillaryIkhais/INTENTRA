// Bootstraps the budget-conservation demo:
//   1. creates a fresh contract account (default intentra-hb26-v5-owner.testnet)
//   2. adds scoped function-call keys to the demo agents
//
// Secrets are written only to near/.credentials (git-ignored); the evidence file
// records public keys and permissions, never secret keys.
const fs = require('fs');
const path = require('path');
const { KeyPair } = require('near-api-js');
const { connectWith, yoctoNear, writeJson } = require('./lib');

const PARENT = process.env.BUDGET_PARENT || 'intentra-hb26-v4-owner.testnet';
const CONTRACT = process.env.INTENTRA_CONTRACT || 'intentra-hb26-v5-owner.testnet';
const AGENTS = [
  'intentra-hb26-a.testnet',
  'intentra-hb26-b.testnet',
  'intentra-hb26-c.testnet',
];
const SCOPED_METHODS = ['delegate', 'execute_transfer', 'revoke'];
const ALLOWANCE = yoctoNear('0.5');
const CRED_DIR = path.join(__dirname, '..', '.credentials');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeCred(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return value;
}

function txStatus(outcome) {
  if (!outcome || !outcome.status) return 'UNKNOWN';
  if (outcome.status.SuccessValue !== undefined) return 'SUCCESS';
  if (outcome.status.Failure !== undefined) return 'FAILURE';
  return JSON.stringify(outcome.status);
}

async function main() {
  fs.mkdirSync(CRED_DIR, { recursive: true });
  const { account: parent } = await connectWith(PARENT);

  const contractFile = path.join(CRED_DIR, `${CONTRACT}.json`);
  let contractCred;
  if (!fs.existsSync(contractFile)) {
    const keyPair = KeyPair.fromRandom('ed25519');
    const amount = yoctoNear(process.env.BUDGET_FUND || '6');
    console.log(`creating ${CONTRACT} from ${PARENT} with ${amount} yoctoNEAR`);
    const outcome = await parent.createAccount(CONTRACT, keyPair.getPublicKey(), amount);
    const status = txStatus(outcome);
    console.log('createAccount', outcome.transaction_outcome.id, status);
    if (status !== 'SUCCESS') throw new Error(`createAccount failed: ${JSON.stringify(outcome.status)}`);
    contractCred = writeCred(contractFile, {
      account_id: CONTRACT,
      public_key: keyPair.getPublicKey().toString(),
      secret_key: keyPair.toString(),
      network: 'testnet',
    });
  } else {
    contractCred = readJson(contractFile);
    console.log(`reusing existing contract account ${CONTRACT}`);
  }

  const { account: contractAccount } = await connectWith(CONTRACT);
  const contractState = await contractAccount.state();
  console.log(`contract balance=${contractState.amount} code=${contractState.code_hash}`);

  const scopedKeys = {};
  for (const agent of AGENTS) {
    const { account } = await connectWith(agent);
    const scopedFile = path.join(CRED_DIR, `${agent}.scoped.json`);
    let cred;
    if (fs.existsSync(scopedFile)) {
      const existing = readJson(scopedFile);
      if (existing.contract_id === CONTRACT) {
        cred = existing;
      }
    }
    if (!cred) {
      const keyPair = KeyPair.fromRandom('ed25519');
      cred = writeCred(scopedFile, {
        account_id: agent,
        public_key: keyPair.getPublicKey().toString(),
        secret_key: keyPair.toString(),
        contract_id: CONTRACT,
        method_names: SCOPED_METHODS,
        allowance: ALLOWANCE.toString(),
        network: 'testnet',
      });
    }

    const accessKeys = await account.getAccessKeys();
    const present = accessKeys.some((entry) => entry.public_key === cred.public_key);
    if (!present) {
      console.log(`adding scoped function-call key to ${agent}`);
      const outcome = await account.addKey(cred.public_key, CONTRACT, SCOPED_METHODS, ALLOWANCE);
      const status = txStatus(outcome);
      console.log('addKey', outcome.transaction_outcome.id, status);
      if (status !== 'SUCCESS') throw new Error(`addKey failed for ${agent}: ${JSON.stringify(outcome.status)}`);
    } else {
      console.log(`scoped key already present on ${agent}`);
    }

    scopedKeys[agent] = {
      public_key: cred.public_key,
      contract_id: CONTRACT,
      method_names: SCOPED_METHODS,
      allowance: ALLOWANCE.toString(),
    };
  }

  const report = {
    generated_at: new Date().toISOString(),
    network: 'testnet',
    parent: PARENT,
    contract_id: CONTRACT,
    contract_public_key: contractCred.public_key,
    scoped_keys: scopedKeys,
  };
  writeJson(path.join(__dirname, '..', 'evidence', 'budget-bootstrap.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
