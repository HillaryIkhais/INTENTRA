# INTENTRA API Server

REST API + Swagger documentation for INTENTRA — the authority enforcement layer between agents and execution.

## Quick Start

```bash
npm run api
```

The server starts on `http://localhost:8080`.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI documentation |
| `/sessions` | POST | Create a session (time-boxed authority) |
| `/sessions` | GET | List all sessions |
| `/sessions/:id` | GET | Get a session |
| `/sessions/:id` | POST | Revoke a session |
| `/sessions/:id/compile` | POST | Compile a proposal against intent |
| `/sessions/:id/revocations` | GET | Get revocation history |
| `/validate-sub-authority` | POST | Validate sub-agent authority narrowing |
| `/receipts` | GET | List all receipts |
| `/receipts/:planId` | GET | Get a receipt |

## API Flow

### 1. Create a Session

```bash
curl -X POST http://localhost:8080/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-alpha",
    "intentText": "Buy BTC only. Max $100 per order. Max $200 per day.",
    "durationMs": 3600000
  }'
```

Response:
```json
{
  "success": true,
  "session": {
    "sessionId": "ses_abc123",
    "agentId": "agent-alpha",
    "intentText": "Buy BTC only. Max $100 per order. Max $200 per day.",
    "status": "active",
    "createdAt": "2026-09-03T...",
    "expiresAt": "2026-09-03T...",
    "proposalsEvaluated": 0,
    "totalAllowedUsd": 0,
    "totalBlocked": 0
  }
}
```

### 2. Compile a Proposal

```bash
curl -X POST http://localhost:8080/sessions/ses_abc123/compile \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": "Buy $90 BTC"
  }'
```

Response:
```json
{
  "success": true,
  "plan": {
    "planId": "plan_xyz789",
    "status": "ALLOWED",
    "violations": [],
    "reasons": [
      "All actions are authorized",
      "BTC is an allowed asset"
    ],
    "totalValueUsd": 90,
    "actions": [
      { "actionType": "buy", "asset": "BTC", "amountUsd": 90, "isAllowed": true }
    ],
    "sessionId": "ses_abc123"
  }
}
```

### 3. Check if Blocked

```bash
curl -X POST http://localhost:8080/sessions/ses_abc123/compile \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": "Increase my daily limit to $500"
  }'
```

Response:
```json
{
  "success": true,
  "plan": {
    "status": "BLOCKED",
    "violations": [{
      "violationType": "POLICY_MUTATION",
      "description": "Agent is attempting to modify policy parameters",
      "severity": "critical"
    }]
  }
}
```

### 4. Revoke a Session

```bash
curl -X POST http://localhost:8080/sessions/ses_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "revokedBy": "human",
    "reason": "Session no longer needed"
  }'
```

### 5. Validate Sub-Agent Authority

```bash
curl -X POST http://localhost:8080/validate-sub-authority \
  -H "Content-Type: application/json" \
  -d '{
    "parentIntent": "Buy BTC. Max $100 per order. Max $200 per day.",
    "subIntent": "Buy BTC. Max $50 per order."
  }'
```

Response:
```json
{
  "success": true,
  "result": {
    "isNarrowing": true,
    "violations": []
  }
}
```

## Swagger UI

Open `http://localhost:8080/docs` in your browser to:
- Browse all endpoints
- See request/response schemas
- Execute test requests directly in the browser

## The Invariant

```
Authority can only narrow. Never widen.
```

A sub-agent's authority cannot exceed its parent's.
