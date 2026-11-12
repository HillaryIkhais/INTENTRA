# INTENTRA
### Your agents can delegate the work. They can't duplicate the authority.

Financial control for autonomous agent teams. Keep every delegation inside the budget and permissions your owner actually granted.

---

## THE PROBLEM

Giving an autonomous agent a spending limit is not enough when that agent can create other agents and delegate authority to them.

```
Owner grants Agent A 1.00 NEAR
     ↓
Agent A delegates 0.45 NEAR to Agent B
     ↓
Agent A delegates 0.30 NEAR to Agent C
     ↓
0.75 NEAR is already committed to children
     ↓
Agent A tries to spend 0.30 NEAR... should fail, but ordinary systems let it!
```

The owner's financial boundary is breached because authority was counted twice—once for the delegation, once for the spend.

## THE PRODUCT

**INTENTRA enforces that financial authority can only narrow, never widen, across an agent delegation tree.**

When a parent delegates budget to a child, that budget is **reserved** from the parent's headroom:

```
┌─────────────────────┐
│ OWNER (1.00 NEAR)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐  ┌─────────────────────┐
│ COORDINATOR A       │─▶│ HEADROOM: 0.25    │
│                     │  │ (1.00 - 0.75)     │
├─────────────────────┤  └───────────────────┘
│ 0.45 → Researcher B │
│ 0.30 → Verifier C   │
└─────────────────────┘
```

**Core guarantee:** *An agent cannot spend authority it has already promised to its children.*

## THE CRITICAL MOMENT

**5. ATTACK BLOCKED:** Coordinator A attempts to spend 0.30 NEAR

```
Contract check: max_total - total_spent - allocated_children
               = 1.00 - 0 - 0.75
               = 0.25 NEAR available

0.30 NEAR > 0.25 NEAR → BUDGET_EXCEEDED
```

This is the security property ordinary per-agent spending limits do not enforce.

> A spending firewall asks "Can this agent spend 0.4 NEAR?"
> 
> INTENTRA asks **"Has this agent already committed that authority to other agents?"**

## LEGITIMATE WORK CONTINUES

**6-7. Children execute within their inherited authority:**

- Researcher B spends 0.20 NEAR → **ALLOWED**
- Verifier C spends 0.15 NEAR → **ALLOWED**

**8. Owner revokes root:**

- Coordinator A's capability marked revoked
- Researcher B and Verifier C immediately answer `REVOKED_CHAIN`

**Total: 1.00 NEAR exactly spent (0.75 committed + 0.25 legitimately executed)**

---

## SEE IT WORK

### Live Testnet Verification

**Contract:** `budget-vault.intentra.testnet`  
**Network:** NEAR Testnet  
**RPC:** `https://rpc.testnet.fastnear.com`  
**Code Hash:** `3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN`

[View on NEAR Explorer](https://explorer.near.org/contracts/budget-vault.intentra.testnet?network=testnet)

### Transaction Evidence

| Step | Action | Amount | Result | TX Hash |
|------|--------|--------|--------|---------|
| 1 | Owner grants Coordinator A 1.00 NEAR | 1.00 NEAR | ✓ GRANTED | `59YeeLSUypL69gG9aXmxMZzLDs8NBTv9Ru76V6rgUJ5T` |
| 2 | A delegates to Researcher B | 0.45 NEAR | ✓ RESERVED | `sq7nzu2FJZgGE7vtQRSyisjdDnp6qk551PDssX63mjP` |
| 3 | A delegates to Verifier C | 0.30 NEAR | ✓ RESERVED | `DZrvGhRB3HxxePjsVCn5H2U1hJYkobdSr1AP2uCLtGae` |
| 4 | A attempts 0.30 NEAR spend | 0.30 NEAR | ✗ BUDGET_EXCEEDED | `F7g7qCNTKsihuiQsHPYxYdy2zrGAycLVkvJE7kGp55zT` |
| 5 | B spends 0.20 NEAR | 0.20 NEAR | ✓ ALLOWED | `CsWjLmRxKTz3MXC5dFvE8C2qw1EUcRvHZuPMJJ8U7wZr` |
| 6 | C spends 0.15 NEAR | 0.15 NEAR | ✓ ALLOWED | `9EJSgGc8wkgxvBYSyaFa3eHRhUWifPGHadt7DKHK9swK` |
| 7 | Owner revokes A | — | ✓ CASCADE | `3WXF4jZNvFZWtD16R39pHyVwTW9EVLiASstBbVUvMQTz` |
| 8 | B post-revoke attempt | 0.05 NEAR | ✗ REVOKED_CHAIN | `AtXsWfBz1552NzAgC8YwxbiB3UmjuT8Mijs6MTGBqtkE` |
| 9 | C post-revoke attempt | 0.05 NEAR | ✗ REVOKED_CHAIN | `E4r5Bdu2Q5MZKBd9u8fuZqKrJj7NQPiYAWbGNE5BcJyD` |

### Verify Yourself

```bash
# Clone and run independent verification
git clone https://github.com/HillaryIkhais/INTENTRA
cd INTENTRA
git checkout near/enforcement

# Run the live demo script
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  INTENTRA_VAULT=budget-vault.intentra.testnet \
  node near/scripts/run-budget-demo.js

# Run independent RPC verification (19/19 checks)
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
OWNER ──issue_root(1.00 NEAR)──▶ Coordinator A
                                │
                                ├─delegate(0.45 NEAR)──▶ Researcher B  [RESERVED]
                                │                           total_spent: 0.20
                                │
                                ├─delegate(0.30 NEAR)──▶ Verifier C    [RESERVED]
                                │                           total_spent: 0.15
                                │
                                ├─✗ execute(0.30 NEAR)──▶ Vendor  → BUDGET_EXCEEDED
                                │   only 0.25 NEAR headroom; 0.75 NEAR committed
                                │
                                └─ revoke(A) ─────────────▶ B, C → REVOKED_CHAIN
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
| Local tests | 27/27 passing (15 sandbox + 12 security) |
| Independent RPC checks | 19/19 PASS |
| Live transaction hashes | 9 recorded, verifiable on NEAR Explorer |
| Code hash matches build | ✓ Verified |

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

const vault = new Intentra(near, "budget-vault.intentra.testnet")

// Issue root capability
await vault.with(owner).issueRoot({
  agent_account: "coordinator.testnet",
  agent_pk: "ed25519:...",
  max_total: yocto(1),
  max_per_order: yocto(0.5),
  recipients: ["vendor.testnet"],
  can_transfer: true,
  can_delegate: true,
})

// Delegate to child
await vault.with(coordinator).delegate({
  child_account: "researcher.testnet",
  child_pk: "ed25519:...",
  max_total: yocto(0.45),
})

// Execute transfer
await vault.with(researcher).execute("vendor.testnet", yocto(0.20)) // ✓
await vault.with(coordinator).execute("vendor.testnet", yocto(0.30)) // ✗ BUDGET_EXCEEDED
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

When you give an agent 1.00 NEAR, INTENTRA ensures the **entire delegation tree** can never access more than 1.00 NEAR—even if that agent tries to create 10 sub-agents and promise them all the same money.

---

## TECHNICAL REFERENCES

- **Contract source:** `contract/src/lib.rs`  
- **TypeScript SDK:** `sdk/intentra.ts`  
- **Live demo script:** `near/scripts/run-budget-demo.js`  
- **Independent verifier:** `near/scripts/verify-budget-demo.js`  
- **Evidence file:** `near/live-demo/budget-evidence.json`  
- **Adversarial tests:** `contract/test-evidence/adversarial-run.txt`

---

## LICENSE

MIT