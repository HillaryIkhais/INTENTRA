import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CapabilityCompiler } from "../core/capability-compiler.js";
import { ProvenanceReceiptStore } from "../core/provenance-receipt.js";
import { ExecutionAdapter } from "../core/execution-adapter.js";

/**
 * INTENTRA MCP Server (Simplified)
 *
 * Sits between Claude and Binance Agent OS.
 * Claude connects to INTENTRA. INTENTRA checks authority. Then forwards to Binance.
 *
 * Flow: Claude → INTENTRA MCP → Authority Check → Binance MCP → Execute
 */

const compiler = new CapabilityCompiler();
const receiptStore = new ProvenanceReceiptStore();
const adapter = new ExecutionAdapter({ mode: "mock", receiptStore });

let currentCapabilityId: string | null = null;

const server = new Server(
  { name: "intentra", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "issue_capability",
      description: "Issue a root capability (grant authority to an agent)",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID" },
          maxPerOrder: { type: "number", description: "Max per order" },
          maxTotalSpend: { type: "number", description: "Max total spend" },
          assets: { type: "array", items: { type: "string" }, description: "Allowed assets" },
          actions: { type: "array", items: { type: "string" }, description: "Allowed actions" },
        },
        required: ["agentId"],
      },
    },
    {
      name: "delegate",
      description: "Delegate authority to a sub-agent",
      inputSchema: {
        type: "object",
        properties: {
          parentId: { type: "string", description: "Parent capability ID" },
          childAgentId: { type: "string", description: "Child agent ID" },
          maxPerOrder: { type: "number", description: "Max per order" },
          maxTotalSpend: { type: "number", description: "Max total spend" },
        },
        required: ["parentId", "childAgentId"],
      },
    },
    {
      name: "validate",
      description: "Validate a proposal against a capability",
      inputSchema: {
        type: "object",
        properties: {
          capabilityId: { type: "string", description: "Capability ID" },
          asset: { type: "string", description: "Asset symbol" },
          action: { type: "string", description: "Action (BUY/SELL)" },
          amount: { type: "number", description: "Amount" },
        },
        required: ["capabilityId", "asset", "action", "amount"],
      },
    },
    {
      name: "execute",
      description: "Execute an approved proposal",
      inputSchema: {
        type: "object",
        properties: {
          capabilityId: { type: "string", description: "Capability ID" },
          asset: { type: "string", description: "Asset symbol" },
          action: { type: "string", description: "Action (BUY/SELL)" },
          amount: { type: "number", description: "Amount" },
        },
        required: ["capabilityId", "asset", "action", "amount"],
      },
    },
    {
      name: "get_balances",
      description: "Get account balances (mock)",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args || {};

  switch (name) {
    case "issue_capability": {
      const cap = compiler.issueRoot(
        a.agentId as string,
        {
          objective: "Trading",
          allowedActions: (a.actions as string[]) || ["BUY"],
          allowedAssets: (a.assets as string[]) || ["BNBUSDT"],
          maxPerOrder: (a.maxPerOrder as number) || 10,
          maxTotalSpend: (a.maxTotalSpend as number) || 100,
        },
        { durationMs: 600000 }
      );

      currentCapabilityId = cap.id;

      return {
        content: [{
          type: "text",
          text: `✓ Capability issued\n\nID: ${cap.id}\nAgent: ${cap.agentId}\nMax per order: $${cap.constraints.maxPerOrder}\nMax total: $${cap.constraints.maxTotalSpend}\nAssets: ${cap.constraints.allowedAssets?.join(", ")}\nActions: ${cap.constraints.allowedActions?.join(", ")}\n\nUse this capability ID for delegation and execution.`,
        }],
      };
    }

    case "delegate": {
      const result = compiler.delegate(
        a.parentId as string,
        a.childAgentId as string,
        {
          objective: "Delegated",
          allowedActions: ["BUY"],
          allowedAssets: ["BNBUSDT"],
          maxPerOrder: (a.maxPerOrder as number) || 5,
          maxTotalSpend: (a.maxTotalSpend as number) || 50,
        }
      );

      if (result.capability) {
        currentCapabilityId = result.capability.id;
        return {
          content: [{
            type: "text",
            text: `✓ Delegation successful\n\nChild ID: ${result.capability.id}\nParent ID: ${a.parentId}\nMax per order: $${result.capability.constraints.maxPerOrder}\nMax total: $${result.capability.constraints.maxTotalSpend}\n\nAuthority narrowed. Sub-agent has less power than parent.`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `✗ Delegation blocked\n\n${result.violations.map(v => v.reason).join("\n")}`,
          }],
        };
      }
    }

    case "validate": {
      const result = compiler.validateProposal(a.capabilityId as string, {
        asset: a.asset as string,
        action: a.action as string,
        amount: a.amount as number,
      });

      return {
        content: [{
          type: "text",
          text: result.decision === "ALLOW"
            ? `✓ ALLOWED\n\nProposal: ${a.amount} ${a.action} ${a.asset}\nCapability: ${a.capabilityId}`
            : `✗ BLOCKED\n\n${result.violations.map(v => v.reason).join("\n")}`,
        }],
      };
    }

    case "execute": {
      const validation = compiler.validateProposal(a.capabilityId as string, {
        asset: a.asset as string,
        action: a.action as string,
        amount: a.amount as number,
      });

      if (validation.decision !== "ALLOW") {
        return {
          content: [{
            type: "text",
            text: `✗ BLOCKED — ${validation.violations.map(v => v.reason).join("; ")}`,
          }],
        };
      }

      const cap = compiler.getCapability(a.capabilityId as string);
      if (!cap) {
        return {
          content: [{
            type: "text",
            text: "✗ Capability not found",
          }],
        };
      }

      const execResult = await adapter.execute({
        capability: cap,
        delegationChain: cap.chain,
        proposal: { asset: a.asset as string, action: a.action as string, amount: a.amount as number },
        decision: "ALLOW",
        violations: [],
      });

      return {
        content: [{
          type: "text",
          text: `✓ EXECUTED\n\nOrder ID: ${execResult.orderId || "mock"}\nStatus: ${execResult.status}\nReceipt: ${execResult.receipt.id}`,
        }],
      };
    }

    case "get_balances": {
      return {
        content: [{
          type: "text",
          text: `Account Balances (mock):\n\nBNB: 10.5\nUSDT: 5,000.00\nETH: 2.3`,
        }],
      };
    }

    default:
      return {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}`,
        }],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("INTENTRA MCP Server running on stdio");
}

main().catch(console.error);
