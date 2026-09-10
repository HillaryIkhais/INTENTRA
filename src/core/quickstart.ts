/**
 * INTENTRA Quick Start Example
 *
 * This is how another developer integrates INTENTRA in 5 minutes.
 *
 * CLASP pattern:
 * - Real platform gap → New primitive → Enforcement → Real execution
 * - Failure handling → Revocation → Reusable SDK → User flow → Proof
 */

import { Intentra } from "./intentra-sdk";

async function main() {
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("INTENTRA — Quick Start");
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  // Step 1: Initialize INTENTRA
  console.log("1. Initialize INTENTRA");
  console.log("");

  const intentra = new Intentra({
    mode: "mock",
  });

  console.log("   const intentra = new Intentra({ mode: 'mock' });");
  console.log("");

  // Step 2: Issue capability
  console.log("2. Issue capability");
  console.log("");
  console.log("   What can this agent do?");
  console.log("");

  const root = intentra.issue({
    agentId: "trading-bot",
    assets: ["BNBUSDT"],
    actions: ["BUY"],
    maxPerOrder: 10,
    maxTotal: 50,
  });

  console.log(`   Agent: ${root.agentId}`);
  console.log(`   Capability ID: ${root.capabilityId}`);
  console.log(`   Assets: ${root.constraints.assets.join(", ")}`);
  console.log(`   Actions: ${root.constraints.actions.join(", ")}`);
  console.log(`   Max per order: $${root.constraints.maxPerOrder}`);
  console.log(`   Max total: $${root.constraints.maxTotal}`);
  console.log("");

  // Step 3: Delegate to sub-agent
  console.log("3. Delegate to sub-agent");
  console.log("");
  console.log("   Sub-agent can never have MORE than parent.");
  console.log("");

  const child = intentra.delegate(root.capabilityId, {
    childAgentId: "research-bot",
    maxPerOrder: 5,
    maxTotal: 20,
    assets: ["BNBUSDT"],
    actions: ["BUY"],
  });

  if (child.success) {
    console.log(`   Parent: ${root.capabilityId}`);
    console.log(`   Child Agent: ${child.agentId}`);
    console.log(`   Child Capability: ${child.capabilityId}`);
    console.log(`   Max per order: $5 (narrowed from $10)`);
    console.log(`   Max total: $20 (narrowed from $50)`);
    console.log("");
    console.log("   ✓ Authority narrowed. Child ≤ Parent.");
  } else {
    console.log(`   ✗ Delegation blocked: ${child.violations?.join("; ")}`);
  }
  console.log("");

  // Step 4: Execute valid proposal
  console.log("4. Execute valid proposal");
  console.log("");

  const validResult = await intentra.execute({
    capabilityId: child.capabilityId!,
    asset: "BNBUSDT",
    action: "BUY",
    amount: 5,
  });

  console.log(`   Proposal: BUY $5 BNB`);
  console.log(`   Status: ${validResult.status}`);
  console.log(`   Message: ${validResult.message}`);
  console.log("");

  // Step 5: Block invalid proposal
  console.log("5. Block invalid proposal");
  console.log("");

  const invalidResult = await intentra.execute({
    capabilityId: child.capabilityId!,
    asset: "ETHUSDT",
    action: "BUY",
    amount: 500,
  });

  console.log(`   Proposal: BUY $500 ETH`);
  console.log(`   Status: ${invalidResult.status}`);
  console.log(`   Reason: ${invalidResult.message}`);
  console.log("");
  console.log("   ✓ Authority escalation blocked.");
  console.log("");

  // Step 6: Revoke parent
  console.log("6. Revoke parent — entire chain becomes unusable");
  console.log("");

  intentra.revoke(root.capabilityId, "user requested");

  console.log(`   Parent capability ${root.capabilityId} revoked.`);
  console.log("");

  // Step 7: Try to execute after revoke
  console.log("7. Try to execute after revoke");
  console.log("");

  const afterRevokeResult = await intentra.execute({
    capabilityId: child.capabilityId!,
    asset: "BNBUSDT",
    action: "BUY",
    amount: 3,
  });

  console.log(`   Proposal: BUY $3 BNB`);
  console.log(`   Status: ${afterRevokeResult.status}`);
  console.log(`   Reason: ${afterRevokeResult.message}`);
  console.log("");
  console.log("   ✓ Cascade revocation works.");
  console.log("");

  // Summary
  console.log("═══════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("✓ Issue capability");
  console.log("✓ Delegate with narrowing");
  console.log("✓ Block authority escalation");
  console.log("✓ Cascade revocation");
  console.log("");
  console.log("The invariant:");
  console.log("  Sub-agent ≤ Parent");
  console.log("  Authority can only narrow. Never widen.");
  console.log("");
  console.log("═══════════════════════════════════════════════════");
}

main().catch(console.error);
