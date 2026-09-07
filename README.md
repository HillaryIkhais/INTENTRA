# INTENTRA

AI agents can propose anything.
They cannot manufacture authority.

INTENTRA is an authority provenance layer for delegated AI agents.
It guarantees that every child capability is no more powerful than
the authority from which it was derived.

## The Problem

When humans delegate authority to AI agents, and those agents delegate
to other agents, authority can silently expand:

```
Human grants: $10 BNB/USDT
    → Agent A delegates: $10 BNB/USDT
        → Agent B requests: $100 ETH/USDT
        → Agent B gets it.
```

Traditional permissions describe what one principal can do.
INTENTRA tracks how authority changes as it is delegated across
a chain of agents.

The problem isn't "Can Agent A trade?"
It's "Can Agent C exercise authority that was never granted
anywhere in its ancestry?"

## The Invariant

```
∀ child capabilities Cᵢ:
    Cᵢ ⊆ Cᵢ₋₁

Authority can only narrow.
Never widen.
```

A child agent can inherit authority.
It can never manufacture more.

## Architecture

```
                 HUMAN
                   │
             grants authority
                   │
                   ▼
             INTENTRA C₀
                   │
                   ▼
              AGENT A
                   │
              delegates
                   │
                   ▼
             INTENTRA C₁
                   │
                   ▼
              AGENT B
                   │
               proposes
                   │
                   ▼
             INTENTRA CHECK
                   │
          ┌────────┴────────┐
          ▼                 ▼
        BLOCK              ALLOW
                              │
                              ▼
                       BINANCE AGENT OS
                              │
                              ▼
                           EXECUTE
```

## Capability Model

Every authority is an explicit capability:

```
Capability
├── issuer            (who issued this)
├── subject           (who holds this)
├── assets            (what can be traded)
├── actions           (what operations are allowed)
├── maxPerOrder       (per-transaction limit)
├── maxTotalSpend     (cumulative limit)
├── maxDailySpend     (daily limit)
├── approvalThreshold (requires human above this)
├── prohibitedActions (explicit denials)
├── expiresAt         (temporal boundary)
├── parentCapability  (where authority came from)
└── capabilityId      (unique identifier)
```

Every delegation creates:

```
C₀ → C₁ → C₂ → C₃
```

with:

```
C₃ ⊆ C₂ ⊆ C₁ ⊆ C₀
```

Programmatically enforced.
Not approximately.
Not "the model should respect it."

## What INTENTRA Enforces

| Constraint | Enforcement |
|---|---|
| Asset scope cannot increase | ✓ |
| Action scope cannot increase | ✓ |
| Amount limits cannot increase | ✓ |
| Expiry cannot extend | ✓ |
| Approval requirements cannot weaken | ✓ |
| Prohibitions cannot disappear | ✓ |
| Omitted restrictions become unlimited | ✓ (detected as widening) |
| Wildcard expansion blocked | ✓ |

## Adversarial Proof

14 structural attacks tested against the delegation invariant:

```
RESULT: 11/14 attacks blocked
CRITICAL: 6/6 blocked

  ✓ Deep Nesting              [CRITICAL] BLOCKED
  ✗ Circular Delegation                  BOUNDARY (no widening occurred)
  ✗ Split Evasion              [HIGH]    BOUNDARY (total/daily limits catch it)
  ✓ Boundary Precision                   BLOCKED
  ✓ Gradual Scope Creep        [HIGH]    BLOCKED
  ✓ Null Injection             [CRITICAL] BLOCKED
  ✓ Revival After Revoke       [CRITICAL] BLOCKED
  ✗ Concurrent Delegation                BOUNDARY (requires session layer)
  ✓ Constraint Pollution                  BLOCKED
  ✓ Ancestor Spoofing           [CRITICAL] BLOCKED
  ✓ Limit Omission             [CRITICAL] BLOCKED
  ✓ Approval Threshold Escalation [CRITICAL] BLOCKED
  ✓ Expiry Extension           [HIGH]    BLOCKED
  ✓ Prohibition Removal        [HIGH]    BLOCKED
```

Property-based fuzzing:

```
10,000 randomized delegation chains
8 adversarial strategies
25,000+ delegations tested
0 authority-widening paths accepted
```

## Audit History

INTENTRA's enforcement model had blind spots.
We found and closed them:

| ID | Severity | Finding | Fix |
|---|---|---|---|
| F-01 | CRITICAL | Limit-field omission bypass | Omission detected as widening |
| F-02 | CRITICAL | Approval threshold not checked | Oversight escalation detected |
| F-03 | HIGH | Expiry extension not detected | Temporal escalation detected |
| F-04 | HIGH | Prohibition removal not detected | Prohibition removal detected |
| F-05 | MEDIUM | Fuzzer shared compiler blind spots | Fuzzer rewritten with independent semantics |

A security system that can say "our first model had blind spots;
here is how we found and closed them" is more credible than a
suspiciously perfect green dashboard.

## Proof Boundary

### Verified

- Authority cannot widen
- Delegation constrained
- Revocation enforced
- Replay blocked
- Prompt injection rejected
- Execution receipts with full lineage

### Boundary

- Concurrent delegation: each child ≤ parent individually
  (aggregate enforcement requires session-layer budget tracking)
- Circular delegation: each step narrowed, cycle didn't widen
  (system is sound, cycle detection is a policy decision)
- Split evasion: first order passes, subsequent blocked by total/daily limits

### Out of Scope

- Compromised human granting authority
- Compromised Binance infrastructure
- Private-key theft outside capability layer
- Malicious execution substrate

## Quick Start

```bash
npm install
npm run lari       # Run the full demo
npm test           # Run authority model tests
npm run demo       # Run end-to-end demo
```

## Binance Integration

INTENTRA connects to Binance Agent OS via MCP with OAuth 2.1 PKCE.

```bash
npm run test-connection  # Test Binance OAuth flow
```

The execution adapter supports mock and real modes:

```typescript
import { ExecutionAdapter } from "./core/execution-adapter.js";

// Mock mode — proves architecture without credentials
const mock = new ExecutionAdapter({ mode: "mock", receiptStore });

// Real mode — calls Binance Agent OS MCP
const real = new ExecutionAdapter({
  mode: "real",
  binanceClient,
  receiptStore,
});
```

## Model Independence

The model is not the authority source.

Same capability. Different agent framings. Same outcome:

```
Honest agent:     "Buy $15 BNBUSDT"     → BLOCK
Confused agent:   "Transfer $500"       → BLOCK
Injected agent:   "SYSTEM OVERRIDE..."  → BLOCK
Legitimate:       "Buy $8 BNBUSDT"      → ALLOW
```

INTENTRA's decision is independent of what the model says.
The model's interpretation cannot mutate the authority boundary.

## Why Not Just Permissions?

Traditional permissions:

```
Can Agent A trade BNBUSDT? YES
Can Agent B trade ETHUSDT? YES
```

That describes what each agent can do independently.
It doesn't track how authority flows between them.

INTENTRA:

```
Human → $10 BNB → Agent A → $7 BNB → Agent B → $3 BNB → Agent C

Agent C requests $4 BNB → BLOCKED (AMOUNT_ESCALATION)
Agent B requests ETH   → BLOCKED (ASSET_ESCALATION)
Agent A requests       → unrestricted child → BLOCKED (DELEGATION_ESCALATION)
```

Authority lineage + delegation + non-widenability + proof.
That's the difference.

## License

MIT
