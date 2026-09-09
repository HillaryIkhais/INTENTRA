import { fuzzAuthorityProperties } from "./core/authority-fuzzer";

console.log("INTENTRA — Authority Property Fuzzer");
console.log("Running 50,000 randomized delegation chains...\n");

const result = fuzzAuthorityProperties(50000);

console.log("═══════════════════════════════════════════════════");
console.log("RESULTS");
console.log("═══════════════════════════════════════════════════");
console.log(`Total chains:        ${result.totalChains.toLocaleString()}`);
console.log(`Total delegations:   ${result.totalDelegations.toLocaleString()}`);
console.log(`Violations found:    ${result.violations}`);
console.log(`Max chain depth:     ${result.maxChainDepth}`);
console.log(`Duration:            ${result.duration}ms`);
console.log("");

console.log("═══════════════════════════════════════════════════");
console.log("STRATEGY BREAKDOWN");
console.log("═══════════════════════════════════════════════════");
for (const [strategy, stats] of Object.entries(result.strategies)) {
  const blocked = stats.blocked;
  const total = stats.attempts;
  const rate = total > 0 ? ((blocked / total) * 100).toFixed(1) : "0.0";
  console.log(`${strategy.padEnd(20)} ${blocked.toString().padStart(6)} blocked / ${total.toString().padStart(6)} attempts (${rate}%)`);
}

if (result.violations > 0) {
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("VIOLATIONS");
  console.log("═══════════════════════════════════════════════════");
  for (const detail of result.violationDetails) {
    console.log(`  ${detail}`);
  }
}

console.log("");
console.log("═══════════════════════════════════════════════════");
console.log(result.violations === 0 ? "PASS: Zero authority-widening paths accepted" : `FAIL: ${result.violations} violations detected`);
console.log("═══════════════════════════════════════════════════");
