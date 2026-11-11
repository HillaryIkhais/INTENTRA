#!/usr/bin/env node
/**
 * INTENTRA testnet agent setup.
 *
 * Generates a keypair per agent, saves credentials locally, and prints the
 * public keys for on-chain registration. Must run BEFORE the FC keys are
 * added on-chain (adding an FC key requires the account's full-access key).
 */
const { KeyPair } = require("near-api-js");
const path = require("path");
const fs = require("fs");

const CREDS_DIR = path.join(process.env.HOME, ".near-credentials", "testnet");
const AGENTS = ["agent-a", "agent-b", "agent-c", "vendor"];
const out = {};

for (const name of AGENTS) {
  const kp = KeyPair.fromRandom("ed25519");
  out[name] = {
    publicKey: kp.getPublicKey().toString(),
    privateKey: kp.secretKey,
  };
}

fs.writeFileSync("/tmp/intentra-agent-keys.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.log("\nSaved to /tmp/intentra-agent-keys.json");
