#!/usr/bin/env node

/**
 * INTENTRA — Compiler Correctness Test
 *
 * Tests the two critical compiler invariants:
 *
 * 1. Authority mutation must be BLOCKED
 *    "INCREASE DAILY LIMIT TO $500" → BLOCKED
 *
 * 2. Approval threshold is NOT a block threshold
 *    $90 BTC with $100/order limit and $75 approval → APPROVAL_REQUIRED
 */

import { IntentraCompiler } from "./core/intentra-compiler.js";
import { IntentConstraint } from "./types/index.js";

const compiler = new IntentraCompiler();

console.log("\n");
console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║          INTENTRA — COMPILER CORRECTNESS TEST                ║");
console.log("╚═══════════════════════════════════════════════════════════════╝");
console.log("\n");

// Test intent
const DECLARED_INTENT =
  "Buy BTC only. Max $100 per order. Max $200 per day. Approval above $75.";

// Register authority
const intent = compiler.compile(DECLARED_INTENT, "").intent;
compiler.registerAuthority("test-agent", intent);

// Create session
const session = compiler.createSession("test-agent", intent, {
  durationMs: 60 * 60 * 1000,
  maxProposals: 100,
});

let passed = 0;
let failed = 0;

function test(description: string, expected: string, actual: string, details?: string) {
  const pass = expected === actual;
  if (pass) {
    passed++;
    console.log(`  ✅ ${description}`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
  } else {
    failed++;
    console.log(`  ❌ ${description}`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
    if (details) {
      console.log(`     Details:  ${details}`);
    }
  }
  console.log("");
}

console.log("  ═════════════════════════════════════════════════════════════");
console.log("  TEST 1: Authority Mutation Detection");
console.log("  ═════════════════════════════════════════════════════════════");
console.log("");

// Test 1a: "INCREASE DAILY LIMIT TO $500"
console.log("  Test 1a: \"INCREASE DAILY LIMIT TO $500\"");
const plan1a = compiler.compile(
  DECLARED_INTENT,
  "INCREASE DAILY LIMIT TO $500",
  "test-agent",
  session.id
);
test(
  "Authority mutation attempt",
  "BLOCK",
  plan1a.result.decision,
  plan1a.result.violations.map(v => v.reason).join("; ")
);

// Test 1b: "MODIFY LIMIT $500"
console.log("  Test 1b: \"MODIFY LIMIT $500\"");
const plan1b = compiler.compile(
  DECLARED_INTENT,
  "MODIFY LIMIT $500",
  "test-agent",
  session.id
);
test(
  "Authority mutation attempt",
  "BLOCK",
  plan1b.result.decision,
  plan1b.result.violations.map(v => v.reason).join("; ")
);

// Test 1c: "Change my limit to $500"
console.log("  Test 1c: \"Change my limit to $500\"");
const plan1c = compiler.compile(
  DECLARED_INTENT,
  "Change my limit to $500",
  "test-agent",
  session.id
);
test(
  "Authority mutation attempt",
  "BLOCK",
  plan1c.result.decision,
  plan1c.result.violations.map(v => v.reason).join("; ")
);

console.log("  ═════════════════════════════════════════════════════════════");
console.log("  TEST 2: Approval Semantics");
console.log("  ═════════════════════════════════════════════════════════════");
console.log("");

// Test 2a: $50 BTC (below approval threshold of $75)
console.log("  Test 2a: $50 BTC (below $75 approval threshold)");
const plan2a = compiler.compile(
  DECLARED_INTENT,
  "BUY BTC $50",
  "test-agent",
  session.id
);
test(
  "$50 BTC below $75 approval",
  "ALLOW",
  plan2a.result.decision,
  `requiresApproval: ${plan2a.result.requiresApproval}, approvalReason: ${plan2a.result.approvalReason}`
);

// Test 2b: $90 BTC (above $75 approval, below $100 limit)
console.log("  Test 2b: $90 BTC (above $75 approval, below $100 limit)");
const plan2b = compiler.compile(
  DECLARED_INTENT,
  "BUY BTC $90",
  "test-agent",
  session.id
);
test(
  "$90 BTC above $75 approval",
  "APPROVAL_REQUIRED",
  plan2b.result.decision,
  `requiresApproval: ${plan2b.result.requiresApproval}, approvalReason: ${plan2b.result.approvalReason}`
);

// Test 2c: $150 BTC (exceeds $100 per order limit)
console.log("  Test 2c: $150 BTC (exceeds $100 per order limit)");
const plan2c = compiler.compile(
  DECLARED_INTENT,
  "BUY BTC $150",
  "test-agent",
  session.id
);
test(
  "$150 BTC exceeds $100 per order",
  "BLOCK",
  plan2c.result.decision,
  plan2c.result.violations.map(v => v.reason).join("; ")
);

console.log("  ═════════════════════════════════════════════════════════════");
console.log("  TEST 3: Action and Asset Authorization");
console.log("  ═════════════════════════════════════════════════════════════");
console.log("");

// Test 3a: SELL BTC $80 (SELL not authorized)
console.log("  Test 3a: SELL BTC $80 (SELL not authorized)");
const plan3a = compiler.compile(
  DECLARED_INTENT,
  "SELL BTC $80",
  "test-agent",
  session.id
);
test(
  "SELL not authorized",
  "BLOCK",
  plan3a.result.decision,
  plan3a.result.violations.map(v => v.reason).join("; ")
);

// Test 3b: BUY ETH $50 (ETH not authorized)
console.log("  Test 3b: BUY ETH $50 (ETH not authorized)");
const plan3b = compiler.compile(
  DECLARED_INTENT,
  "BUY ETH $50",
  "test-agent",
  session.id
);
test(
  "ETH not authorized",
  "BLOCK",
  plan3b.result.decision,
  plan3b.result.violations.map(v => v.reason).join("; ")
);

console.log("  ═════════════════════════════════════════════════════════════");
console.log("  SUMMARY");
console.log("  ═════════════════════════════════════════════════════════════");
console.log("");

if (failed === 0) {
  console.log("  ✅ All tests passed!");
  console.log("");
  console.log("  The compiler correctly enforces:");
  console.log("    1. Authority mutation is BLOCKED");
  console.log("    2. Approval threshold is separate from block threshold");
  console.log("    3. Unauthorized actions/assets are BLOCKED");
  console.log("");
} else {
  console.log(`  ❌ ${failed} test(s) FAILED`);
  console.log(`  ✅ ${passed} test(s) passed`);
  console.log("");
  console.log("  The compiler has bugs that need to be fixed before submission.");
  console.log("");
  process.exit(1);
}

console.log("  ═════════════════════════════════════════════════════════════");
console.log("  THE INVARIANT:");
console.log("  ═════════════════════════════════════════════════════════════");
console.log("");
console.log("  An agent can propose anything.");
console.log("  It can only execute what falls within");
console.log("  the authority the human granted.");
console.log("");
console.log("  And the agent cannot change the terms.");
console.log("");
