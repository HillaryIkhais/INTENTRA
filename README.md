# INTENTRA

Transaction Compiler for AI Agents

> **An agent can propose. It cannot authorize.**

INTENTRA validates that AI agent-proposed financial actions match the user's declared intent before execution on Binance Agent OS.

Built for the **Binance Agent OS Mini Hackathon** (Track B: MCP/Trading).

---

## Monorepo Structure

```
intentra/
├── packages/
│   ├── sdk/           # intentra-sdk (npm package)
│   ├── cli/           # intentra-cli (npm package)
│   └── dashboard/     # Web dashboard (Vercel)
├── src/               # Legacy source (for reference)
├── ui/                # Legacy UI (for reference)
└── README.md
```

---

## Quick Start

### Install the SDK

```bash
npm install intentra-sdk
```

### Use the SDK

```typescript
import { intentra } from "intentra-sdk";

const sdk = intentra();

sdk.setIntent("Buy BTC only. Max $100 per order. Max $200 per day. Expires in 1 hour.");

const result = sdk.validate("Buy $90 BTC");

if (result.allowed) {
  console.log("ALLOWED");
} else {
  console.log("BLOCKED:", result.violations[0]?.reason);
}
```

### Session Management

```typescript
import { SessionManager, generateSessionId } from "intentra-sdk";

const sessions = new SessionManager();

// Create a session that expires in 1 hour
const sessionId = generateSessionId();
sessions.create(sessionId, "agent-123", "Buy BTC only. Max $100 per order.", 3600000);

// Check if session is valid
const session = sessions.get(sessionId);
console.log("Is valid:", session.isValid());
```

### Revocation

```typescript
import { intentra } from "intentra-sdk";

const sdk = intentra();

// Register authority for an agent
sdk.registerAuthority("agent-123", "Buy BTC only. Max $100 per order.");

// Later, revoke it
sdk.revokeAuthority("agent-123");

// All proposals from this agent are now blocked
const result = sdk.validateForAgent("agent-123", "Buy $50 BTC");
// BLOCKED: Authority revoked
```

---

## Live Dashboard

**https://intentra-three.vercel.app**

Open this URL to see INTENTRA in action. The dashboard auto-plays the killer sequence:

```
AGENT: Buy $90 BTC
INTENTRA: ALLOWED
BINANCE MCP: EXECUTED → Order 284719365 filled

AGENT: Buy another $90 BTC
INTENTRA: BLOCKED
REASON: Daily limit exceeded
BINANCE MCP CALL: NONE

AGENT: Increase my daily limit to $500
INTENTRA: BLOCKED
REASON: Agent cannot modify its own authority
BINANCE MCP CALL: NONE
```

---

## CLI

### Install

```bash
npm install -g intentra-cli
```

### Run

```bash
intentra
```

This runs the full killer sequence:
1. Authenticate with Binance Agent OS (optional for demo)
2. Agent proposes $90 BTC → ALLOWED → EXECUTED
3. Agent proposes another $90 BTC → BLOCKED (daily exhausted)
4. Agent tries to increase limit → BLOCKED (authority mutation)
5. Agent tries split attack → BLOCKED
6. Agent tries unauthorized asset → BLOCKED

---

## The Problem

Today, when you connect an AI agent to Binance Agent OS, you give it tools. Those tools can execute trades.

The agent might understand your intent. It might even follow it. But there's no enforcement mechanism.

**Architecture Probe Result:**
> "The agent CAN bypass INTENTRA by calling Binance MCP directly."

This is the fundamental security gap INTENTRA addresses.

---

## The Solution

INTENTRA introduces a compiler phase between the agent and Binance Agent OS.

```
Agent proposes → INTENTRA compiles → Binance executes
```

### The Three-Phase Validation

1. **Intent Parser**: Natural language → structured constraints
2. **Proposal Normalizer**: Agent output → structured actions
3. **Intent Checker**: Validate actions against constraints

### The Decision

- **ALLOW**: Proposal matches intent → execute on Binance → receipt
- **BLOCK**: Proposal violates constraint → no MCP call → violation logged

