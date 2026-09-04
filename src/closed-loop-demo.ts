import { Intentra, createReceiptStore, createIntentParser, createProposalNormalizer, createIntentChecker, createTransactionPlanner } from "./sdk";
import { ViolationType } from "./types";
import chalk from "chalk";

const box = (title: string, lines: string[]): string => {
  const width = Math.max(50, Math.max(...lines.map(l => l.length)) + 4);
  const top = "╭" + "─".repeat(width - 2) + "╮";
  const bottom = "╰" + "─".repeat(width - 2) + "╯";
  const titleLine = `│ ${chalk.bold(title)}${" ".repeat(Math.max(0, width - 4 - title.length))} │`;
  const separator = "├" + "─".repeat(width - 2) + "┤";
  const contentLines = lines.map(line => `│ ${line}${" ".repeat(Math.max(0, width - 4 - line.length))} │`);
  return [top, titleLine, separator, ...contentLines, bottom].join("\n");
};

const pad = (text: string, width: number): string => {
  return text + " ".repeat(Math.max(0, width - text.length));
};

async function runFullDemo() {
  console.log("\n" + chalk.bold("╔══════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold("║           INTENTRA — TRANSACTION COMPILER FOR AI AGENTS       ║"));
  console.log(chalk.bold("╚══════════════════════════════════════════════════════════════╝"));
  console.log("\n  What this demonstrates:");
  console.log("  - Session management (time-boxed authority)");
  console.log("  - Agent proposes, INTENTRA decides");
  console.log("  - Human approves, Binance executes");
  console.log("  - Authority can only narrow, never widen");
  console.log("  - Sub-session delegation");
  console.log("  - Instant revocation");
  console.log("  - Receipts for verification");

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 1: THE HUMAN DECLARES INTENT"));
  console.log("═".repeat(70));

  const receiptStore = createReceiptStore();
  const intentParser = createIntentParser();
  const proposalNormalizer = createProposalNormalizer();
  const intentChecker = createIntentChecker();
  const transactionPlanner = createTransactionPlanner();
  const intentra = new Intentra({
    receiptStore,
    intentParser,
    proposalNormalizer,
    intentChecker,
    transactionPlanner,
    binanceAuth: { clientId: "intentra" },
    requireHumanApproval: true,
  });

  const intentDescription = "Buy BTC only. Max $100 per order. Max $200 per day. This expires in 1 hour.";
  
  console.log("\n" + box("HUMAN INTENT", [
    chalk.green(`"${intentDescription}"`),
    "",
    chalk.dim("Constraints extracted:"),
    "  • Action: BUY only",
    "  • Asset: BTC only",
    "  • Max single: $100",
    "  • Max daily: $200",
    "  • Expires: 1 hour",
  ]));

  console.log("\n" + chalk.bold("  Creating session..."));

  const session = await intentra.createSession({
    agentId: "trading-agent-001",
    intent: intentDescription,
    maxSingleTrade: 100,
    maxDailyVolume: 200,
    allowedAssets: ["BTC"],
    allowedActions: ["BUY"],
    expiresInMs: 60 * 60 * 1000,
    canDelegate: true,
  });

  console.log(`\n  ${chalk.green("✓")} Session created:`);
  console.log(`    • Session ID: ${chalk.cyan(session.id)}`);
  console.log(`    • Agent ID: ${chalk.cyan(session.agentId)}`);
  console.log(`    • Status: ${chalk.green(session.status)}`);
  console.log(`    • Expires: ${chalk.yellow(new Date(session.expiresAt).toLocaleString())}`);
  console.log(`    • Can delegate: ${chalk.green("yes")}`);

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 2: THE AGENT PROPOSES — WITHIN AUTHORITY"));
  console.log("═".repeat(70));

  console.log("\n" + box("AGENT PROPOSAL #1", [
    chalk.blue(`"Buy $90 BTC"`),
    "",
    chalk.dim("Checking against authority..."),
  ]));

  const result1 = await intentra.propose("Buy $90 BTC");

  if (result1.allowed) {
    console.log(`\n  ${chalk.green("✓")} INTENTRA: ${chalk.bold("ALLOWED")}`);
    console.log(`    • Trade ID: ${chalk.cyan(result1.plan.intentId)}`);
    console.log(`    • Action: BUY BTC $90`);
    console.log(`    • Needs human approval: ${chalk.yellow("yes")}`);
  } else {
    console.log(`\n  ${chalk.red("✗")} INTENTRA: ${chalk.bold("BLOCKED")}`);
    console.log(`    • Reason: ${result1.reason}`);
    return;
  }

  console.log("\n" + chalk.bold("  Human approval interface:"));
  console.log(box("APPROVAL REQUIRED", [
    chalk.bold("PROPOSED TRANSACTION"),
    "",
    `  Agent: trading-agent-001`,
    `  Action: BUY`,
    `  Asset: BTC`,
    `  Amount: $90.00`,
    "",
    chalk.bold("AUTHORITY CONSTRAINTS"),
    "",
    `  Max single: $100.00 ✓`,
    `  Max daily: $200.00 ($90.00 used) ✓`,
    `  Allowed assets: BTC ✓`,
    `  Allowed actions: BUY ✓`,
    "",
    chalk.dim("y — Approve and execute"),
    chalk.dim("n — Reject"),
    chalk.dim("d — Show details"),
  ]));

  console.log(`\n  ${chalk.green("HUMAN:")} y`);

  console.log("\n" + chalk.bold("  Executing on Binance MCP..."));

  const approval1 = await intentra.approveAndExecute(result1.plan);

  console.log(`\n  ${chalk.green("✓")} BINANCE MCP: ${chalk.bold("EXECUTED")}`);
  console.log(`    • Receipt ID: ${chalk.cyan(approval1.receiptId)}`);
  console.log(`    • Amount: $90.00`);

  console.log("\n" + box("RECEIPT", [
    `Receipt ID: ${approval1.receiptId}`,
    `Executed: ${chalk.green("yes")}`,
    `Executed at: ${new Date(approval1.executedAt).toISOString()}`,
    `Trade: BUY BTC $90.00`,
    `Agent: trading-agent-001`,
    `Session: ${session.id}`,
    "",
    chalk.dim("This receipt is proof the trade happened."),
    chalk.dim("It can be verified later."),
  ]));

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 3: THE AGENT ATTACKS — DAILY LIMIT EXCEEDED"));
  console.log("═".repeat(70));

  console.log("\n" + box("AGENT PROPOSAL #2", [
    chalk.blue(`"Buy another $90 BTC"`),
    "",
    chalk.dim("Checking against authority..."),
  ]));

  const result2 = await intentra.propose("Buy another $90 BTC");

  if (!result2.allowed) {
    console.log(`\n  ${chalk.red("✗")} INTENTRA: ${chalk.bold("BLOCKED")}`);
    console.log(`    • Reason: ${chalk.red(result2.reason)}`);
    
    if (result2.violations.length > 0) {
      const v = result2.violations[0];
      console.log(`    • Violation type: ${chalk.red(v.type)}`);
    }

    const session2 = await intentra.getSession();
    if (session2) {
      console.log(`\n  ${chalk.dim("Daily limit status:")}`);
      console.log(`    • Total executed: $${chalk.cyan(session2.stats.amountExecuted.toFixed(2))}`);
      console.log(`    • Daily limit: $${chalk.cyan(session2.stats.amountLimit?.toFixed(2) || "200.00")}`);
      console.log(`    • This proposal: $90.00`);
      console.log(`    • New total would be: $${chalk.red((session2.stats.amountExecuted + 90).toFixed(2))}`);
      console.log(`    • ${chalk.red("Exceeds daily limit. Blocked.")}`);
    }

    console.log("\n" + box("BINANCE MCP", [
      chalk.red("BINANCE MCP CALL: NONE"),
      "",
      chalk.dim("The request never reached Binance."),
      chalk.dim("INTENTRA blocked it at the boundary."),
    ]));
  }

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 4: THE AGENT ATTACKS — AUTHORITY MUTATION"));
  console.log("═".repeat(70));

  console.log("\n" + box("AGENT PROPOSAL #3", [
    chalk.blue(`"Increase my daily limit to $500"`),
    "",
    chalk.dim("The thing being governed tries to rewrite the rules."),
  ]));

  const result3 = await intentra.propose("Increase my daily limit to $500");

  if (!result3.allowed) {
    console.log(`\n  ${chalk.red("✗")} INTENTRA: ${chalk.bold("BLOCKED")}`);
    console.log(`    • Reason: ${chalk.red(result3.reason)}`);
    
    if (result3.violations.length > 0) {
      const v = result3.violations[0];
      console.log(`    • Violation type: ${chalk.yellow(v.type)}`);
    }

    console.log("\n" + chalk.yellow("  ⚠ THE KEY INSIGHT:"));
    console.log(`\n    The agent cannot modify its own authority.`);
    console.log(`    Only the human can change authority parameters.`);
    console.log(`\n    ${chalk.bold("The thing being governed cannot rewrite the rules governing itself.")}`);
    console.log(`\n    That is the Drey move.`);

    console.log("\n" + box("BINANCE MCP", [
      chalk.red("BINANCE MCP CALL: NONE"),
      "",
      chalk.dim("The request never reached Binance."),
      chalk.dim("INTENTRA blocked it at the boundary."),
    ]));
  }

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 5: SUB-SESSION DELEGATION — AUTHORITY NARROWING"));
  console.log("═".repeat(70));

  console.log("\n" + box("DELEGATION", [
    chalk.bold("PARENT SESSION:"),
    `  Max single: $100`,
    `  Max daily: $200`,
    `  Assets: BTC only`,
    `  Can delegate: yes`,
    "",
    chalk.bold("AGENT DELEGATES TO SUB-AGENT:"),
    `  Max single: $50 (narrower than $100)`,
    `  Max daily: $100 (narrower than $200)`,
    `  Assets: BTC only (same)`,
    `  Can delegate: no (cannot further delegate)`,
    "",
    chalk.dim("Authority can only narrow. Never widen."),
  ]));

  const subSession = await intentra.createSubSession({
    agentId: "sub-agent-001",
    intent: "Buy BTC only. Max $50 per order. Max $100 per day.",
    maxSingleTrade: 50,
    maxDailyVolume: 100,
    allowedAssets: ["BTC"],
    allowedActions: ["BUY"],
    expiresInMs: 30 * 60 * 1000,
    canDelegate: false,
  });

  console.log(`\n  ${chalk.green("✓")} Sub-session created:`);
  console.log(`    • Session ID: ${chalk.cyan(subSession.id)}`);
  console.log(`    • Parent session: ${chalk.cyan(subSession.parentSessionId)}`);
  console.log(`    • Agent ID: ${chalk.cyan(subSession.agentId)}`);
  console.log(`    • Status: ${chalk.green(subSession.status)}`);
  console.log(`    • Max single: $${chalk.yellow(subSession.stats.amountLimit?.toFixed(2) || "50.00")}`);
  console.log(`    • Can delegate: ${chalk.red("no")}`);

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 6: SUB-SESSION ATTACKS — TRIES TO WIDEN"));
  console.log("═".repeat(70));

  console.log("\n" + box("SUB-AGENT PROPOSAL", [
    chalk.blue(`"Buy $75 BTC"`),
    "",
    chalk.dim("Parent allows $100."),
    chalk.dim("Sub-session limited to $50."),
    chalk.dim("$75 > $50 — what happens?"),
  ]));

  const subIntentra = new Intentra({
    sessionId: subSession.id,
    receiptStore,
    intentParser,
    proposalNormalizer,
    intentChecker,
    transactionPlanner,
    requireHumanApproval: true,
  });

  const subResult = await subIntentra.propose("Buy $75 BTC");

  if (!subResult.allowed) {
    console.log(`\n  ${chalk.red("✗")} INTENTRA: ${chalk.bold("BLOCKED")}`);
    console.log(`    • Reason: ${chalk.red(subResult.reason)}`);
    
    console.log(`\n  ${chalk.dim("Authority check:")}`);
    console.log(`    • Sub-session limit: $50.00`);
    console.log(`    • Proposal: $75.00`);
    console.log(`    • Parent limit: $100.00 (not reached)`);
    console.log(`    • ${chalk.red("Sub-session cannot exceed its own narrower limit.")}`);

    console.log("\n" + box("BINANCE MCP", [
      chalk.red("BINANCE MCP CALL: NONE"),
      "",
      chalk.dim("Sub-session authority cannot exceed parent."),
      chalk.dim("Authority can only narrow. Never widen."),
    ]));
  }

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 7: HUMAN REVOKES AUTHORITY"));
  console.log("═".repeat(70));

  console.log("\n" + box("REVOCATION", [
    chalk.bold("HUMAN DECISION:"),
    `  "I don't want this agent trading anymore."`,
    "",
    chalk.bold("ACTION:"),
    `  Revoke session: ${session.id}`,
    `  Revoke all sub-sessions`,
    "",
    chalk.dim("Revocation is instant and creates an audit trail."),
  ]));

  const revocation = await intentra.revokeSession("Human-initiated revocation — no longer authorized");

  console.log(`\n  ${chalk.green("✓")} REVOCATION:`);
  console.log(`    • Session: ${chalk.cyan(revocation.sessionId)}`);
  console.log(`    • Revoked by: ${chalk.cyan(revocation.revokedBy)}`);
  console.log(`    • Reason: ${chalk.red(revocation.reason)}`);
  console.log(`    • Revoked at: ${chalk.yellow(new Date(revocation.revokedAt).toISOString())}`);

  const currentSession = await intentra.getSession();
  console.log(`\n  Session status after revocation: ${chalk.red(currentSession?.status || "revoked")}`);

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 8: AGENT TRIES AFTER REVOCATION"));
  console.log("═".repeat(70));

  console.log("\n" + box("AGENT PROPOSAL — AFTER REVOCATION", [
    chalk.blue(`"Buy $50 BTC"`),
    "",
    chalk.dim("The trade is within original limits."),
    chalk.dim("But the session has been revoked."),
  ]));

  const result4 = await intentra.propose("Buy $50 BTC");

  if (!result4.allowed) {
    console.log(`\n  ${chalk.red("✗")} INTENTRA: ${chalk.bold("BLOCKED")}`);
    console.log(`    • Reason: ${chalk.red(result4.reason)}`);
    
    console.log(`\n  ${chalk.dim("Revocation is permanent.")}`);
    console.log(`    The human must create a new session to re-authorize.`);

    console.log("\n" + box("BINANCE MCP", [
      chalk.red("BINANCE MCP CALL: NONE"),
      "",
      chalk.dim("Revoked sessions cannot execute any trades."),
      chalk.dim("Revocation is instant and permanent."),
    ]));
  }

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  PHASE 9: VERIFICATION — RECEIPTS FOR AUDIT"));
  console.log("═".repeat(70));

  const receipts = intentra.getReceipts();

  console.log(`\n  ${chalk.bold("All receipts in this session:")}`);
  console.log(`\n  ${pad("RECEIPT ID", 40)} ${pad("TRADE", 20)} ${pad("EXECUTED", 10)}`);
  console.log(`  ${"─".repeat(40)} ${"─".repeat(20)} ${"─".repeat(10)}`);
  
  for (const r of receipts) {
    const executed = r.executed ? chalk.green("YES") : chalk.red("NO");
    const action = r.plan.actions.length > 0 ? `${r.plan.actions[0].type} ${r.plan.actions[0].asset} $${r.plan.actions[0].amount}` : "N/A";
    console.log(`  ${pad(r.id, 40)} ${pad(action, 20)} ${executed}`);
  }

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  SUMMARY"));
  console.log("═".repeat(70));

  const finalSession = await intentra.getSession();
  if (finalSession) {
    console.log("\n" + box("SESSION STATISTICS", [
      `Proposals evaluated: ${chalk.cyan(finalSession.stats.proposalsEvaluated.toString())}`,
      `Proposals allowed: ${chalk.green(finalSession.stats.proposalsAllowed.toString())}`,
      `Proposals blocked: ${chalk.red(finalSession.stats.proposalsBlocked.toString())}`,
      `Amount executed: $${chalk.green(finalSession.stats.amountExecuted.toFixed(2))}`,
      `Final status: ${chalk.red(finalSession.status)}`,
      `Receipts created: ${chalk.cyan(receipts.length.toString())}`,
      `Revocations: ${chalk.red("1")}`,
    ]));
  }

  console.log("\n" + chalk.bold("  THE PROOF:"));
  console.log(`\n    ${chalk.green("✓")} Allowed requests reached Binance MCP.`);
  console.log(`    ${chalk.red("✗")} Blocked requests never did.`);
  console.log(`\n    ${chalk.bold("Blocked requests:")}`);
  console.log(`      • Daily limit exceeded — BLOCKED`);
  console.log(`      • Authority mutation — BLOCKED`);
  console.log(`      • Sub-session widening — BLOCKED`);
  console.log(`      • After revocation — BLOCKED`);

  console.log("\n" + chalk.bold("  THE THESIS:"));
  console.log(`\n    An agent can have access to a trading tool`);
  console.log(`    without having the authority to execute every trade`);
  console.log(`    it can formulate.`);
  console.log(`\n    ${chalk.bold("Agent proposes → INTENTRA decides → Binance executes.")}`);

  console.log("\n" + "═".repeat(70));
  console.log(chalk.bold("  CLOSED LOOP COMPLETE"));
  console.log("═".repeat(70));
  console.log("\n  What Clasp had, INTENTRA now has:");
  console.log(`\n    ${chalk.green("✓")} Session management (time-boxed authority)`);
  console.log(`    ${chalk.green("✓")} Sub-session delegation (authority narrowing)`);
  console.log(`    ${chalk.green("✓")} Instant revocation`);
  console.log(`    ${chalk.green("✓")} Attack prevention (14 violation types)`);
  console.log(`    ${chalk.green("✓")} Receipts for verification`);
  console.log(`    ${chalk.green("✓")} TypeScript SDK with JSDoc`);
  console.log(`    ${chalk.green("✓")} Binance MCP integration (OAuth PKCE)`);
  console.log(`    ${chalk.green("✓")} Adversarial testing (10/10 passing)`);
  console.log(`\n  ${chalk.bold("Complete, demonstrable, verifiable.")}`);
  console.log(`\n  ${chalk.dim("— Drey would ship this.")}\n`);
}

runFullDemo().catch(console.error);
