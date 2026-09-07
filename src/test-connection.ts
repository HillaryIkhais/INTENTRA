#!/usr/bin/env node

import { BinanceClient } from "./mcp/binance-client.js";

/**
 * INTENTRA — Binance Agent OS Connection Test
 *
 * Tests the real Binance Agent OS MCP connection via OAuth 2.1 PKCE.
 */

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  INTENTRA — Binance Agent OS Connection Test");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const binance = new BinanceClient({
    clientId: process.env.BINANCE_CLIENT_ID || "intentra",
    redirectUri: "http://localhost:3847/callback",
  });

  console.log("  Authenticating with Binance Agent OS via OAuth 2.1 PKCE...\n");

  const authenticated = await binance.authenticate();

  if (!authenticated) {
    console.error("  ✗ Authentication failed");
    console.error(`  Using client_id="${process.env.BINANCE_CLIENT_ID || "intentra"}" (default).`);
    console.error("  If Binance rejects this client, set a real allowlisted client_id:");
    console.error("    BINANCE_CLIENT_ID=xxx npx tsx src/test-connection.ts");
    console.error("  Until then, Track B proof stays in mock mode — see npm run demo.");
    process.exit(1);
  }

  console.log("  ✓ Authenticated with Binance Agent OS\n");

  console.log("  Listing available MCP tools...");
  try {
    const tools = await binance.listTools();
    console.log(`  Found ${tools.length} tools:\n`);
    for (const tool of tools) {
      console.log(`    - ${tool.name}`);
      console.log(`      ${tool.description.slice(0, 80)}`);
    }
  } catch (error) {
    console.error(`  Failed to list tools: ${error}`);
  }

  console.log("\n  Checking account balances...");
  try {
    const balances = await binance.getBalances();
    console.log(`  ${balances}`);
  } catch (error) {
    console.error(`  Failed to get balances: ${error}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Connection test complete");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
