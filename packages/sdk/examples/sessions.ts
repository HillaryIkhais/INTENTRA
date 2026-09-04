import { IntentraSDK } from "../src/index.js";

console.log("=" .repeat(70));
console.log("INTENTRA SDK - SESSION MANAGEMENT EXAMPLE");
console.log("=" .repeat(70));

const client = new IntentraSDK();

console.log("\n[1] Creating session with 1 hour expiry...");
const intent = "Buy BTC only. Max $100 per order. Max $500 per day.";
const sessionResult = client.createSession(intent, "3600000");
console.log(`Session ID: ${sessionResult.sessionId}`);
console.log(`Created at: ${new Date(sessionResult.createdAt).toLocaleString()}`);
console.log(`Expires at: ${new Date(sessionResult.expiresAt).toLocaleString()}`);
console.log(`Time remaining: ${client.getSessionTimeRemaining(sessionResult.sessionId)}ms`);

console.log("\n[2] Validating against session...");
const validation = client.validate("Buy $90 BTC", sessionResult.sessionId);
console.log(`Decision: ${validation.decision}`);
console.log(`Allowed: ${validation.allowed}`);

console.log("\n[3] Creating another session with 1 minute expiry...");
const session2 = client.createSession(
  "Buy ETH up to $50 per order",
  "60000"
);
console.log(`Session 2 ID: ${session2.sessionId}`);
console.log(`Expires in: ${client.getSessionTimeRemaining(session2.sessionId)}ms`);

console.log("\n[4] Checking if sessions are valid...");
console.log(`Session 1 valid: ${client.isSessionValid(sessionResult.sessionId)}`);
console.log(`Session 2 valid: ${client.isSessionValid(session2.sessionId)}`);

console.log("\n[5] Revoking session 2...");
const revoked = client.revokeSession(session2.sessionId);
console.log(`Revoked: ${revoked}`);
console.log(`Session 2 valid after revoke: ${client.isSessionValid(session2.sessionId)}`);

console.log("\n[6] Demonstrating authority with session context...");
const agentId = "trading-agent-001";
const agentSessionId = "session-agent-001";

client.registerAuthority(
  agentId,
  "Buy BTC up to $200 per day",
  undefined,
  agentSessionId
);

const agentAuthority = client.getAuthority(agentId, agentSessionId);
console.log(`Agent authority registered: ${!!agentAuthority}`);
console.log(`Session bound to authority: ${agentAuthority?.sessionId}`);

console.log("\n" + "=" .repeat(70));
console.log("SESSION MANAGEMENT EXAMPLE COMPLETE");
console.log("=" .repeat(70));
