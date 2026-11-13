const fs = require('fs');
const path = require('path');
const { connectWith, call, view, CONTRACT_ID, yoctoNear, writeJson } = require('./lib');

const WASM = path.join(
  __dirname,
  '..',
  'target',
  'wasm32-unknown-unknown',
  'release',
  'intentra_near.wasm'
);

async function main() {
  const { account } = await connectWith(CONTRACT_ID);
  // Optionally initialize/fund from a separate admin account. This keeps the
  // vault contract's balance untouched by the admin's prepaid transaction gas.
  const initSignerId = process.env.INIT_SIGNER || CONTRACT_ID;
  const { account: initSigner } = await connectWith(initSignerId);
  const wasm = fs.readFileSync(WASM);
  console.log(`Deploying ${wasm.length} bytes to ${CONTRACT_ID} (init signer ${initSignerId})`);

  const deploy = await account.deployContract(wasm);
  const deployTx = deploy.transaction_outcome && deploy.transaction_outcome.id;
  console.log('deploy', deployTx, deploy.status);

  const init = await call(initSigner, CONTRACT_ID, 'new', {});
  console.log('init', init.txHash, init.status, init.failure || '');
  if (init.status !== 'SUCCESS') throw new Error(`init failed: ${init.failure}`);

  const fundAmount = yoctoNear(process.env.DEPLOY_FUND || '2');
  let funding = { txHash: null, status: 'SKIPPED' };
  if (fundAmount > 0n) {
    funding = await call(initSigner, CONTRACT_ID, 'deposit', {}, {
      deposit: fundAmount,
      gas: 30_000_000_000_000n,
    });
    console.log('deposit', funding.txHash, funding.status, funding.failure || '');
    if (funding.status !== 'SUCCESS') throw new Error(`deposit failed: ${funding.failure}`);
  } else {
    console.log('deposit skipped (DEPLOY_FUND=0); using the account balance from the faucet');
  }

  const stats = await view(account, CONTRACT_ID, 'get_stats', {});
  const accountState = await account.connection.provider.query({
    request_type: 'view_account',
    finality: 'final',
    account_id: CONTRACT_ID,
  });
  const report = {
    code_hash: accountState.code_hash,
    network: 'testnet',
    contract_id: CONTRACT_ID,
    wasm_bytes: wasm.length,
    wasm_sha256: require('crypto').createHash('sha256').update(wasm).digest('hex'),
    deploy_tx: deployTx,
    init_tx: init.txHash,
    deposit_tx: funding.txHash,
    stats,
    deployed_at: new Date().toISOString(),
  };
  writeJson(path.join(__dirname, '..', 'evidence', process.env.DEPLOY_EVIDENCE || 'deployment.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
