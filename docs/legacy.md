# INTENTRA — Legacy Material (Binance Agent OS)

This document contains legacy material from INTENTRA's earlier incarnation as
a Binance Agent OS middleware project. It is preserved for historical reference
only and is **not** part of the NEAR Hackathon submission.

The NEAR submission lives under `near/` and uses the `intentra-hb26-v9-owner.testnet`
vault contract on NEAR Testnet. The legacy Binance material below describes a
different execution substrate (Binance Agent OS) and is not evidence for the
current NEAR submission.

---

## What INTENTRA Is (Legacy)

INTENTRA is an authority provenance layer.
It sits between AI agents and execution substrates (like Binance Agent OS).

It answers one question:
**Can this agent exercise this authority, given its ancestry?**

---

## What INTENTRA Is Not (Legacy)

INTENTRA is not:
- A trading bot
- A risk management system
- A permission manager
- An authentication system
- A key management system

---

## Boundary Diagram (Legacy)

```
┌─────────────────────────────────────────────────────┐
│                    INTENTRA                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │         Authority Enforcement                │   │
│  │                                              │   │
│  │  • Capability compilation                    │   │
│  │  • Subset validation                         │   │
│  │  • Delegation lineage tracking               │   │
│  │  • Revocation cascade                        │   │
│  │  • Replay detection                          │   │
│  │  • Execution receipts                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  WHAT IT CHECKS:                                    │
│    • Is this capability valid?                      │
│    • Is this proposal within the capability?        │
│    • Is this capability revoked?                    │
│    • Has this proposal already been executed?       │
│    • Does this delegation satisfy Cᵢ ⊆ Cᵢ₋₁?      │
│                                                     │
│  WHAT IT DOES NOT CHECK:                            │
│    • Is the human legitimate?                       │
│    • Is the exchange compromised?                   │
│    • Is the private key stolen?                     │
│    • Is the market manipulation?                    │
└─────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
    ┌─────────┐                  ┌──────────────┐
    │  AGENT  │                  │   BINANCE    │
    │  (LLM)  │                  │  AGENT OS    │
    └─────────┘                  └──────────────┘
         │                              │
         │   INTENTRA sits between      │
         │   agent and exchange.        │
         │   Unauthorized proposals     │
         │   never reach Binance.       │
```

---

## Trust Model (Legacy)

### Trust Anchors

1. **The human** who issues the root capability.
   INTENTRA assumes the human is legitimate.
   If the human is compromised, INTENTRA cannot help.

2. **The execution substrate** (Binance Agent OS).
   INTENTRA assumes Binance executes authorized transactions correctly.
   If Binance is compromised, INTENTRA's guarantees do not extend.

3. **The capability compiler** itself.
   INTENTRA assumes its own enforcement logic is correct.
   This is validated through adversarial testing and fuzzing.

---

## Known Boundaries (Legacy)

### Concurrent Delegation

Each child is validated individually against its parent.
Multiple children can collectively exhaust the parent's budget.

```
Parent: $10 total
Child A: $8 total  ✓ (≤ parent)
Child B: $8 total  ✓ (≤ parent)
Combined: $16 total  ✗ (exceeds parent)
```

Each delegation is valid. The aggregate is not enforced.
This requires session-layer budget tracking.

### Circular Delegation

A → B → C → A is technically valid if each step narrows.
The cycle itself is suspicious but does not violate the invariant.
This is a policy decision, not an enforcement gap.

### Split Evasion

Splitting a $50 order into 5×$10 to stay under per-order limits:
- First order: ALLOW (within per-order limit)
- Subsequent orders: BLOCK (exceeds total/daily limits)

The per-delegation check passes. The aggregate limits catch it.

---

## Enforcement Depth (Legacy)

INTENTRA enforces at three levels:

1. **Delegation time:** When an agent delegates to a child,
   the child's capability is validated against the parent.

2. **Proposal time:** When an agent proposes a transaction,
   the proposal is validated against the agent's capability.

3. **Execution time:** Before executing on Binance,
   the receipt is created and replay is checked.

```
Delegation → Proposal → Execution
    ↓           ↓           ↓
  subset     within      no replay
  check      limits      detected
```

---

## Adversarial Test Results (Legacy)

14 structural attacks tested against the delegation invariant.

| # | Attack | Severity | Expected | Result |
|---|--------|----------|----------|--------|
| 1 | Deep Nesting | CRITICAL | BLOCK | ✓ BLOCKED |
| 2 | Circular Delegation | LOW | BOUNDARY | ✗ BOUNDARY |
| 3 | Split Evasion | HIGH | BOUNDARY | ✗ BOUNDARY |
| 4 | Boundary Precision | MEDIUM | BLOCK | ✓ BLOCKED |
| 5 | Gradual Scope Creep | HIGH | BLOCK | ✓ BLOCKED |
| 6 | Null Injection | CRITICAL | BLOCK | ✓ BLOCKED |
| 7 | Revival After Revoke | CRITICAL | BLOCK | ✓ BLOCKED |
| 8 | Concurrent Delegation | LOW | BOUNDARY | ✗ BOUNDARY |
| 9 | Constraint Pollution | MEDIUM | BLOCK | ✓ BLOCKED |
| 10 | Ancestor Spoofing | CRITICAL | BLOCK | ✓ BLOCKED |
| 11 | Limit Omission | CRITICAL | BLOCK | ✓ BLOCKED |
| 12 | Approval Threshold Escalation | CRITICAL | BLOCK | ✓ BLOCKED |
| 13 | Expiry Extension | HIGH | BLOCK | ✓ BLOCKED |
| 14 | Prohibition Removal | HIGH | BLOCK | ✓ BLOCKED |

### Summary

```
Total attacks:     14
Blocked:           11
Boundary:           3
CRITICAL blocked:   6/6
```

---

## Property-Based Fuzzing (Legacy)

10,000 randomized delegation chains tested with 8 adversarial strategies.

### Configuration

```
Chains:        10,000
Strategies:    8 (random, asset_inject, action_inject, limit_inflate,
                   wildcard, boundary, deep_narrow, omit_limit)
Max depth:     5
```

### Results

```
Total delegations:  ~25,000
Violations:         0
Duration:           ~80ms
```

Authority cannot widen. Never.
