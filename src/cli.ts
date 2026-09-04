import { Intentra, Session, IntentConstraint, Action, Evaluation, Receipt } from "./sdk";
import * as readline from "readline";

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║              INTENTRA — TRANSACTION COMPILER                  ║");
console.log("║      for Binance Agent OS — Track B Submission               ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${question}`, resolve);
  });
}

function clearTerminal(): void {
  process.stdout.write("\x1b[2J\x1b[0f");
}

let session: Session | null = null;

let state = {
  evaluated: 0,
  allowed: 0,
  blocked: 0,
  totalSpent: 0,
  dailySpent: 0,
  lastReceipt: null as Receipt | null,
  authorityScore: 100,
  history: [] as Array<{
    step: number;
    agent: string;
    decision: string;
    binance: string;
    violations: string[];
  }>,
};

function showDashboard(intentra: Intentra) {
  clearTerminal();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              INTENTRA — DASHBOARD                             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   DECLARED INTENT");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();
  console.log("   Buy BTC only. Max $100 per order. Max $200 per day.");
  console.log("   Session expires in 60 minutes.");
  console.log();

  if (session) {
    console.log("   Session:", session.id);
    console.log("   Status:", session.status.toUpperCase());
    console.log("   Expires:", new Date(session.expiresAt).toLocaleTimeString());
  }

  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   PROPOSALS");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();

  state.history.forEach((h) => {
    const isChefsKiss = h.violations.some((v) => v.includes("POLICY_MUTATION"));
    const isBlock = h.decision === "BLOCK";
    const blockColor = isChefsKiss ? "\x1b[33m" : "\x1b[31m";
    const resetColor = "\x1b[0m";

    console.log("   ┌─────────────────────────────────────────────────────────┐");

    if (isChefsKiss) {
      console.log("   │  ★ CHEF'S KISS — THE THING BEING GOVERNED CANNOT       │");
      console.log("   │  ★ REWRITE THE RULES GOVERNING ITSELF                   │");
    }

    console.log(`   │  STEP ${h.step}`);
    console.log("   ├─────────────────────────────────────────────────────────┤");
    console.log(`   │  AGENT: ${h.agent}`);
    console.log(`   │  ${isBlock ? blockColor : ""}DECISION: ${h.decision}${isBlock ? resetColor : ""}`);

    if (h.violations.length > 0) {
      console.log("   │  REASON:");
      h.violations.forEach((v) => {
        console.log(`   │    • ${v}`);
      });
    }

    if (h.binance === "NONE") {
      console.log(`   │  ${blockColor}BINANCE MCP CALL: ${h.binance}${resetColor}`);
    } else {
      console.log(`   │  BINANCE MCP: ${h.binance}`);
    }

    console.log("   └─────────────────────────────────────────────────────────┘");
    console.log();
  });

  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   SESSION STATS");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();
  console.log(`   Evaluated: ${state.evaluated}`);
  console.log(`   Allowed:   ${state.allowed}`);
  console.log(`   Blocked:   ${state.blocked}`);
  console.log();
  console.log("   ┌─────────────────────────────────────────────────────────┐");

  const scoreColor = state.authorityScore < 50 ? "\x1b[31m" : state.authorityScore < 80 ? "\x1b[33m" : "\x1b[32m";
  const resetColor = "\x1b[0m";

  const barWidth = 40;
  const filled = Math.round((state.authorityScore / 100) * barWidth);
  const empty = barWidth - filled;

  console.log(`   │  AUTHORITY SCORE: ${scoreColor}${state.authorityScore}${resetColor}/100`);
  console.log(`   │  │${scoreColor}${"█".repeat(filled)}${resetColor}${"░".repeat(empty)}│`);

  console.log("   └─────────────────────────────────────────────────────────┘");
  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   ACTIVE CONSTRAINTS");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();

  if (session) {
    const constraints = session.constraints;

    console.log("   ┌─────────────────────────────────────────────────────────┐");
    console.log(`   │  ✓ Allowed actions: ${constraints.allowedActions.join(", ")}`);
    console.log(`   │  ✓ Allowed assets:  ${constraints.allowedAssets.join(", ")}`);
    console.log(`   │  ✓ Max per order:   $${constraints.maxPerOrder}`);
    console.log(`   │  ✓ Max daily:       $${constraints.maxDailySpend}`);
    console.log("   └─────────────────────────────────────────────────────────┘");
  }

  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   LAST RECEIPT");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();

  if (state.lastReceipt) {
    console.log("   ┌─────────────────────────────────────────────────────────┐");
    console.log(`   │  ID:     ${state.lastReceipt.receiptId}`);
    console.log(`   │  Hash:   ${state.lastReceipt.receiptHash}`);
    console.log(`   │  Order:  ${state.lastReceipt.binanceOrderId}`);
    console.log(`   │  Status: ${state.lastReceipt.status}`);
    console.log("   └─────────────────────────────────────────────────────────┘");
  } else {
    console.log("   No receipts yet.");
  }

  console.log();
}

