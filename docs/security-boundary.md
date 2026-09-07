# INTENTRA — Security Boundary

## What INTENTRA Is

INTENTRA is an authority provenance layer.
It sits between AI agents and execution substrates (like Binance Agent OS).

It answers one question:
**Can this agent exercise this authority, given its ancestry?**

## What INTENTRA Is Not

INTENTRA is not:
- A trading bot
- A risk management system
- A permission manager
- An authentication system
- A key management system

## Boundary Diagram

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

## Trust Model

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

### Threat Surfaces

| Surface | In Scope | Out of Scope |
|---|---|---|
| Agent model compromise | ✓ | |
| Prompt injection | ✓ | |
| Malicious delegation | ✓ | |
| Scope escalation | ✓ | |
| Replay attacks | ✓ | |
| Compromised human | | ✓ |
| Compromised exchange | | ✓ |
| Key theft | | ✓ |
| Market manipulation | | ✓ |

## Known Boundaries

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

## Enforcement Depth

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
