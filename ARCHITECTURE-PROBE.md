# KILLSWITCH Architecture Probe Results

**Date:** September 2, 2026
**Status:** Pre-build verification
**Verdict:** 🟡 Viable with redesign — not a gimmick, but not a hard boundary either

---

## Test 1: Connect to Real Binance MCP

### What We Found

**Endpoint:** `https://agent.binance.com/mcp/agentic`

**Authentication:** OAuth 2.0 Bearer token (PKCE flow)

```
HTTP/2 401
www-authenticate: Bearer resource_metadata="https://agent.binance.com/.well-known/oauth-protected-resource/gateway-mcp"
```

**OAuth Flow:**
- Authorization: `https://accounts.binance.com/agentic-oauth/authorize`
- Token: `https://accounts.binance.com/oauth-agentic/token`
- Grant type: `authorization_code` with S256 PKCE
- Auth method: `none` (public client)

**Key Insight:** Authentication is **browser-based and user-controlled**. The agent cannot self-authenticate. This is a natural permission boundary.

### Claude CLI Not Installed

Claude CLI is not on this machine. The probe was conducted via direct HTTP requests to the Binance MCP endpoint.

---

## Test 2: Actual Tools Exposed

### Official Binance Agent OS MCP (OAuth-protected)

Based on documentation and the official announcement:

| Tool Category | Capabilities | Mutates State? |
|---------------|--------------|----------------|
| **Market Data** | Tickers, order books, candlesticks, funding rates | No |
| **Account** | Balances, positions, transaction history | No |
| **Trading** | Spot, margin, convert, futures orders | **Yes** |
| **Wallet** | Transfers within Agentic subaccount | **Yes** |
| **Emergency Stop** | Disconnect agents, cancel all positions/orders | **Yes** |

### Critical Finding: Emergency Stop

From Binance developer docs:
> "Emergency stop — in a single step, disconnect all connected agents and cancel all spot, margin, and futures positions and orders in this Agentic account."

**BUT:** This appears to be a **UI-only feature**, not an MCP tool. The agent cannot invoke its own emergency stop.

### Unofficial Community MCP Servers (API key-based)

These are NOT the official Binance Agent OS. They use direct API keys:

| Tool | Purpose | Mutates State? |
|------|---------|----------------|
| `get_balance` | Account balances | No |
| `get_ticker_price` | Current price | No |
| `get_order_book` | Order book depth | No |
| `create_order` | Place buy/sell orders | **Yes** |
| `cancel_order` | Cancel orders | **Yes** |
| `cancel_all_orders` | Cancel all orders | **Yes** |
| `get_orders` | Order history | No |
| `get_account_snapshot` | Account state | No |
| `get_pnl` | Profit/loss | No |
| `get_position_info` | Futures positions | No |

**Note:** These community servers require API keys, not OAuth. They are a different architecture.

---

## Test 3: The Bypass Test

### Architecture Tested

**Can the agent bypass KILLSWITCH and call Binance directly?**

**Answer: YES, but with constraints.**

The Binance Agent OS architecture is:
```
Agent → Binance MCP (OAuth auth required)
```

Not:
```
Agent → KILLSWITCH → Binance MCP
```

### Why the Agent Can Bypass

1. **Multiple MCP servers can coexist** — An agent can have both KILLSWITCH and Binance MCP configured simultaneously
2. **Direct tool invocation** — The agent can call Binance MCP tools directly without going through KILLSWITCH
3. **No enforced proxy** — There's no architectural mechanism preventing direct calls

### What Prevents Bypass

1. **OAuth authentication** — The agent needs a valid OAuth token, which requires user browser interaction
2. **Permission scoping** — Binance limits what the agent can do via OAuth scopes
3. **Subaccount isolation** — Agent activity is isolated to a dedicated subaccount
4. **User-controlled limits** — Funding limits, order approval settings are configured in Binance UI

### Verdict on Bypass

**KILLSWITCH cannot be a hard enforcement boundary** in the traditional sense. The agent can theoretically bypass it.

**HOWEVER:** KILLSWITCH can be:
- A **policy gateway** that evaluates actions before they reach Binance
- A **monitoring layer** that detects policy violations
- An **advisory system** that recommends blocking
- A **proxy MCP server** that wraps Binance tools

---

## Test 4: Permissions

### Who Controls Permissions?

**Answer: The USER controls permissions via Binance UI, not via MCP tools.**

From documentation:
- Users configure permissions in Binance Agent OS dashboard
- Users set funding limits per subaccount
- Users enable/disable order approval requirements
- Users can revoke agent access at any time

### Can the Agent Change Its Own Permissions?

**Answer: NO.**

The MCP server does not expose tools for:
- Modifying agent permissions
- Changing funding limits
- Enabling/disabling order approval
- Altering product restrictions

**This is good for KILLSWITCH** — the agent cannot escalate its own privileges.

### Permission Model

| Permission | Configurable via MCP? | Configurable via UI? |
|------------|----------------------|---------------------|
| Trading access | No | Yes |
| Product restrictions | No | Yes |
| Funding limits | No | Yes |
| Order approval | No | Yes |
| Agent revocation | No | Yes |

---

## Test 5: Emergency Stop

