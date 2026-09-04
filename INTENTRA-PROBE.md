# INTENTRA Architecture Probe

**Date:** September 2, 2026
**Status:** Pre-build verification
**Thesis:** Transaction compiler that makes agent actions explainable against declared intent

---

## The Core Claim

> "Binance gives agents the ability to act. INTENTRA makes their proposed actions accountable to the intent that authorized them."

**What INTENTRA does NOT claim:**
- ❌ "I can stop an autonomous agent from bypassing Binance"
- ❌ "I can enforce policies at the architectural level"
- ❌ "I can trigger emergency stop programmatically"

**What INTENTRA DOES claim:**
- ✅ "I can make an agent's proposed financial actions explainable against declared intent"
- ✅ "I can normalize agent proposals into structured execution plans"
- ✅ "I can detect when proposed actions exceed declared intent"
- ✅ "I can create an audit trail of intent → proposal → decision → outcome"

---

## The Workflow

```
Natural-language intent
   ↓
Agent proposes actions
   ↓
INTENTRA normalizes into structured plan
   ↓
INTENTRA evaluates against declared intent
   ↓
Human approves/rejects
   ↓
INTENTRA forwards to Binance Agent OS
```

**Key difference from KILLSWITCH:**
- KILLSWITCH: Agent proposes → KILLSWITCH evaluates → Agent decides
- INTENTRA: Agent proposes → INTENTRA normalizes → INTENTRA evaluates → Human approves → Binance executes

INTENTRA adds **human approval** as a natural checkpoint.

---

## What We Know About Binance Agent OS

From our architecture probe:

1. **MCP Endpoint:** `https://agent.binance.com/mcp/agentic`
2. **Auth:** OAuth 2.0 Bearer (browser-based, user-controlled)
3. **Tools:** Market data, account, trading, wallet, emergency stop (UI-only)
4. **Permissions:** User-controlled via Binance UI
5. **Bypass:** Agent can call Binance MCP directly if configured

---

## Critical Questions for INTENTRA

### Q1: Can INTENTRA receive agent action proposals before execution?

**Answer: YES, if configured as the sole MCP gateway.**

If the agent is configured to use INTENTRA MCP (not Binance MCP directly), then:
- Agent proposes actions through INTENTRA's tools
- INTENTRA normalizes and evaluates
- INTENTRA forwards to Binance only if approved

**But:** This is configuration-level enforcement, not architectural.

### Q2: Can INTENTRA normalize agent proposals into structured plans?

**Answer: YES.**

INTENTRA can:
- Parse agent's proposed actions (BUY BTC $200, SELL ETH $150)
- Normalize into structured format (asset, side, quantity, notional)
- Resolve against declared intent constraints
- Detect violations

### Q3: Can INTENTRA evaluate against declared intent?

**Answer: YES.**

INTENTRA can:
- Parse natural-language intent into structured constraints
- Compare proposed actions against constraints
- Detect: "SELL ETH has no supporting intent constraint"
- Detect: "Projected total $512 exceeds $500 limit"

### Q4: Can INTENTRA forward to Binance after approval?

**Answer: YES.**

INTENTRA can:
- Call Binance MCP tools with approved actions
- Forward only approved transactions
- Maintain audit trail

### Q5: Can INTENTRA demonstrate the complete flow?

**Answer: YES, with caveats.**

Demo flow:
1. User declares intent: "Buy $200 BTC, don't sell anything"
2. Agent proposes: BUY BTC $200, SELL ETH $150
3. INTENTRA normalizes: [BUY BTC $200, SELL ETH $150]
4. INTENTRA evaluates: SELL ETH violates intent
5. INTENTRA blocks: "Action 2 has no supporting intent constraint"
6. Agent revises: BUY BTC $200
7. INTENTRA evaluates: Passes
8. Human approves
9. INTENTRA forwards to Binance
10. Binance executes

**Caveat:** This requires INTENTRA to be the sole gateway. If agent can call Binance directly, step 4 is advisory only.

---

## The Bypass Problem

**Same as KILLSWITCH:** Agent can bypass INTENTRA if configured to call Binance MCP directly.

