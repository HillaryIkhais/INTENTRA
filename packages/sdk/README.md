# intentra-sdk

Transaction Compiler for AI Agents

> An agent can propose. It cannot authorize.

INTENTRA validates that AI agent-proposed financial actions match the user's declared intent before execution on Binance Agent OS.

## Installation

```bash
npm install intentra-sdk
# or
yarn add intentra-sdk
# or
pnpm add intentra-sdk
```

## Quick Start

```typescript
import { intentra } from "intentra-sdk";

const sdk = intentra();

sdk.setIntent("Buy BTC only. Max $100 per order. Max $200 per day.");

// Validate a proposal
const result = sdk.validate("Buy $90 BTC");

if (result.allowed) {
  console.log("ALLOWED");
  console.log("Daily remaining:", result.totals.dailyRemaining);
} else {
  console.log("BLOCKED");
  console.log("Reason:", result.violations[0]?.reason);
}
```

## Core Concepts

### Intent

Declare what the agent is authorized to do.

```typescript
sdk.setIntent("Buy BTC only. Max $100 per order. Max $200 per day. Expires in 1 hour.");
```

### Validate

Check if a proposal matches the intent.

```typescript
const result = sdk.validate("Buy $90 BTC");
// { allowed: true, decision: "ALLOW", ... }

const result = sdk.validate("Buy $90 ETH");
// { allowed: false, decision: "BLOCK", violations: [...] }
```

### Session Management

Time-boxed authority.

```typescript
import { SessionManager, generateSessionId } from "intentra-sdk";

const sessions = new SessionManager();

const sessionId = generateSessionId();
sessions.create(
  sessionId,
  "agent-123",
  "Buy BTC only. Max $100 per order.",
  3600000 // 1 hour
);

const session = sessions.get(sessionId);
console.log("Is valid:", session.isValid());
```

### Revocation

Revoke agent access instantly.

```typescript
// Register authority
sdk.registerAuthority("agent-123", "Buy BTC only. Max $100 per order.");

// Later, revoke it
sdk.revokeAuthority("agent-123");

// Check if revoked
const isRevoked = sdk.isAuthorityRevoked("agent-123"); // true
```

## API Reference

### IntentraSDK

#### Constructor

```typescript
new IntentraSDK(options?: IntentraSDKOptions)
```

Options:
- `intent`: Initial intent string
- `binanceClient`: Binance MCP client for real execution

#### Methods

| Method | Description |
|--------|-------------|
| `setIntent(intent)` | Set the declared intent |
| `getIntent()` | Get current intent |
| `validate(proposal)` | Validate proposal against intent |
| `compile(intent, proposal)` | Full compilation (intent + proposal) |
| `check(intent, proposal)` | Quick check (decision + reason) |
| `parseIntent(intent)` | Parse intent into constraints |
| `normalizeProposal(proposal)` | Parse proposal into actions |
| `registerAuthority(agentId, intent, parentId?, sessionId?)` | Register agent authority |
| `getAuthority(agentId)` | Get agent authority |
| `revokeAuthority(agentId)` | Revoke agent authority |
| `isAuthorityRevoked(agentId)` | Check if authority is revoked |
| `getReceipt(planId)` | Get receipt by plan ID |
| `listReceipts()` | List all receipts |
| `simulateAttack(intent, attackType)` | Simulate attack (testing) |

### SessionManager

| Method | Description |
|--------|-------------|
| `create(sessionId, agentId, intent, ttlMs, parentSessionId?)` | Create session |
| `get(sessionId)` | Get session by ID |
| `end(sessionId)` | End session |
| `isValid(sessionId)` | Check if session is valid |
| `getAllActive()` | Get all active sessions |
| `getByAgent(agentId)` | Get sessions for agent |

### Attack Types

For testing with `simulateAttack`:

| Type | Description |
|------|-------------|
| `daily_limit` | Exceed daily limit |
| `split_evasion` | Split large order into small ones |
| `unauthorized_asset` | Trade unauthorized asset |
| `unauthorized_action` | Perform unauthorized action (e.g., sell) |
| `policy_mutation` | Try to modify authority |
| `cross_session` | Exceed limits across sessions |
| `agent_mutation` | Agent claims user changed intent |
| `replay` | Replay approved trade |
| `expired` | Execute on expired authority |
| `authority_widening` | Sub-agent tries to widen authority |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DECLARES                         │
│  "Buy BTC only. Max $100 per order. Max $200 per day."     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AGENT PROPOSES                          │
│              "Buy $90 BTC"                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTENTRA COMPILES                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │IntentParser │→ │ProposalNorm │→ │IntentChecker    │     │
│  │             │  │  -alizer    │  │                 │     │
│  │ NL→Struct   │  │ Agent→Struct│  │ Validate against│     │
│  └─────────────┘  └─────────────┘  │ constraints     │     │
│                                      └────────┬────────┘     │
│                                               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │  Decision: ALLOW     │   │
│                                    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BINANCE MCP EXECUTES                      │
│                      REAL ORDER                               │
│                    ORDER FILLED ✔                            │
└─────────────────────────────────────────────────────────────┘
```

## The Drey Thesis

> "An agent can have access to a trading tool without having the authority to execute every trade it can formulate."

INTENTRA is the missing mechanism:

```
Agent proposes → INTENTRA decides → Binance executes
```

Blocked requests never reach Binance. Allowed requests do. That's the proof.

## License

MIT

## Related

- [intentra-cli](../cli) - Command-line interface
- [intentra-dashboard](../dashboard) - Web dashboard
- [Binance Agent OS](https://agent.binance.com) - Binance's agentic execution platform
