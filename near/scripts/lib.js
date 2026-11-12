const fs = require('fs');
const path = require('path');
const { connect, keyStores, KeyPair, transactions, utils } = require('near-api-js');

const NETWORK = 'testnet';
const NODE_URL = 'https://rpc.testnet.fastnear.com';
const CRED_DIR = path.join(__dirname, '..', '.credentials');
const CONTRACT_ID = process.env.INTENTRA_CONTRACT || 'intentra-hb26-v4-owner.testnet';

function credentials(accountId) {
  const file = path.join(CRED_DIR, `${accountId}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`missing credentials for ${accountId}; run scripts/bootstrap-testnet.sh`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function connectWith(accountId) {
  const cred = credentials(accountId);
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK, accountId, KeyPair.fromString(cred.secret_key));
  const near = await connect({ networkId: NETWORK, nodeUrl: NODE_URL, keyStore });
  const account = await near.account(accountId);
  return { account, cred };
}

function yoctoNear(value) {
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`invalid NEAR amount: ${text}`);
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > 24) throw new Error(`too many decimal places: ${text}`);
  const padded = (fraction + '0'.repeat(24)).slice(0, 24);
  return BigInt(whole) * 10n ** 24n + BigInt(padded);
}

function statusOf(outcome) {
  if (!outcome || !outcome.status) return 'UNKNOWN';
  if (outcome.status.SuccessValue !== undefined) return 'SUCCESS';
  if (outcome.status.Failure !== undefined) return 'FAILURE';
  return JSON.stringify(outcome.status);
}

function failureText(outcome) {
  const failure = outcome && outcome.status && outcome.status.Failure;
  if (!failure) return undefined;
  try {
    const action = failure.ActionError;
    if (action && action.kind) {
      if (action.kind.ExecutionError !== undefined) return String(action.kind.ExecutionError);
      return JSON.stringify(action.kind);
    }
  } catch (_) {}
  return JSON.stringify(failure);
}

function logsOf(outcome) {
  const logs = [];
  for (const receipt of (outcome && outcome.receipts_outcome) || []) {
    for (const line of (receipt.outcome && receipt.outcome.logs) || []) logs.push(line);
  }
  return logs;
}

function eventsOf(outcome) {
  return logsOf(outcome)
    .filter((line) => line.startsWith('EVENT_JSON:'))
    .map((line) => {
      try {
        return JSON.parse(line.slice('EVENT_JSON:'.length));
      } catch (_) {
        return { raw: line };
      }
    });
}

async function call(account, contractId, methodName, args, options = {}) {
  // near-api-js caches access-key nonces; refresh before every transaction so
  // sequential calls in one script do not collide.
  account.accessKeyByPublicKeyCache = {};
  const gas = options.gas || 150_000_000_000_000n;
  const deposit = options.deposit || 0n;
  const [hashBytes, signed] = await account.signTransaction(contractId, [
    transactions.functionCall(methodName, args, gas, deposit),
  ]);
  const txHash = utils.serialize.base_encode(hashBytes);
  let outcome;
  let thrown;
  try {
    outcome = await account.connection.provider.sendTransaction(signed);
  } catch (error) {
    thrown = error;
  }
  const result = outcome || (thrown && (thrown.transaction_outcome ? thrown : undefined));
  const finalStatus = outcome ? statusOf(outcome) : 'RPC_ERROR';
  return {
    method: methodName,
    signer: account.accountId,
    args,
    txHash:
      txHash ||
      (outcome && outcome.transaction_outcome && outcome.transaction_outcome.id) ||
      (thrown && thrown.transaction_outcome && thrown.transaction_outcome.id),
    status: finalStatus,
    failure: outcome ? failureText(outcome) : thrown && (thrown.message || String(thrown)),
    logs: outcome ? logsOf(outcome) : thrown && thrown.data ? JSON.stringify(thrown.data) : [],
    events: outcome ? eventsOf(outcome) : [],
  };
}

async function view(account, contractId, methodName, args = {}) {
  return account.viewFunction({ contractId, methodName, args });
}

async function accountBalance(account) {
  const state = await account.state();
  return state.amount;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

module.exports = {
  NETWORK,
  NODE_URL,
  CONTRACT_ID,
  connectWith,
  credentials,
  yoctoNear,
  call,
  view,
  accountBalance,
  statusOf,
  failureText,
  logsOf,
  eventsOf,
  writeJson,
};