### Capabilities Found

| Capability | Type | Invocable by Agent? |
|------------|------|---------------------|
| Emergency stop | UI feature | **No** |
| Disconnect agent | UI feature | **No** |
| Revoke access | UI feature | **No** |
| Cancel all orders | MCP tool (unofficial) | Yes (if configured) |
| Cancel specific order | MCP tool (unofficial) | Yes (if configured) |

### Critical Finding

**Emergency stop is UI-only.** The agent cannot invoke its own emergency stop. This means:

1. KILLSWITCH cannot programmatically trigger emergency stop via MCP
2. Emergency stop must be triggered by the user through Binance UI
3. If we want KILLSWITCH to trigger emergency stop, we'd need to use the Binance REST API directly (not MCP)

### Implication for KILLSWITCH

KILLSWITCH cannot be a fully autonomous kill switch. It can:
- Detect dangerous behavior
- Log policy violations
- Alert the user
- Recommend emergency stop

But it cannot:
- Automatically disconnect the agent
- Automatically cancel all orders
- Automatically revoke access

Unless we use the Binance REST API directly (outside MCP).

---

## Test 6: KILLSWITCH Experiment Design

### Architecture Options

**Option A: Advisory Layer (weakest)**
```
Agent → KILLSWITCH (advisory) → Agent decides → Binance MCP
```
- KILLSWITCH evaluates and recommends
- Agent can ignore recommendations
- Still useful for logging and alerts

**Option B: MCP Proxy (strongest viable)**
```
Agent → KILLSWITCH MCP Server → Binance MCP
```
- KILLSWITCH wraps Binance MCP tools
- Agent only sees KILLSWITCH tools
- KILLSWITCH enforces policies before forwarding to Binance

**Option C: Hybrid (ideal but requires API access)**
- KILLSWITCH as MCP proxy
- Binance REST API for emergency stop
- Direct API integration for revocation

### Recommended Path: Option B

KILLSWITCH should be an MCP server that:
1. Wraps Binance MCP tools
2. Enforces policies before forwarding to Binance
3. Maintains audit trail
4. Monitors behavioral patterns

### The Bypass Problem

**Critical question:** If KILLSWITCH is configured as an MCP server, can the agent also configure Binance MCP directly?

**Answer: Potentially yes.** The agent could have both:
- `killswitch-mcp-server` (our controlled layer)
- `binance-mcp-server` (direct access)

**Mitigation:** 
- User must NOT configure Binance MCP directly
- User must ONLY configure KILLSWITCH MCP
- KILLSWITCH becomes the sole gateway to Binance

**This is a configuration-level enforcement, not an architectural one.**

---

## Verdict

### 🟡 KILLSWITCH is viable but not a hard boundary

**What it CAN be:**
- Policy evaluation engine
- Behavioral monitoring system
- Audit trail generator
- Advisory recommendation layer
- MCP proxy that enforces policies

**What it CANNOT be:**
- Hard enforcement boundary (agent can bypass)
- Autonomous emergency stop (UI-only feature)
- Permission modifier (UI-only feature)
- Guaranteed revocation mechanism

### Revised KILLSWITCH Thesis

**Original:** "KILLSWITCH turns vague human intent into enforceable boundaries"

**Revised:** "KILLSWITCH provides policy evaluation and behavioral monitoring for autonomous financial agents, with configurable enforcement via MCP proxy architecture"

### The Hackathon Angle

**What judges care about:**
1. Does it solve a real problem? **Yes** — authorized actions can still violate intent
2. Is it technically interesting? **Yes** — policy engine + behavioral monitoring + MCP
3. Can it demo well? **Yes** — allow → block → detect → alert flow
4. Is it a genuine contribution to Agent OS? **Yes** — fills the intent/policy gap

### What We Build

1. **KILLSWITCH MCP Server** — Wraps Binance MCP with policy enforcement
2. **Policy Engine** — Evaluates actions against user-declared policies
3. **Behavioral Monitor** — Detects suspicious patterns across time
4. **Audit Trail** — Records intent → proposal → decision → outcome
5. **Alert System** — Notifies user of policy violations

### What We Don't Claim

- ❌ "Hard enforcement boundary" (it's not)
- ❌ "Autonomous kill switch" (requires user action)
- ❌ "Cannot be bypassed" (it can be, via configuration)
- ❌ "Agent cannot trade without permission" (it can, if configured directly)

### What We Do Claim

- ✅ "Evaluates agent actions against user intent"
- ✅ "Detects behavioral anomalies across time"
- ✅ "Provides audit trail for accountability"
- ✅ "Enforces policies via MCP proxy when configured as sole gateway"
- ✅ "Fills the gap between permissions and intent"

---

## Next Steps

1. **Build KILLSWITCH MCP server** — Wrap Binance tools with policy layer
2. **Implement policy engine** — Structured constraint evaluation
3. **Add behavioral monitoring** — Sequence-level detection
4. **Create audit trail** — Intent → proposal → decision → outcome
5. **Demo the flow** — Allow → Block → Detect → Alert

**Timeline:** 2-3 days for hackathon submission
**Risk:** Medium — viable but not revolutionary
**Reward:** $20k-40k if executed well
