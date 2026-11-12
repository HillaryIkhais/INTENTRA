const { KeyPair } = require('near-api-js');
const fs = require('fs');
const path = require('path');

async function main() {
  const wanted = process.argv[2];
  if (!wanted) throw new Error('usage: create-account.js <account.testnet>');
  const kp = KeyPair.fromRandom('ed25519');
  const body = { newAccountId: wanted, newAccountPublicKey: kp.getPublicKey().toString() };
  const res = await fetch('https://helper.testnet.near.org/account', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log('status', res.status, text.slice(0, 500));
  if (!res.ok) process.exit(1);
  const dir = path.join(__dirname, '..', '.credentials');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${wanted}.json`);
  fs.writeFileSync(file, JSON.stringify({ account_id: wanted, public_key: kp.getPublicKey().toString(), secret_key: kp.toString(), network: 'testnet' }, null, 2));
  console.log('saved', file);
}
main().catch(e => { console.error(e); process.exit(1); });
