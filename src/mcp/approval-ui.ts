import * as readline from "readline";
import { TransactionPlan } from "../types/index.js";

/**
 * INTENTRA — Approval UI
 *
 * Interactive approval with visual box rendering.
 * This is where the human authorizes the transaction.
 */

export class ApprovalUI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  displayPlan(plan: {
    id: string;
    intent: string;
    proposal: string;
    decision: string;
    violations: Array<{ action: string; reason: string }>;
    totals: { totalSpend: number; fees: number; maxSpend: number };
  }): void {
    console.log("");
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│                    INTENTRA / APPROVAL                      │");
    console.log("├─────────────────────────────────────────────────────────────┤");
    console.log("│                                                             │");
    console.log("│  INTENT                                                     │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    console.log(`│  ${plan.intent.padEnd(56)}│`);
    console.log("│                                                             │");
    console.log("│  PROPOSAL                                                   │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    const proposalLines = plan.proposal.split("\n");
    for (const line of proposalLines) {
      console.log(`│  ${line.padEnd(56)}│`);
    }
    console.log("│                                                             │");
    console.log("│  EVALUATION                                                 │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    if (plan.violations.length === 0) {
      console.log("│  ✓ Supported by declared intent                             │");
      console.log("│  ✓ Within spending limit                                    │");
      console.log("│  ✓ No prohibited action                                     │");
    } else {
      for (const violation of plan.violations) {
        console.log(`│  ✕ ${violation.reason.padEnd(54)}│`);
      }
    }
    console.log("│                                                             │");
    console.log("│  TOTALS                                                     │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    console.log(`│  Spend: $${plan.totals.totalSpend.toFixed(2).padEnd(47)}│`);
    console.log(`│  Fees:  $${plan.totals.fees.toFixed(2).padEnd(47)}│`);
    console.log("│                                                             │");
    console.log("├─────────────────────────────────────────────────────────────┤");
    console.log(`│  Plan ID: ${plan.id.padEnd(46)}│`);
    console.log("└─────────────────────────────────────────────────────────────┘");
    console.log("");
  }

  displayExecution(result: {
    orderId: string;
    status: string;
    receiptHash: string;
    timestamp: string;
  }): void {
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│                    ✓ VERIFIED / EXECUTED                    │");
    console.log("├─────────────────────────────────────────────────────────────┤");
    console.log("│                                                             │");
    console.log("│  EXECUTION                                                  │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    console.log(`│  Order ID:  ${result.orderId.padEnd(45)}│`);
    console.log(`│  Status:    ${result.status.padEnd(45)}│`);
    console.log("│                                                             │");
    console.log("│  RECEIPT                                                    │");
    console.log("│  ─────────────────────────────────────────────────────────  │");
    console.log(`│  Hash:      ${result.receiptHash.padEnd(45)}│`);
    console.log(`│  Timestamp: ${result.timestamp.padEnd(45)}│`);
    console.log("│                                                             │");
    console.log("└─────────────────────────────────────────────────────────────┘");
    console.log("");
  }

  displayExecutionError(error: string): void {
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│                    ✕ EXECUTION FAILED                       │");
    console.log("├─────────────────────────────────────────────────────────────┤");
    console.log("│                                                             │");
    console.log(`│  Error: ${error.slice(0, 50).padEnd(50)}│`);
    console.log("│                                                             │");
    console.log("└─────────────────────────────────────────────────────────────┘");
    console.log("");
  }

  async askApproval(plan: {
    totals: { totalSpend: number; fees: number; maxSpend: number };
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const question = `  [ APPROVE ] $${plan.totals.totalSpend.toFixed(2)} (fees: $${plan.totals.fees.toFixed(2)})? [y/n] `;
      this.rl.question(question, (answer: string) => {
        const approved = answer.toLowerCase().startsWith("y") || answer.toLowerCase() === "approve";
        console.log("");
        resolve(approved);
      });
    });
  }

  async askConfirmation(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(`  ${message} [y/n] `, (answer: string) => {
        resolve(answer.toLowerCase().startsWith("y"));
      });
    });
  }

  close(): void {
    this.rl.close();
  }
}
