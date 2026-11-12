# @intentra/near

TypeScript SDK for the INTENTRA NEAR contract. It has no mock mode: every write
method maps to a real contract method, and read methods query the deployed
contract.

```ts
import { IntentraNearClient, IntentraSession } from "@intentra/near";

const client = await IntentraNearClient.connect({
  contractId: "intentra-hb26-v4-owner.testnet",
  accountId: "intentra-hb26-a.testnet",
  secretKey: process.env.AGENT_A_KEY!,
});

const session = await IntentraSession.open(client, capabilityId);
const capability = await session.capability();
const lineage = await session.lineage();
const result = await session.execute({
  amount: "0.1",
  recipient: "intentra-hb26-recipient.testnet",
});
```

## Error codes

| Code | Contract prefix |
|---|---|
| `UNAUTHORIZED_SIGNER` | `UNAUTHORIZED` |
| `AUTHORITY_ESCALATION` | `ATTENUATION` |
| `BUDGET_RESERVATION` | `BUDGET_RESERVATION` |
| `INSUFFICIENT_BUDGET` | `LIMIT` |
| `EXPIRED` | `EXPIRED` |
| `REVOKED_LINEAGE` | `REVOKED` |
| `POLICY_VIOLATION` | `POLICY` |
| `REPLAY` | `REPLAY` |
| `INVALID_REQUEST` | `INVALID` |
| `NOT_FOUND` | `UNKNOWN` |

Read-only inspection: omit `secretKey` when connecting. Write methods then throw
an `IntentraError` with code `UNAUTHORIZED_SIGNER` without sending anything.

Build: `npm run build` from `near/`.