**Mitigation:**
- User must NOT configure Binance MCP directly
- User must ONLY configure INTENTRA MCP
- INTENTRA becomes the sole gateway to Binance

**This is configuration-level enforcement, not architectural.**

---

## Is INTENTRA Stronger Than KILLSWITCH?

### KILLSWITCH Positioning
- "I can stop an autonomous agent from bypassing Binance" (false claim)
- "I can enforce policies at the architectural level" (false claim)
- "I am a security boundary" (misleading)

### INTENTRA Positioning
- "I can make an agent's proposed financial actions explainable" (true claim)
- "I can normalize agent proposals into structured plans" (true claim)
- "I can detect when proposed actions exceed declared intent" (true claim)
- "I am a transaction compiler" (accurate)

### Verdict: YES, INTENTRA is stronger

**Why:**
1. **More honest:** Doesn't claim to control what it can't control
2. **Better positioning:** "Transaction compiler" vs "security boundary"
3. **Better workflow:** Intent → proposal → normalize → check → approve → execute
4. **Better demo:** Allow → block → revise → allow
5. **Better alignment with Binance:** Works WITH the platform, not against it

---

## The Demo

### Without INTENTRA
```
User: "Buy BTC."
Agent: Interprets intent → makes several actions → executes.
```

### With INTENTRA
```
User: "Buy BTC."
Agent proposes:
  BUY BTC $200
  BUY ETH $100
  SELL SOL $80

INTENTRA:
  Intent: BUY BTC
  Max: $200
  SELL: PROHIBITED

  Action 1: BUY BTC $200 ✓
  Action 2: BUY ETH $100 ✗ (no supporting intent)
  Action 3: SELL SOL $80 ✗ (SELL prohibited)

  RESULT: BLOCKED

Agent revises:
  BUY BTC $200

INTENTRA:
  Action 1: BUY BTC $200 ✓

  RESULT: ALLOWED

Human approves.
INTENTRA forwards to Binance.
Binance executes.
```

**This is a much cleaner story than KILLSWITCH.**

---

## What We Build

1. **INTENTRA MCP Server** — Wraps Binance MCP with intent evaluation
2. **Intent Parser** — Converts natural-language intent to structured constraints
3. **Action Normalizer** — Converts agent proposals to structured format
4. **Policy Engine** — Evaluates actions against declared intent
5. **Approval Workflow** — Human approval before execution
6. **Audit Trail** — Records intent → proposal → decision → outcome

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Bypass problem | Medium | Configuration-level enforcement |
| No emergency stop | Low | Not claiming to provide one |
| Demo complexity | Low | Clean workflow: allow → block → revise → allow |
| Binance API limitations | Medium | Work with what's available |
| Hackathon timeline | Medium | 2-3 days for MVP |

---

## Verdict

**INTENTRA is a stronger thesis than KILLSWITCH because:**

1. **More honest:** Doesn't claim to control what it can't control
2. **Better positioning:** "Transaction compiler" vs "security boundary"
3. **Better workflow:** Intent → proposal → normalize → check → approve → execute
4. **Better demo:** Allow → block → revise → allow
5. **Better alignment with Binance:** Works WITH the platform, not against it

**The bypass problem remains, but INTENTRA's positioning handles it better.**

KILLSWITCH claimed: "I can stop the agent." (false)
INTENTRA claims: "I can make the agent's actions explainable." (true)

**INTENTRA survives the architecture probe.**

---

## Next Steps

1. **Lock INTENTRA thesis** — This is the one
2. **Build INTENTRA MCP server** — Wrap Binance tools with intent evaluation
3. **Implement intent parser** — Natural-language to structured constraints
4. **Implement action normalizer** — Agent proposals to structured format
5. **Implement policy engine** — Evaluate actions against declared intent
6. **Implement approval workflow** — Human approval before execution
7. **Create audit trail** — Intent → proposal → decision → outcome
8. **Demo the flow** — Allow → block → revise → allow

**Timeline:** 2-3 days for hackathon submission
**Risk:** Medium — viable and stronger than KILLSWITCH
**Reward:** $20k-40k if executed well
