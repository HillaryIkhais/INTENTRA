// @ts-nocheck
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { IntentraCompiler } from "../core/intentra-compiler.js";
import { ReceiptStore } from "../core/receipt-store.js";
import { BinanceClient } from "./binance-client.js";

/**
 * INTENTRA MCP Server
 *
 * INTENTRA sits between the agent and Binance Agent OS.
 * All agent requests pass through INTENTRA's authority check
 * before reaching Binance.
 *
 * Flow: Agent → INTENTRA MCP → Validate → Binance MCP → Execute
 */

const compiler = new IntentraCompiler();
const receiptStore = new ReceiptStore("./receipts");

let binanceClient: BinanceClient | null = null;
let currentIntent = "";
let currentPlan: any = null;

const server = new Server(
  { name: "intentra", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "authenticate",
      description: "Authenticate with Binance Agent OS via OAuth 2.1 PKCE",
      inputSchema: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "Client ID (default: intentra)" },
        },
      },
    },
    {
      name: "set_intent",
      description: "Declare your trading intent in natural language",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "Your trading intent with limits" },
        },
        required: ["intent"],
      },
    },
    {
      name: "propose_transaction",
      description: "Propose a transaction for INTENTRA to validate against your intent",
      inputSchema: {
        type: "object",
        properties: {
          actions: { type: "string", description: "Proposed actions (one per line)" },
        },
        required: ["actions"],
      },
    },
    {
      name: "check_proposal",
      description: "Quick check if a proposal matches your intent",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "Your trading intent" },
          proposal: { type: "string", description: "Proposed actions" },
        },
        required: ["intent", "proposal"],
      },
    },
    {
      name: "approve_and_execute",
      description: "Approve a validated proposal and execute via Binance Agent OS",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string", description: "Plan ID to approve" },
        },
        required: ["planId"],
      },
    },
    {
      name: "get_receipt",
      description: "Get audit receipt for a transaction",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string", description: "Plan ID" },
        },
        required: ["planId"],
      },
    },
    {
      name: "get_balances",
      description: "Get account balances from Binance",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_binance_tools",
      description: "List available Binance MCP tools",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args || {};

  switch (name) {
    case "authenticate": {
      const clientId = (a.clientId as string) || "intentra";
      binanceClient = new BinanceClient({
        clientId,
        redirectUri: "http://localhost:3847/callback",
      });

      const success = await binanceClient.authenticate();
      return {
        content: [{
          type: "text",
          text: success
            ? "✓ Authenticated with Binance Agent OS. INTENTRA is now the authority boundary."
            : "✗ Authentication failed",
        }],
      };
    }

    case "set_intent": {
      currentIntent = a.intent as string;
      return {
        content: [{
          type: "text",
          text: `Intent declared: "${currentIntent}"\n\nINTENTRA will validate all proposals against this intent.`,
        }],
      };
    }

    case "propose_transaction": {
      if (!currentIntent) {
        return {
          content: [{
            type: "text",
            text: "Error: No intent declared. Use set_intent first.",
          }],
        };
      }

      const proposal = a.actions as string;
      currentPlan = compiler.compile(currentIntent, proposal);

      const status = currentPlan.result.decision === "BLOCK" ? "BLOCKED" : "ALLOWED";
      const details = currentPlan.result.violations.length > 0
        ? currentPlan.result.violations.map((v: any) => `  ✕ ${v.reason}`).join("\n")
        : "  ✓ All checks passed";

      return {
        content: [{
          type: "text",
          text: `INTENTRA Decision: ${status}\n\n${details}\n\nPlan ID: ${currentPlan.id}`,
        }],
      };
    }

    case "check_proposal": {
      const plan = compiler.compile(a.intent as string, a.proposal as string);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            decision: plan.result.decision,
            violations: plan.result.violations,
            totals: plan.result.totals,
            planId: plan.id,
          }, null, 2),
        }],
      };
    }

    case "approve_and_execute": {
      const planId = a.planId as string;

      if (!currentPlan || currentPlan.id !== planId) {
        return {
          content: [{
            type: "text",
            text: `Error: No matching plan for ${planId}. Propose a transaction first.`,
          }],
        };
      }

      if (currentPlan.result.decision === "BLOCK") {
        return {
          content: [{
            type: "text",
            text: "Error: Cannot execute blocked transaction. Propose a valid transaction.",
          }],
        };
      }

      if (!binanceClient || !binanceClient.isAuthenticated()) {
        return {
          content: [{
            type: "text",
            text: "Error: Not authenticated with Binance Agent OS. Use authenticate first.",
          }],
        };
      }

      const action = currentPlan.proposal.actions[0];
      try {
        const result = await binanceClient.executeTransaction({
          symbol: `${action.asset}USDT`,
          side: action.type as "BUY" | "SELL",
          type: "MARKET",
          quoteOrderQty: action.amount?.toString(),
        });

        const receipt = receiptStore.generateReceipt(
          currentPlan.id,
          currentIntent,
          currentPlan.proposal.raw,
          currentPlan.result.decision,
          "human"
        );
        receipt.executed = true;
        receipt.binanceOrderId = result.orderId;
        receipt.executionPath = [
          { tool: "place_order", status: "success", details: result.details },
        ];
        receiptStore.save(receipt);

        return {
          content: [{
            type: "text",
            text: `✓ Executed via Binance Agent OS MCP\n\nOrder ID: ${result.orderId}\nStatus: ${result.status}\nReceipt: ${receipt.receiptHash}\nTimestamp: ${receipt.timestamp}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Execution failed: ${error}`,
          }],
        };
      }
    }

    case "get_receipt": {
      const receipt = receiptStore.get(a.planId as string);
      if (!receipt) {
        return {
          content: [{
            type: "text",
            text: `No receipt for plan ${a.planId}`,
          }],
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(receipt, null, 2),
        }],
      };
    }

    case "get_balances": {
      if (!binanceClient || !binanceClient.isAuthenticated()) {
        return {
          content: [{
            type: "text",
            text: "Error: Not authenticated.",
          }],
        };
      }
      const balances = await binanceClient.getBalances();
      return {
        content: [{ type: "text", text: balances }],
      };
    }

    case "list_binance_tools": {
      if (!binanceClient || !binanceClient.isAuthenticated()) {
        return {
          content: [{
            type: "text",
            text: "Error: Not authenticated.",
          }],
        };
      }
      const tools = await binanceClient.listTools();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(tools.map(t => ({
            name: t.name,
            description: t.description,
          })), null, 2),
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("INTENTRA MCP Server running on stdio");
  console.error("Agent → INTENTRA → Binance Agent OS MCP");
}

main().catch(console.error);
