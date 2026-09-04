import { intentra, IntentraSDK } from "./index.js";

console.log("=" .repeat(70));
console.log("INTENTRA SDK DEMO");
console.log("=" .repeat(70));

const client = new IntentraSDK();
const intent = "Buy BTC only. Max $100 per order. Max $200 per day. Session expires in 1 hour.";

console.log("\n[1] Setting intent...");
client.setIntent(intent);
console.log(`Intent: ${client.getIntent()}`);

console.log("\n[2] Parsing intent...");
const constraints = client.parseIntent(intent);
console.log(`Parsed ${constraints.length} constraints:`);
constraints.forEach((c, i) => {
  const vals = c.values || [];
  console.log(`  ${i + 1}. ${c.type}: ${c.name} = ${vals.length > 0 ? vals.join(", ") : c.value}`);
});

console.log("\n[3] Testing validation...");
const testCases = [
  { label: "Buy $90 BTC", proposal: "Buy $90 BTC" },
  { label: "Buy $90 BTC again (daily limit)", proposal: "Buy $90 BTC. Buy $90 BTC again." },
  { label: "Buy $50 + $50 BTC (split)", proposal: "Buy $50 BTC. Buy $50 BTC." },
  { label: "Buy $50 ETH (unauthorized asset)", proposal: "Buy $50 ETH" },
  { label: "Sell $80 BTC (unauthorized action)", proposal: "Sell $80 BTC" },
  { label: "Increase limit (policy mutation)", proposal: "Increase my daily limit to $500" },
];

for (const tc of testCases) {
  console.log(`\n  Testing: ${tc.label}`);
  const result = client.validate(tc.proposal);
  console.log(`    Decision: ${result.decision}`);
  console.log(`    Allowed: ${result.allowed}`);
  if (result.violations.length > 0) {
    console.log(`    Violations:`);
    result.violations.forEach(v => {
      console.log(`      - ${v.type}: ${v.reason}`);
    });
  }
}

console.log("\n[4] Testing quick check() API...");
const check1 = client.check(intent, "Buy $90 BTC");
console.log(`  "Buy $90 BTC" → ${check1.decision}: ${check1.reason}`);

const check2 = client.check(intent, "Increase my limit to $500");
console.log(`  "Increase limit" → ${check2.decision}: ${check2.reason}`);

console.log("\n[5] Testing simulateAttack() API...");
const attackTypes = [
  "daily_limit",
  "split_evasion",
  "unauthorized_asset",
  "unauthorized_action",
  "policy_mutation",
];

for (const attack of attackTypes) {
  console.log(`\n  Attack: ${attack}`);
  const result = client.simulateAttack(intent, attack);
  console.log(`    Decision: ${result.decision}`);
}

console.log("\n[6] Testing authority registration (with session)...");
const regResult = client.registerAuthority(
  "agent-123",
  "Buy BTC up to $100 per trade, $500 per day",
  undefined,
  "session-abc"
);
console.log(`  Registered agent-123: ${regResult.success}`);

const auth = client.getAuthority("agent-123");
console.log(`  Authority: ${JSON.stringify(auth, null, 2).replace(/\n/g, "\n  ")}`);

console.log("\n[7] Testing sub-authority narrowing...");
const parentId = "parent-agent";
client.registerAuthority(parentId, "Buy BTC up to $500 per day");

const subAgentId = "sub-agent";
const subValid = client.validateSubAuthority(
  parentId,
  subAgentId,
  client.parseIntent("Buy BTC up to $100 per day")
);
console.log(`  Sub-agent ($100/day) is narrower: ${subValid}`);

const subTooWide = client.validateSubAuthority(
  parentId,
  "sub-agent-2",
  client.parseIntent("Buy BTC up to $1000 per day")
);
console.log(`  Sub-agent ($1000/day) is wider: ${subTooWide}`);

console.log("\n[8] Testing revocation...");
console.log(`  agent-123 revoked before: ${client.isAuthorityRevoked("agent-123")}`);
const revoked = client.revokeAuthority("agent-123");
console.log(`  Revoked agent-123: ${revoked}`);
console.log(`  agent-123 revoked after: ${client.isAuthorityRevoked("agent-123")}`);

console.log("\n" + "=" .repeat(70));
console.log("SDK DEMO COMPLETE");
console.log("=" .repeat(70));
