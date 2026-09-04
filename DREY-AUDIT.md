# INTENTRA — Drey Framework Audit

**Date:** September 2, 2026
**Status:** Pre-build verification against Drey Field Manual

---

## The 10-Step Drey Anatomy — Applied to INTENTRA

### 1. Existing Ecosystem ✅
**Binance Agent OS** — launched August 20, 2026. Real platform, real users, real MCP endpoint. Judges don't need to imagine a market. The ecosystem exists.

### 2. Existing Promise ✅
Binance promises: "Give AI agents controlled access to trading, market data, wallets and payments. Users configure permissions and limits."

### 3. Hidden Weakness ✅✅✅ (THIS IS OUR CRACK)
Binance controls **permissions** (who can access what). But permissions don't guarantee **intent alignment** (whether this specific action matches what the user actually wanted).

> An agent can have permission to trade BTC, but the transaction it proposes can still be inconsistent with what the user asked for.

### 4. Specific Failure Mode ✅
Concrete example:
```
User: "Buy $200 BTC. Don't sell anything."
Agent proposes: BUY BTC $200 + SELL ETH $150
Binance permissions: ALLOW both
Result: Agent exceeded declared intent
```

### 5. Sharp Thesis ✅
> "Binance gives agents the ability to act. INTENTRA makes their proposed actions accountable to the intent that authorized them."

Or even sharper:
> "INTENTRA is the transaction compiler for AI agents. Agents generate plans. INTENTRA compiles them into executable transaction plans — and rejects plans that cannot be justified by the user's intent."

### 6. Deep Mechanism ✅
The compiler pipeline:
```
Natural-language intent → Structured constraints → Agent proposal → Normalized actions → Constraint checking → Explainable decision → Human approval → Execution
```

Not hiding the problem. Changing the workflow.

### 7. Proof ✅ (partial)
Three demo cases:
- Case 01: Unauthorized action → BLOCKED
- Case 02: Budget violation → BLOCKED
- Case 03: Valid compound → ALLOWED → approval → execution

**Gap:** We need a measurable metric. What's the "4 rebuild / 14 reuse" for INTENTRA?

### 8. Adversarial Validation ⚠️ (need to build)
We need to:
- Make the agent try to cheat
- Show INTENTRA catching increasingly sophisticated violations
- Prove the system can't be bypassed when configured correctly

### 9. Honest Boundaries ⚠️ (need to articulate)
What we're NOT claiming:
- ❌ Hard enforcement boundary (configuration-level only)
- ❌ Autonomous kill switch (requires user action)
- ❌ Cannot be bypassed (agent can call Binance directly if misconfigured)

### 10. Excellent Packaging ✅ (in progress)
The metaphor is strong: "Transaction compiler for AI agents"
The name is strong: INTENTRA
The demo is clean: allow → block → revise → allow

---

## Scoring Against Drey's "Winner Stack"

| Trait | Score | Notes |
|-------|-------|-------|
| Problem selection | 9/10 | Real ecosystem, real gap |
| Specific failure mode | 9.5/10 | Concrete, demonstrable |
| Ecosystem fit | 9/10 | Binance Agent OS is fresh |
| Product thesis | 9/10 | "Transaction compiler" is memorable |
| Technical depth | 7/10 | **NEEDS WORK** — currently regex-based parsing |
| Proof / verification | 7/10 | **NEEDS WORK** — no measurable metric yet |
| Completeness | 7/10 | **NEEDS WORK** — no approval workflow, no Binance integration |
| Demoability | 8/10 | Clean but needs real execution |
| Engineering taste | 7/10 | **NEEDS WORK** — needs failure semantics |
| Honesty | 9/10 | Clear about limitations |
| Novelty | 8/10 | Transaction compiler is non-obvious |
| Raw "wow factor" | 7/10 | Needs the "make it fail" moment |

**Overall: 7.7/10** — Strong thesis, weak execution so far.

---

## What's Missing to Hit Drey-Level

