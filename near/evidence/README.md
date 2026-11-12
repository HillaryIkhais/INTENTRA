# Evidence index

All files are generated from real NEAR testnet activity on 2026-11-12.
They contain account ids, transaction hashes, contract state and check results.
They do not contain private keys.

| File | Contents |
|---|---|
| `deployment.json` | contract id, code hash, WASM SHA-256, deploy/init/deposit tx hashes |
| `testnet-scenario.json` | full 1 NEAR → 0.4 → attack → 0.15 → 0.1 transfer → revoke scenario, raw step outcomes, state snapshot |
| `verification-report.json` | 23 independent JSON-RPC checks with pass/fail and evidence |
| `sdk-check.json` | 9 live SDK checks on a separate contract (`intentra-hb26-sdk-owner.testnet`) |
| `deployment-sdk.json` | deployment record for the SDK check contract |

## Verify locally

```bash
cd near
npm run verify
```

The verifier (`scripts/verify.js`) talks only to
`https://rpc.testnet.fastnear.com` (override with `NEAR_RPC`) and uses the
`query` and `tx` JSON-RPC methods. It does not import the SDK and does not trust
the runner's return values.

## Important distinction

- `cargo test` evidence is **unit-testing evidence** (near-sdk mocked env).
- `testnet-scenario.json` and `verification-report.json` are **live testnet
  evidence**.
- `sdk-check.json` is **live testnet evidence from the SDK path**, on a separate
  contract so the main scenario remains pristine.
- No formal verification is claimed.