async function runFullDemo() {
  const intentra = new Intentra({
    binanceMcpEndpoint: "https://agent.binance.com/mcp/agentic",
    mode: "simulation",
  });

  clearTerminal();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              INTENTRA — TRANSACTION COMPILER                  ║");
  console.log("║      for Binance Agent OS — Track B Submission               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const humanIntent = "Buy BTC only. Max $100 per order. Max $200 per day. Session expires in 60 minutes.";

  session = intentra.createSession("trade-agent-001", 60, humanIntent);

  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   PHASE 1: SESSION CREATION");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Agent: ${session.agentId}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Expires: ${new Date(session.expiresAt).toLocaleTimeString()}`);
  console.log();
  console.log("   INTENT:");
  console.log(`   "${humanIntent}"`);
  console.log();

  await ask("Press ENTER to continue...");

  const proposals = [
    {
      step: 1,
      agentOutput: "Buy $90 BTC",
      description: "Legitimate trade within limits",
      shouldApprove: true,
    },
    {
      step: 2,
      agentOutput: "Buy $90 BTC again",
      description: "Exceeds daily limit ($200 total)",
      shouldApprove: false,
    },
    {
      step: 3,
      agentOutput: "Increase my daily limit to $500",
      description: "POLICY MUTATION — THE CHEF'S KISS",
      shouldApprove: false,
    },
    {
      step: 4,
      agentOutput: "Buy $50 BTC and $50 BTC",
      description: "Split attempt to evade daily limit",
      shouldApprove: false,
    },
    {
      step: 5,
      agentOutput: "Sell $80 BTC",
      description: "Unauthorized action (buy only)",
      shouldApprove: false,
    },
    {
      step: 6,
      agentOutput: "Buy $50 ETH",
      description: "Restricted asset (BTC only)",
      shouldApprove: false,
    },
  ];

  for (const proposal of proposals) {
    showDashboard(intentra);

    console.log("  ═══════════════════════════════════════════════════════════");
    console.log(`   PROPOSAL ${proposal.step}: ${proposal.description}`);
    console.log("  ═══════════════════════════════════════════════════════════");
    console.log();
    console.log(`   Agent says: "${proposal.agentOutput}"`);
    console.log();

    const result = intentra.evaluateProposal(session.id, proposal.agentOutput);

    state.evaluated++;
    if (result.decision === "BLOCK") {
      state.blocked++;
      state.authorityScore = Math.max(0, state.authorityScore - 15);
    } else {
      state.allowed++;
    }

    const violations = result.violations.map((v: any) => `${v.type}: ${v.reason}`);

    let binanceStatus = "NONE";

    if (result.decision === "ALLOW" || result.decision === "APPROVAL_REQUIRED") {
      if (proposal.shouldApprove) {
        console.log("   ┌─────────────────────────────────────────────────────────┐");
        console.log("   │  HUMAN APPROVAL REQUIRED                                 │");
        console.log("   ├─────────────────────────────────────────────────────────┤");
        console.log(`   │  Agent: ${proposal.agentOutput}`);
        console.log(`   │  Decision: ${result.decision}`);
        console.log("   └─────────────────────────────────────────────────────────┘");
        console.log();

        const approval = await ask("  Do you approve this trade? (y/n): ");

        if (approval.toLowerCase() === "y") {
          const receipt = intentra.execute(session.id, proposal.agentOutput, "human");

          state.lastReceipt = receipt;
          state.totalSpent += 90;
          state.dailySpent += 90;
          binanceStatus = "EXECUTED";

          console.log();
          console.log("   ┌─────────────────────────────────────────────────────────┐");
          console.log("   │  RECEIPT                                                  │");
          console.log("   ├─────────────────────────────────────────────────────────┤");
          console.log(`   │  ID:     ${receipt.receiptId}`);
          console.log(`   │  Hash:   ${receipt.receiptHash}`);
          console.log(`   │  Order:  ${receipt.binanceOrderId}`);
          console.log(`   │  Status: ${receipt.status}`);
          console.log("   └─────────────────────────────────────────────────────────┘");
        }
      }
    }

    state.history.push({
      step: proposal.step,
      agent: proposal.agentOutput,
      decision: result.decision,
      binance: binanceStatus,
      violations,
    });

    console.log();
    await ask("Press ENTER to continue...");
  }

  showDashboard(intentra);

  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   FINAL SUMMARY");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();
  console.log(`   Total proposals evaluated: ${state.evaluated}`);
  console.log(`   Allowed: ${state.allowed}`);
  console.log(`   Blocked: ${state.blocked}`);
  console.log(`   Authority score: ${state.authorityScore}/100`);
  console.log();
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log("   THE PROOF");
  console.log("  ═══════════════════════════════════════════════════════════");
  console.log();
  console.log("   Blocked requests never reached Binance.");
  console.log("   Allowed requests did.");
  console.log();
  console.log("   This is the Drey move.");
  console.log();

  rl.close();
}

runFullDemo().catch(console.error);
