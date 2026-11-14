# INTENTRA
### Your agents can delegate the work. They can't duplicate the authority.

Financial control for autonomous agent teams. Keep every delegation inside the budget and permissions your owner actually granted.

**Built at NEAR HACKATHON — Build what's next** · AI Security & Defense Track

---

## THE PROBLEM

Giving an autonomous agent a spending limit is not enough when that agent can create other agents and delegate authority to them.

```
Owner grants Agent A 1.00 NEAR
     ↓
Agent A delegates 0.40 NEAR to Agent B      → A has 0.60 NEAR left to spend
     ↓
Agent B delegates 0.15 NEAR to Agent C      → B has 0.25 NEAR left to spend
     ↓
Agent A tries to spend 0.61 NEAR against 0.60 headroom
```

The delegation to C comes out of **B's** 0.40 NEAR, not out of A's remaining 0.60 NEAR. Each node reserves only against its own `max_total`. That is why the correct headroom at A is `1.00 − 0.40 = 0.60`, and a 0.61 NEAR spend must fail by exactly 0.01.

## THE PRODUCT

**INTENTRA enforces that financial authority can only narrow, never widen, across an agent delegation tree.**

When a parent delegates budget to a child, that budget is **reserved** from the parent's headroom:

```
┌──────────────────────┐   ┌──────────────────────┐
│ AGENT A              │──▶│ HEADROOM: 0.60       │
│                      │   │ (1.00 − 0.40)        │
├──────────────────────┤   └──────────────────────┘
│ 0.40 → Agent B       │      (B then reserves 0.15 for C
└──────────────────────┘       out of its own 0.40)
```

**Core guarantee:** *An agent cannot spend authority it has already reserved for its children.*

## THE CRITICAL MOMENT

**5. ATTACK BLOCKED:** Agent A attempts to spend 0.61 NEAR

```
Contract check: max_total − total_spent − allocated_children
               = 1.00 − 0.00 − 0.40
               = 0.60 NEAR available

0.61 NEAR > 0.60 NEAR → BUDGET_RESERVATION
```

Then the same defect one level down: Agent B has 0.40, has reserved 0.15 for C, and
attempts 0.26 against its remaining 0.25. Also refused.

This is the security property ordinary per-agent spending limits do not enforce.

> A spending firewall asks "Can this agent spend 0.4 NEAR?"
> 
> INTENTRA asks **"Has this agent already committed that authority to other children?"**

## LEGITIMATE WORK CONTINUES

**6-8. Children execute within their inherited authority:**

- Agent A spends 0.60 NEAR → **ALLOWED** (exactly its 0.60 headroom)
- Agent B spends 0.25 NEAR → **ALLOWED** (0.40 − 0.15 reserved for C)
- Agent C spends 0.15 NEAR → **ALLOWED** (its full 0.15)

**9. Owner revokes root:**

- Agent A's capability marked revoked
- Agent B and Agent C immediately answer `REVOKED: capability 1 has been revoked`

**Total: 1.00 NEAR exactly spent (0.60 + 0.25 + 0.15), and the recipient's balance moves by exactly 1.00 NEAR.**

---

## SEE IT WORK

### Live Testnet Verification

**Contract:** `intentra-hb26-v9-owner.testnet`  
**Owner:** `intentra-hb26-v4-owner.testnet`  
**Network:** NEAR Testnet  
**RPC:** `https://rpc.testnet.fastnear.com`  
**Code Hash:** `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`

