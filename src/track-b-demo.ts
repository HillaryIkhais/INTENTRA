#!/usr/bin/env node

import { IntentraCompiler } from "./core/intentra-compiler.js";
import { ReceiptStore } from "./core/receipt-store.js";
import { ApprovalUI } from "./mcp/approval-ui.js";
import { BinanceClient } from "./mcp/binance-client.js";

/**
 * INTENTRA — Track B Demo (Real Agent OS Execution)
 *
 * Spot + Futures + Convert through INTENTRA → Binance Agent OS MCP.
 * Every trade validated against declared intent before execution.
 */

const compiler = new IntentraCompiler();
const receiptStore = new ReceiptStore("./receipts");

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  INTENTRA — Track B Demo (Real Agent OS)");
  console.log("  Spot + Futures + Convert via Binance Agent OS MCP");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const ui = new ApprovalUI();

  // Authenticate
  console.log("Step 1: Authenticate with Binance Agent OS\n");

  const binance = new BinanceClient({
    clientId: "intentra",
    redirectUri: "http://localhost:3847/callback",
  });

  const authenticated = await binance.authenticate();
  if (!authenticated) {
    console.error("  ✗ Authentication failed.\n");
    ui.close();
    process.exit(1);
  }
  console.log("  ✓ Authenticated with Binance Agent OS\n");

  // Trade categories
  const trades = [
    {
      category: "SPOT TRADE",
      intent: "Buy $100 of BTC spot. Don't sell anything.",
      proposal: "BUY BTC $100",
      symbol: "BTCUSDT",
      leverage: undefined,
    },
    {
      category: "FUTURES TRADE",
      intent: "Open a long BTC futures position with $200. Don't use leverage above 5x.",
      proposal: "BUY BTC $200 LEVERAGE 5x",
      symbol: "BTCUSDT",
      leverage: "5",
    },
    {
      category: "CONVERT TRADE",
      intent: "Convert $150 USDT to ETH. Don't sell anything.",
      proposal: "BUY ETH $150",
      symbol: "ETHUSDT",
      leverage: undefined,
    },
  ];

  let executedCount = 0;
  const results: Array<{ category: string; status: string; orderId?: string }> = [];

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`  CATEGORY ${i + 1}: ${trade.category}`);
    console.log("═══════════════════════════════════════════════════════════════\n");

    console.log(`  Intent: "${trade.intent}"`);
    console.log(`  Proposal: ${trade.proposal}\n`);

    const plan = compiler.compile(trade.intent, trade.proposal);

    ui.displayPlan({
      id: plan.id,
      intent: plan.intent.objective,
      proposal: plan.proposal.actions.map(a => `${a.type} ${a.asset} $${a.amount || 0}`).join("\n"),
      decision: plan.result.decision,
      violations: plan.result.violations.map(v => ({
        action: `${v.action.type} ${v.action.asset}`,
        reason: v.reason,
      })),
      totals: plan.result.totals,
    });

    if (plan.result.decision === "BLOCK") {
      console.log("  INTENTRA: BLOCKED — cannot execute.\n");
      results.push({ category: trade.category, status: "BLOCKED" });
      continue;
    }

    const approved = await ui.askApproval({ totals: plan.result.totals });
    if (!approved) {
      console.log("  Skipped by human.\n");
      results.push({ category: trade.category, status: "SKIPPED" });
      continue;
    }

    try {
      const action = plan.proposal.actions[0];
      const result = await binance.executeTransaction({
        symbol: trade.symbol,
        side: action.type as "BUY" | "SELL",
        type: "MARKET",
        quoteOrderQty: action.amount?.toString(),
        leverage: trade.leverage,
      });

      const receipt = receiptStore.generateReceipt(
        plan.id,
        trade.intent,
        trade.proposal,
        plan.result.decision,
        "human"
      );
      receipt.executed = true;
      receipt.binanceOrderId = result.orderId;
      receipt.executionPath = [
        { tool: "place_order", status: "success", details: result.details },
      ];
      receiptStore.save(receipt);

      ui.displayExecution({
        orderId: result.orderId,
        status: result.status,
        receiptHash: receipt.receiptHash,
        timestamp: receipt.timestamp,
      });

      executedCount++;
      results.push({ category: trade.category, status: "EXECUTED", orderId: result.orderId });
    } catch (error) {
      ui.displayExecutionError(error instanceof Error ? error.message : String(error));
      results.push({ category: trade.category, status: "FAILED" });
    }
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  TRACK B SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  for (const r of results) {
    const icon = r.status === "EXECUTED" ? "✓" : r.status === "BLOCKED" ? "✕" : "○";
    console.log(`  ${icon} ${r.category}: ${r.status}${r.orderId ? ` (${r.orderId})` : ""}`);
  }

  console.log(`\n  Executed: ${executedCount}/${trades.length}`);
  console.log("  Receipts: ./receipts/\n");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  TRACK B: SPOT + FUTURES + CONVERT");
  console.log(`  ${executedCount}/${trades.length} validated and executed`);
  console.log("  through INTENTRA intent-compiler → Binance Agent OS MCP");
  console.log("═══════════════════════════════════════════════════════════════");

  ui.close();
}

main().catch(console.error);
