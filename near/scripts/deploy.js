#!/usr/bin/env node
/**
 * Deploy the INTENTRA vault contract and initialize it with an owner.
 *
 * near-cli 4.x still defaults to rpc.testnet.near.org, which now returns 429.
 * This script uses NEAR_RPC_URL (default: fastnear) so deployment is
 * reproducible without editing near-cli configuration.
 *
 * Usage:
 *   NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
 *     INTENTRA_OWNER=intentra2.testnet node near/scripts/deploy.js
 */
const { connect, keyStores, transactions } = require("near-api-js");
const fs = require("fs");
const path = require("path");

const RPC = process.env.NEAR_RPC_URL || "https://rpc.testnet.fastnear.com";
const OWNER = process.env.INTENTRA_OWNER || "intentra2.testnet";
const WASM =
  process.env.INTENTRA_WASM ||
  path.join(
    __dirname,
    "..",
    "..",
    "contract",
    "target",
    "wasm32-unknown-unknown",
    "release",
    "intentra_vault.wasm"
  );

async function main() {
  if (!fs.existsSync(WASM)) {
    throw new Error(`WASM not found at ${WASM}. Build it first (see README).`);
  }
  const near = await connect({
    networkId: "testnet",
    nodeUrl: RPC,
    keyStore: new keyStores.UnencryptedFileSystemKeyStore(
      path.join(process.env.HOME, ".near-credentials")
    ),
  });
  const account = await near.account(OWNER);
  const state = await account.state();
  if (state.code_hash !== "11111111111111111111111111111111") {
    throw new Error(
      `${OWNER} already has contract code (${state.code_hash}). ` +
        `Use a fresh account so initialization is a single clean run.`
    );
  }

  const wasm = fs.readFileSync(WASM);
  const deploy = await account.signAndSendTransaction({
    receiverId: OWNER,
    actions: [transactions.deployContract(wasm)],
    returnError: true,
  });
  if (deploy.status.Failure) {
    throw new Error(`deploy failed: ${JSON.stringify(deploy.status.Failure)}`);
  }
  console.log(`deploy: ${deploy.transaction_outcome.id}`);

  const init = await account.signAndSendTransaction({
    receiverId: OWNER,
    actions: [
      transactions.functionCall(
        "new",
        { owner: OWNER },
        "100000000000000",
        "0"
      ),
    ],
    returnError: true,
  });
  if (init.status.Failure) {
    throw new Error(`init failed: ${JSON.stringify(init.status.Failure)}`);
  }
  console.log(`init:   ${init.transaction_outcome.id}`);

  const after = await near.connection.provider.query({
    request_type: "view_account",
    account_id: OWNER,
    finality: "final",
  });
  console.log(`code_hash: ${after.code_hash}`);
  console.log(`balance:   ${after.amount}`);
  console.log(`owner:     ${OWNER}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
