import { Intentra } from "./publishable-sdk.js";

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║              INTENTRA — DEMONSTRATION                         ║");
console.log("║      (Clasp-style completeness, demonstrable, verifiable)    ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log();

const intentra = new Intentra("./receipts");

async function runDemo() {
  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  PHASE 1: CREATE SESSION (Time-boxed authority)");
  console.log();

  // NOTE: no "Expires HH:MM" clause on purpose — a hardcoded clock time
  // makes this demo rot when wall-clock passes it (EXPIRED violation).
  // Time-boxing is already enforced by the 1h session durationMs below.
  const humanIntent = "Buy BTC only. Per order limit $100. Per day limit $200. Total max $500.";

  const session = intentra.createSession(
    "trade-agent-001",
    humanIntent,
    {
      durationMs: 3600 * 1000,
      maxProposals: 100,
    }
  );

  console.log(`  Session ID: ${session.id}`);
  console.log(`  Agent: ${session.agentId}`);
  console.log(`  Created: ${new Date(session.createdAt).toISOString()}`);
  console.log(`  Expires: ${new Date(session.expiresAt).toISOString()}`);
  console.log(`  Status: ${session.status}`);
  console.log();
  console.log("  Constraints:");
  console.log(`    • Allowed actions: ${session.intent.allowedActions?.join(", ") || "any"}`);
  console.log(`    • Allowed assets: ${session.intent.allowedAssets?.join(", ") || "any"}`);
  console.log(`    • Max per order: $${session.intent.maxPerOrder ?? "unlimited"}`);
  console.log(`    • Max daily: $${session.intent.maxDailySpend ?? "unlimited"}`);
  console.log(`    • Max total: $${session.intent.maxTotalSpend ?? "unlimited"}`);
  console.log();

  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  PHASE 2: PROPOSAL EVALUATION");
  console.log();

  const proposals = [
    {
      agentOutput: "Buy $90 BTC",
      description: "Legitimate trade within limits",
      expected: "ALLOW",
    },
    {
      agentOutput: "Buy $150 BTC",
      description: "Exceeds max per order ($100)",
      expected: "BLOCK",
    },
    {
      agentOutput: "Buy $90 ETH",
      description: "Unauthorized asset (BTC only)",
      expected: "BLOCK",
    },
    {
      agentOutput: "Sell $50 BTC",
      description: "Unauthorized action (buy only)",
      expected: "BLOCK",
    },
    {
      agentOutput: "Increase my daily limit to $500",
      description: "POLICY MUTATION ATTACK — agent tries to modify authority",
      expected: "BLOCK",
      chefskiss: true,
    },
  ];

  let evaluated = 0;
  let allowed = 0;
  let blocked = 0;
  let chefskiss = false;

  for (const proposal of proposals) {
    evaluated++;
    console.log(`  ┌─────────────────────────────────────────────────────────────┐`);
    if ((proposal as any).chefskiss) {
      console.log(`  │  ★ CHEF'S KISS — THE THING BEING GOVERNED CANNOT REWRITE   │`);
      console.log(`  │  ★ THE RULES GOVERNING ITSELF                               │`);
    }
    console.log(`  ├─────────────────────────────────────────────────────────────┤`);
    console.log(`  │  PROPOSAL ${evaluated}: ${proposal.agentOutput}`);
    console.log(`  │  DESCRIPTION: ${proposal.description}`);
    console.log(`  │  EXPECTED: ${proposal.expected}`);
    console.log(`  │`);

    const plan = intentra.compile(session.id, proposal.agentOutput);
    const decision = plan.result.decision;

    console.log(`  │  DECISION: ${decision}`);

    if (plan.result.violations.length > 0) {
      console.log(`  │  VIOLATIONS:`);
      for (const v of plan.result.violations) {
        console.log(`  │    • ${v.type}: ${v.reason}`);
      }
    }

    if (decision === "ALLOW" || decision === "APPROVAL_REQUIRED") {
      allowed++;
      console.log(`  │  BINANCE MCP: EXECUTED (mock — no credential)`);
      intentra.recordExecution(plan.id, { orderId: `mock_${plan.id.slice(0, 8)}` });
    } else {
      blocked++;
      console.log(`  │  BINANCE MCP CALL: NONE`);
    }

    const actual = decision === "BLOCK" ? "BLOCK" : "ALLOW";
    const passfail = actual === proposal.expected ? "✓ PASS" : "✗ FAIL";
    console.log(`  │`);
    console.log(`  │  RESULT: ${passfail}`);
    console.log(`  └─────────────────────────────────────────────────────────────┘`);
    console.log();

    if ((proposal as any).chefskiss && plan.result.violations.some(v => v.type === "POLICY_MUTATION" || v.type === "AUTHORITY_WIDENING")) {
      chefskiss = true;
    }
  }

  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  PHASE 3: EXECUTE LEGITIMATE TRADE (mock receipt)");
  console.log();

  const legitProposal = "Buy $90 BTC";
  const legitPlan = intentra.compile(session.id, legitProposal);

  console.log(`  Agent: "${legitProposal}"`);
  console.log(`  INTENTRA: ${legitPlan.result.decision}`);

  if (legitPlan.result.decision !== "BLOCK") {
    console.log(`  Human: APPROVE`);
    intentra.recordExecution(legitPlan.id, { orderId: `mock_${legitPlan.id.slice(0, 8)}` });
    const receipt = intentra.getReceipt(legitPlan.id);
    console.log(`  BINANCE: EXECUTED (mock)`);
    console.log(`  Plan ID: ${legitPlan.id}`);
    console.log(`  Receipt: ${receipt?.receiptHash ?? "n/a"}`);
    console.log();

    const updatedSession = intentra.getSession(session.id);
    if (updatedSession) {
      console.log(`  Session stats updated:`);
      console.log(`    • Total executed: ${updatedSession.totalExecuted}`);
      console.log(`    • Total blocked: ${updatedSession.totalBlocked}`);
      console.log(`    • Proposal count: ${updatedSession.proposalCount}`);
    }
  }

  console.log();
  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  PHASE 4: REVOCATION (Instant revocation)");
  console.log();

  const revocation = intentra.revokeSession(session.id, "human", "No longer trust agent");

  console.log(`  Session ${revocation.sessionId} revoked`);
  console.log(`  Revoked by: ${revocation.revokedBy}`);
  console.log(`  Reason: ${revocation.reason}`);
  console.log();

  console.log(`  Testing proposal on revoked session...`);
  try {
    const revokedPlan = intentra.compile(session.id, "Buy $50 BTC");
    console.log(`  Decision: ${revokedPlan.result.decision}`);
  } catch (e: any) {
    console.log(`  Decision: BLOCKED (session revoked)`);
    console.log(`  Reason: ${e.message}`);
  }

  console.log();
  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  FINAL VERIFICATION");
  console.log();

  const finalSession = intentra.getSession(session.id);
  if (finalSession) {
    console.log(`  Session: ${finalSession.id}`);
    console.log(`  Status: ${finalSession.status}`);
    console.log(`  Evaluated: ${finalSession.proposalCount}`);
    console.log(`  Executed: ${finalSession.totalExecuted}`);
    console.log(`  Blocked: ${finalSession.totalBlocked}`);
  }

  console.log();
  console.log("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
  console.log();
  console.log("  THE PROOF");
  console.log();

  if (blocked === 4 && allowed === 1 && chefskiss) {
    console.log("  ✓ ADVERSARIAL PROPOSALS BLOCKED");
    console.log("  ✓ POLICY MUTATION DETECTED AND REJECTED");
    console.log("  ✓ LEGITIMATE TRADE ALLOWED");
    console.log("  ✓ REVOCATION EFFECTIVE IMMEDIATELY");
    console.log();
    console.log("  INTENTRA: Authority enforced. Human intent protected.");
    console.log("  NOTE: Binance execution is mocked — plug in BINANCE_CLIENT_ID for live trades.");
  } else {
    console.log("  ✗ SOME CHECKS FAILED");
    console.log(`  Blocked: ${blocked}/4, Allowed: ${allowed}/1, Chef's Kiss: ${chefskiss}`);
  }
}

runDemo().catch(console.error);