[View on NEAR Explorer](https://explorer.near.org/contracts/intentra-hb26-v9-owner.testnet?network=testnet)

### Transaction Evidence

| Step | Action | Amount | Result | TX Hash |
|------|--------|--------|--------|---------|
| 1 | Owner grants Agent A 1.00 NEAR root | 1.00 NEAR | ✓ GRANTED | `4MLten9HLpVPRojiX6maMgzije5GrbbFYFRBEddMDb8k` |
| 2 | Agent A delegates 0.40 NEAR to Agent B | 0.40 NEAR | ✓ RESERVED | `E7cd3MM4eaXaupD5Jq943Dz15niNGEvyYMjy23tMjNxN` |
| 3 | Agent B delegates 0.15 NEAR to Agent C | 0.15 NEAR | ✓ RESERVED | `EEepdGRQBaR5WtfBckoHh87cz2Fedo1cPg5WLYAAzAdP` |
| 4 | Agent A attempts 0.61 NEAR spend | 0.61 NEAR | ✗ BUDGET_RESERVATION | `8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf` |
| 5 | Agent B attempts 0.26 NEAR spend | 0.26 NEAR | ✗ BUDGET_RESERVATION | `8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X` |
| 6 | Agent A spends 0.60 NEAR | 0.60 NEAR | ✓ ALLOWED | `4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi` |
| 7 | Agent B spends 0.25 NEAR | 0.25 NEAR | ✓ ALLOWED | `GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse` |
| 8 | Agent C spends 0.15 NEAR | 0.15 NEAR | ✓ ALLOWED | `AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED` |
| 9 | Owner revokes Agent A root | — | ✓ REVOKED | `GKN4gw9HjYwtozvRjtcS2714eYKSEZYgb3DpSoC3vRYZ` |
| 10 | Agent B post-revoke attempt | 0.05 NEAR | ✗ `REVOKED` | `69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS` |
| 11 | Agent C post-revoke attempt | 0.05 NEAR | ✗ `REVOKED` | `Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r` |

### Verify Yourself

```bash
# Clone and run independent verification
git clone https://github.com/HillaryIkhais/INTENTRA
cd INTENTRA
git checkout near/enforcement

# Run the live demo script
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  INTENTRA_VAULT=intentra-hb26-v9-owner.testnet \
  node near/scripts/run-budget-demo.js

# Run independent RPC verification (25 assertions)
node near/scripts/verify-budget-demo.js
```

---

## HOW IT WORKS

### The Contract Enforces Three Rules

**1. Budget Reservation:** When a parent delegates, the amount is reserved before the child capability is stored:

```rust
allocated_children := allocated_children + child_amount
```

**2. Headroom Check:** Every `execute()` checks available funds after reservations:

```rust
headroom = max_total - total_spent - allocated_children
```

**3. Revocation Cascade:** Revoking an ancestor invalidates all descendants:

```rust
// On revoke, mark capability and all descendants revoked
revoked: true for cap AND cap.children
```

### Architecture Diagram

```
OWNER ──issue_root(1.00 NEAR)──▶ Agent A
                                 │
                                 ├─delegate(0.40 NEAR)──▶ Agent B  [RESERVED]
                                 │                           │
                                 │                           ├─delegate(0.15)──▶ Agent C [RESERVED]
                                 │                           │                   total_spent: 0.15
                                 │                           └─total_spent: 0.25
                                 │
                                 ├─✗ execute(0.61 NEAR)──▶ Vendor  → BUDGET_RESERVATION
                                 │   only 0.60 NEAR headroom; 0.40 NEAR reserved
                                 │
                                 ├─✗ execute(0.26 NEAR)──▶ Vendor  → BUDGET_RESERVATION
                                 │   (Agent B: only 0.25 NEAR headroom; 0.15 NEAR reserved)
                                 │
                                 ├─✓ execute(0.60 NEAR)──▶ Vendor  [ALLOWED]
                                 ├─✓ execute(0.25 NEAR)──▶ Vendor  [ALLOWED]
                                 ├─✓ execute(0.15 NEAR)──▶ Vendor  [ALLOWED]
                                 │
                                 └─ revoke(A) ─────────────▶ B, C → REVOKED
```

---
  
## SECURITY MODEL

### What INTENTRA Guarantees

| Invariant | Definition |
|-----------|------------|
| **I1 Subset** | Every child's constraints ⊆ parent's (intersection) |
| **I2 Reservation** | `total_spent + allocated_children ≤ max_total` at every node |
| **I3 Identity** | Authority from (signing account, signing key) pair |
| **I4 Liveness** | Revoked ancestor ⇒ all descendants answer REVOKED_CHAIN |
| **I5 No Deposit** | Agent entrypoints reject attached deposits |
| **I6 Owner Gate** | `issue_root`/`revoke` require `predecessor == owner` |

### Verified Results

| Check | Result |
|-------|--------|
| Local tests | 24/24 passing (adversarial suite) |
| Independent RPC assertions | 25/25 PASS |
| Evidence checks | 17 recorded transactions, all matching |
| Live transaction hashes | 11 recorded, verifiable on NEAR Explorer |
| Code hash matches build | ✓ Verified |

### Known Limitations

**Single Root Constraint:** Currently, `issue_root()` accepts any positive budget amount that fits within the vault's available balance at execution time. The demonstration uses a single root capability to avoid multi-root overcommitment scenarios. Future work should add global vault-level budget reservation to prevent multiple roots from collectively exceeding available funds.

**Evidence State:** The current evidence reflects a post-revocation state where the original root is fully revoked. To verify the reservation mechanism, judges should examine transaction hashes showing the `BUDGET_RESERVATION` errors (TX: `8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf` and `8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X`).

---

## WHY NEAR

**NEAR function-call keys** make INTENTRA's security boundary protocol-enforced:

- Each agent holds a **scoped function-call key** restricted to `["execute", "delegate"]` on the vault
- Keys are **non-transferable** — copied keys are `ACCOUNT_MISMATCH`, not authority
- The vault is the **single source of truth** — all state and enforcement on-chain
- **Revocation is state-based** — keys remain for clear error messages, not ambiguous failures

---

## COMPATIBILITY

### TypeScript SDK

```typescript
import { Intentra, yocto } from "./sdk/intentra"

const vault = new Intentra(near, "intentra-hb26-v9-owner.testnet")

// Issue root capability
await vault.with(owner).issueRoot({
  agent_account: "agent-a.testnet",
  agent_pk: "ed25519:...",
  max_total: yocto(1),
  max_per_order: yocto(1),
  recipients: ["vendor.testnet"],
  can_transfer: true,
  can_delegate: true,
})

// Delegate to child
await vault.with(agentA).delegate({
  child_account: "agent-b.testnet",
  child_pk: "ed25519:...",
  max_total: yocto(0.4),
})

// Delegate to grandchild
await vault.with(agentB).delegate({
  child_account: "agent-c.testnet",
  child_pk: "ed25519:...",
  max_total: yocto(0.15),
})

// Execute transfer
await vault.with(agentA).execute("vendor.testnet", yocto(0.60)) // ✓
await vault.with(agentB).execute("vendor.testnet", yocto(0.25)) // ✓
await vault.with(agentC).execute("vendor.testnet", yocto(0.15)) // ✓
await vault.with(agentA).execute("vendor.testnet", yocto(0.61)) // ✗ BUDGET_RESERVED
```

---

## NEAR AI Security & Defense Track Positioning

**The sponsor asks:** "Give AI money without giving it the keys to everything."

**INTENTRA answers:** By making sure agents **cannot give their keys to other agents** through recursive authority enforcement.

### The Gap INTENTRA Owns

| Project | What they protect against |
|---------|---------------------------|
| SpactVault | Payment safety, spending limits |
| Agent Allowance Guard | Spending limits, recipient allowlists |
| Bylaw | Multi-agent settlement, approval gates |
| **INTENTRA** | **Authority duplication across delegation hierarchies** |

When you give an agent 1.00 NEAR, INTENTRA ensures the **entire delegation tree** can never access more than 1.00 NEAR—even if that agent tries to create sub-agents and promise them all the same money. A spending firewall asks "Can this agent spend 0.4 NEAR?" INTENTRA asks "Has this agent already committed that authority to other children?"

---

## TECHNICAL REFERENCES

- **Contract source:** `contract/src/lib.rs`  
- **TypeScript SDK:** `sdk/intentra.ts`  
- **Live demo script:** `near/scripts/run-budget-demo.js`  
- **Independent verifier:** `near/scripts/verify-budget-demo.js`  
- **Evidence file:** `near/evidence/budget-demo.json`  
- **Verification report:** `near/evidence/budget-verification.json` (25/25 RPC checks passed)
- **Deployment record:** `near/evidence/budget-deployment.json`  
- **Adversarial tests:** `contract/test-evidence/adversarial-run.txt`  
- **NEAR submission details:** `near/README.md`

---

## Prior Work Disclosure

**Tags:** `pre-hackathon` `hackathon-submission`

**README diff:** https://github.com/HillaryIkhais/INTENTRA/compare/near/enforcement~1..near/enforcement

The adversarial test suite (`contract/test-evidence/adversarial-run.txt`, 24 tests) and the
formal capability model (`formal/IntentraCapability.tla`, 5 specified invariants) pre-date
the hackathon submission. The NEAR testnet deployment, recorded scenario, and independent
RPC verification were completed during the hackathon window (November 12–14, 2026).

---

## LICENSE

MIT