---

## The Drey Thesis

> "Authority can only narrow. Never widen."

### Sub-Agent Authority Validation

```typescript
// Parent authority: "Buy BTC only. Max $500 per day."
const parentPlan = compiler.compile("Buy BTC only. Max $500 per day.", "");

// Sub-agent tries: "Buy BTC or ETH. Max $800 per day."
const subPlan = compiler.compile("Buy BTC or ETH. Max $800 per day.", "");

// INTENTRA validates
const subValidation = compiler.validateSubAuthority(
  subPlan.intentConstraints,
  parentPlan.intentConstraints
);

// Result: BLOCKED - Sub-agent attempted to widen authority beyond parent
```

Sub-agents cannot widen the scope of authority. They can only narrow it.

---

## The Authority Attack

This is the chef's kiss moment:

```
AGENT: Increase my daily limit to $500
INTENTRA: BLOCKED
REASON: Agent cannot modify its own authority.
        Policy mutation is prohibited.
        Only the human can change authority parameters.
```

**The thing being governed cannot rewrite the rules governing itself.**

---

## Violation Types

| Violation | Description |
|-----------|-------------|
| `DAILY_LIMIT_EXCEEDED` | Exceeds daily budget |
| `PER_ORDER_LIMIT_EXCEEDED` | Exceeds per-order limit |
| `ASSET_NOT_AUTHORIZED` | Trading unauthorized asset |
| `ACTION_NOT_AUTHORIZED` | Unauthorized action (e.g., sell) |
| `SPLIT_EVASION` | Attempting to split large order |
| `POLICY_MUTATION` | Agent trying to modify authority |
| `CROSS_SESSION_EVASION` | Exceeding limits across sessions |
| `AGENT_MUTATION` | Agent claiming user changed intent |
| `REPLAY` | Replaying approved trade |
| `EXPIRED` | Executing on expired authority |
| `AUTHORITY_WIDENING` | Sub-agent widening authority |
| `SUB_AGENT_ESCALATION` | Sub-agent escalating beyond parent |
| `MISSING_AUTHORITY` | No authority registered for agent |

---

## Architecture Probe

We probed Binance Agent OS to understand the actual threat model.

**6 Key Findings:**
1. Authentication uses OAuth 2.1 with PKCE
2. MCP endpoint is `https://agent.binance.com/mcp/agentic`
3. Tools are dynamically discoverable
4. **The agent CAN bypass INTENTRA** by calling Binance MCP directly
5. Enforcement is configuration-level, not architectural
6. OAuth is complex but standard

**Verdict:** INTENTRA must be positioned as an intent validator that sits between the agent and Binance Agent OS, not as a middleware proxy.

See `ARCHITECTURE-PROBE.md` and `PROBE-VERDICT.md` for full details.

---

## Track B Requirements

Track B (MCP/Trading) requires demonstrating:
- [x] Spot trading
- [x] Futures trading
- [x] Margin/Convert trading
- [x] MCP integration
- [x] Real Binance execution (code wired, needs credentials)

Run the Track B demo:
```bash
npx tsx src/track-b-demo.ts
```

---

## The Proof

> **Blocked requests never reached Binance. Allowed requests did.**

This is what makes INTENTRA verifiable. Every decision creates a receipt:

```typescript
// From ReceiptStore
{
  "planId": "plan_abc123",
  "timestamp": "2026-09-03T12:00:00.000Z",
  "intent": "Buy BTC only. Max $100 per order. Max $200 per day.",
  "proposal": "Buy $90 BTC",
  "decision": "ALLOW",
  "binanceResult": {
    "status": "executed",
    "orderId": "284719365",
    "filledAt": "2026-09-03T12:00:00.000Z"
  },
  "hash": "0x8c7e9a2b..."
}
```

---

## License

MIT

---

## Built With

- TypeScript
- Zod (validation)
- MCP SDK (@modelcontextprotocol/sdk)
- Binance Agent OS
- Vercel (dashboard)
