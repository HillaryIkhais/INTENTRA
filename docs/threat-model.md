# INTENTRA — Threat Model

## Attacker Model

INTENTRA assumes the following attackers may be active:

### Compromised Agent Model

The LLM powering an agent may be:
- Prompt-injected by external input
- Hallucinating authorization that doesn't exist
- Confused by adversarial framing
- Deliberately instructed to escalate authority

**INTENTRA's response:** The model's interpretation is irrelevant.
Authority is checked against the capability, not the model's claims.

### Malicious Child Agent

A child agent may:
- Request more authority than its parent holds
- Omit restrictions to create unlimited authority
- Request assets or actions outside its parent's scope
- Extend its own expiry beyond its parent's
- Remove prohibitions inherited from its parent
- Raise approval thresholds to bypass human oversight

**INTENTRA's response:** All delegation is validated against the parent
capability. The subset invariant `Cᵢ ⊆ Cᵢ₋₁` is programmatically enforced.

### Malformed Delegation Request

A delegation request may:
- Contain empty arrays (intended as "unrestricted")
- Include garbage fields
- Reference non-existent parent capabilities
- Attempt circular delegation
- Attempt deep nesting to obscure escalation

**INTENTRA's response:** Empty arrays are detected as authority widening.
Garbage fields are ignored. Non-existent parents are rejected. Circular
and deep chains are validated at each step.

### Replay Attack

An attacker may:
- Resubmit a previously executed proposal
- Replay a receipt to extract funds twice
- Use a revoked capability's receipt

**INTENTRA's response:** Each intent+proposal combination is tracked.
Duplicate execution attempts are rejected with REPLAY_DETECTED status.

### Scope Evasion

An attacker may:
- Split a large order into small orders to stay under per-order limits
- Use multiple concurrent children to collectively exceed root authority
- Gradually escalate across multiple delegations

**INTENTRA's response:**
- Split evasion: First order passes per-order check, subsequent orders
  are blocked by total/daily spend limits.
- Concurrent delegation: Each child ≤ parent individually. Aggregate
  enforcement requires session-layer budget tracking (known boundary).
- Gradual scope creep: Each escalation attempt is blocked individually.

## What INTENTRA Protects Against

| Attack | Protection |
|---|---|
| Asset escalation | ✓ Blocked |
| Action escalation | ✓ Blocked |
| Amount escalation | ✓ Blocked |
| Limit field omission | ✓ Detected as widening |
| Approval threshold escalation | ✓ Blocked |
| Expiry extension | ✓ Blocked |
| Prohibition removal | ✓ Blocked |
| Wildcard injection | ✓ Blocked |
| Ancestor spoofing | ✓ Blocked |
| Prompt injection | ✓ Blocked (model independent) |
| Replay attacks | ✓ Blocked |
| Deep nesting | ✓ Blocked at each step |

## What INTENTRA Does NOT Protect Against

### Compromised Human

If the human who issues the root capability is compromised,
INTENTRA cannot distinguish legitimate from malicious authority.
The human is the trust anchor.

### Compromised Binance Infrastructure

INTENTRA sits between the agent and Binance.
If Binance's infrastructure is compromised, INTENTRA's guarantees
do not extend to the execution layer.

### Private-Key Theft

INTENTRA manages capability-based authority, not cryptographic keys.
If a private key is stolen outside the capability layer,
INTENTRA cannot detect or prevent unauthorized use.

### Malicious Execution Substrate

INTENTRA validates proposals before execution.
If the execution substrate (Binance Agent OS) is compromised,
it could execute transactions that INTENTRA did not authorize.

### Aggregate Budget Exhaustion

Each child capability is validated individually against its parent.
Multiple children can collectively exhaust the parent's budget.
Aggregate enforcement requires a session-layer budget tracker.

This is a known design boundary, not a bug. The per-delegation
invariant holds: every child is ≤ its parent.

## Security Claims

INTENTRA provides the following guarantees:

1. **Authority Narrowing:** Every child capability is a subset of its
   parent. This is programmatically enforced, not advisory.

2. **Model Independence:** The decision is independent of the model's
   interpretation. A prompt-injected model produces the same decision
   as an honest model given the same capability.

3. **Provenance Tracking:** Every execution (or blocked attempt) produces
   a receipt with the full authority lineage. Lineage is recoverable.

4. **Replay Resistance:** Each intent+proposal combination can only be
   executed once. Duplicate attempts are rejected.

5. **Transparency:** The system explicitly states what it does not
   protect against. Boundaries are documented, not hidden.

## Invariant

```
∀ child capabilities Cᵢ:
    Cᵢ ⊆ Cᵢ₋₁

Authority can only narrow.
Never widen.
```

This invariant holds across:
- 14 structural adversarial attacks (11 blocked, 3 boundary)
- 10,000 randomized delegation chains
- 8 adversarial fuzzing strategies
- 25,000+ individual delegations tested
