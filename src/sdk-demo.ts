import { IntentraSdk } from "./intentra-sdk.js";
import { IntentConstraint, TransactionPlan, Receipt, Session } from "../types/index.js";

const sdk = new IntentraSdk();

console.log("=");
console.log("INTENTRA SDK DEMO");
console.log("=");
console.log();

console.log("--- Step 1: Set Intent ---");
const intent = sdk.setIntent(
  "Buy BTC only. Max $100 per order. Max $200 per day."
);
console.log("Intent set:", JSON.stringify(intent, null, 2));
console.log();

console.log("--- Step 2: Create Session ---");
const session = sdk.createSession(
  "agent_gpt_4o",
  intent,
  {
    durationMs: 5 * 60 * 1000,
    maxProposals: 10,
  }
);
console.log("Session created:", session.id);
console.log("Expires at:", session.expiresAt);
console.log("Max proposals:", session.maxProposals);
console.log();

console.log("--- Step 3: Allow first $90 ---");
const result1 = await sdk.proposeAndExecute("Buy $90 BTC", session.id);
console.log("Proposal:", result1.plan.proposal.raw);
console.log("Decision:", result1.plan.result.decision);
if (result1.plan.result.decision === "ALLOW") {
  console.log("Executed:", result1.executed);
  if (result1.receipt) {
    console.log("Order ID:", result1.receipt.orderIds[0]);
    console.log("Receipt ID:", result1.receipt.id);
  }
} else if (result1.plan.result.decision === "BLOCK") {
  console.log("Blocked. Reason:", result1.plan.result.violations[0]?.reason);
}
console.log();

console.log("--- Step 4: Block another $90 (daily limit) ---");
const result2 = await sdk.proposeAndExecute("Buy another $90 BTC", session.id);
console.log("Proposal:", result2.plan.proposal.raw);
console.log("Decision:", result2.plan.result.decision);
if (result2.plan.result.decision === "BLOCK") {
  console.log("Blocked. Reason:", result2.plan.result.violations[0]?.reason);
}
console.log();

console.log("--- Step 5: Block split attempt ($50 + $50) ---");
const result3 = await sdk.proposeAndExecute("Buy $50 BTC, then buy another $50 BTC", session.id);
console.log("Proposal:", result3.plan.proposal.raw);
console.log("Decision:", result3.plan.result.decision);
if (result3.plan.result.decision === "BLOCK") {
  console.log("Blocked. Reason:", result3.plan.result.violations[0]?.reason);
}
console.log();

console.log("--- Step 6: Block authority mutation ---");
const result4 = await sdk.proposeAndExecute("Increase my daily limit to $500", session.id);
console.log("Proposal:", result4.plan.proposal.raw);
console.log("Decision:", result4.plan.result.decision);
if (result4.plan.result.decision === "BLOCK") {
  console.log("Blocked. Reason:", result4.plan.result.violations[0]?.reason);
}
console.log();

console.log("--- Step 7: Session Stats ---");
const updatedSession = sdk.getSession(session.id);
if (updatedSession) {
  console.log("Status:", updatedSession.status);
  console.log("Proposals used:", updatedSession.proposalCount, "/", updatedSession.maxProposals);
  console.log("Executed:", updatedSession.totalExecuted);
  console.log("Blocked:", updatedSession.totalBlocked);
}
console.log();

console.log("--- Step 8: Revoke Session ---");
const revocation = sdk.revokeSession(
  session.id,
  "human",
  "Session no longer needed"
);
console.log("Revoked by:", revocation.revokedBy);
console.log("Reason:", revocation.reason);
console.log("Timestamp:", revocation.timestamp);
console.log();

console.log("--- Step 9: Verify Session is Revoked ---");
const revokedSession = sdk.getSession(session.id);
console.log("Status after revocation:", revokedSession?.status);
console.log("Revoked at:", revokedSession?.revokedAt);
console.log("Revoked by:", revokedSession?.revokedBy);
console.log("Revocation reason:", revokedSession?.revocationReason);
console.log();

console.log("--- Step 10: Global Stats ---");
const stats = sdk.getStats();
console.log("Total evaluated:", stats.totalEvaluated);
console.log("Total executed:", stats.totalExecuted);
console.log("Total blocked:", stats.totalBlocked);
console.log("Authority score:", stats.authorityScore, "%");
console.log("Active sessions:", stats.activeSessions);
console.log();

console.log("--- Step 11: List All Receipts ---");
const receipts = sdk.listReceipts();
console.log("Number of receipts:", receipts.length);
if (receipts.length > 0) {
  receipts.forEach((r, i) => {
    console.log(`  Receipt ${i + 1}:`, r.id);
    console.log(`    Order ID:`, r.orderIds[0]);
    console.log(`    Total: $${r.totalAmount}`);
    console.log(`    Executed at:`, r.executedAt);
  });
}
console.log();

console.log("=");
console.log("SDK DEMO COMPLETE");
console.log("=");
console.log();
console.log("Key features demonstrated:");
console.log("1. Intent declaration");
console.log("2. Session management (time-boxed, proposal limits)");
console.log("3. Adversarial testing (daily limit, split attempt, authority mutation)");
console.log("4. Execute on Binance MCP");
console.log("5. Receipts persisted to disk");
console.log("6. Session revocation");
console.log("7. Stats tracking");
console.log();