### 1. LLM-Powered Intent Parsing
Current: Regex-based (fragile)
Needed: LLM or structured parser (robust)

### 2. Measurable Metric
Current: "BLOCKED" / "ALLOWED"
Needed: "12 actions evaluated, 3 violations detected, 0.3ms latency"

### 3. Failure Semantics
Current: Binary ALLOW/BLOCK
Needed: Richer semantics:
- INTENT_VIOLATION
- LIMIT_EXCEEDED
- ASSET_RESTRICTED
- ACTION_PROHIBITED
- PARTIAL_APPROVAL
- REQUIRES_REVISION

### 4. Real Binance Integration
Current: Mock execution
Needed: Actual Binance Agent OS MCP connection

### 5. Adversarial Demo
Current: Happy path + obvious violations
Needed: Agent tries to cheat in increasingly sophisticated ways

### 6. Approval Workflow
Current: "Ready for approval" (text only)
Needed: Interactive approval UI or CLI

### 7. Audit Trail
Current: Console output
Needed: Structured log of intent → proposal → decision → outcome

---

## The Drey Test — Can We Answer These?

| Question | Answer | Status |
|----------|--------|--------|
| What existing system are we entering? | Binance Agent OS | ✅ |
| What does it currently promise? | Controlled agent access to trading | ✅ |
| Where does that promise break? | Permissions ≠ intent alignment | ✅ |
| Who actually experiences that failure? | Users whose agents trade beyond intent | ✅ |
| Why hasn't the ecosystem solved it? | Focus on permissions, not intent | ✅ |
| What is the smallest product that fixes it? | Transaction compiler (intent → proposal → check → execute) | ✅ |
| What is the non-obvious technical mechanism? | Normalizing agent proposals into constraint-checkable plans | ✅ |
| What claim are we making? | Agent actions can be made accountable to declared intent | ✅ |
| How can we prove that claim live? | Demo 3 cases with increasing difficulty | ⚠️ partial |
| How can we break the system ourselves? | Adversarial agent attempts | ❌ not built |
| What metric makes the improvement undeniable? | ??? | ❌ not defined |
| What happens when the happy path fails? | ??? | ❌ not designed |
| What are we explicitly NOT claiming? | Hard enforcement, autonomous kill switch | ✅ |
| Can a judge understand the thesis in 10 seconds? | "Transaction compiler for AI agents" | ✅ |
| Can the demo prove it in under 2 minutes? | 3 cases, ~90 seconds | ✅ |

**Score: 13/15** — Missing metric, failure handling, adversarial demo.

---

## The "4 Rebuild / 14 Reuse" Moment for INTENTRA

What's our equivalent of TAKEGRAPH's killer proof?

**Option A:** "3 violations caught, 0 bypasses, 0.3ms evaluation latency"

**Option B:** "Agent proposed 5 actions, INTENTRA explained why 2 violated intent, agent revised, INTENTRA approved"

**Option C:** "Without INTENTRA: agent executed all 5 actions. With INTENTRA: only 3 executed, $400 saved from unintended trades."

**Option C is strongest.** It's the "before/after" moment.

---

## Next Steps — Priority Order

1. **Define the metric** — What number proves INTENTRA works?
2. **Build failure semantics** — Richer than ALLOW/BLOCK
3. **Build adversarial demo** — Agent tries to cheat 5 ways
4. **Wire real Binance MCP** — Actually execute approved trades
5. **Build approval workflow** — Interactive CLI or simple UI
6. **Add LLM parsing** — Replace regex with structured parser
7. **Build audit trail** — Structured log for verification
8. **Record demo video** — The 90-second proof

---

## Verdict

INTENTRA has a **Drey-grade thesis** (9/10).
INTENTRA has **Drey-grade execution** (7/10).

The gap is real but closeable.

The thesis survives the Drey framework.
The execution needs to catch up.

**Decision: PROCEED. Close the execution gap before September 8.**
