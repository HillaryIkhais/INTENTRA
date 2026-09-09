import { CapabilityCompiler } from "./capability-compiler";
import { ProvenanceReceiptStore, ProvenanceReceipt } from "./provenance-receipt";

export interface ToolCall {
  tool: string;
  params: Record<string, any>;
  agentId: string;
  capabilityId?: string;
}

export interface EnforcementResult {
  allowed: boolean;
  tool: string;
  reason: string;
  receiptId?: string;
}

const ALLOWED_INTENTRA_TOOLS = [
  "issueRoot",
  "delegate",
  "validateProposal",
  "validateChain",
  "revoke",
  "buildChain",
];

const ALLOWED_EXECUTION_TOOLS = [
  "place_order",
  "cancel_order",
  "get_order",
  "get_account",
];

const ALL_ALLOWED_TOOLS = [...ALLOWED_INTENTRA_TOOLS, ...ALLOWED_EXECUTION_TOOLS];

export class LLMZeroToolsEnforcer {
  private compiler: CapabilityCompiler;
  private receiptStore: ProvenanceReceiptStore;
  private blockedCalls: ToolCall[] = [];

  constructor(compiler: CapabilityCompiler, receiptStore: ProvenanceReceiptStore) {
    this.compiler = compiler;
    this.receiptStore = receiptStore;
  }

  interceptToolCall(call: ToolCall): EnforcementResult {
    if (!ALL_ALLOWED_TOOLS.includes(call.tool)) {
      this.blockedCalls.push(call);

      const receipt = this.receiptStore.createReceipt({
        capabilityId: call.capabilityId || "none",
        delegationChain: [],
        intentId: `intent_${Date.now()}`,
        agentId: call.agentId,
        proposal: {
          asset: "",
          action: "TOOL_CALL",
          amount: 0,
          raw: JSON.stringify(call),
        },
        decision: "BLOCK",
        violations: [
          `LLM attempted to call tool "${call.tool}" which is not in the allowed tool set`,
          `Allowed tools: ${ALL_ALLOWED_TOOLS.join(", ")}`,
        ],
      });

      return {
        allowed: false,
        tool: call.tool,
        reason: `Tool "${call.tool}" is not in the allowed set. LLM has zero direct tool access.`,
        receiptId: receipt.id,
      };
    }

    if (ALLOWED_EXECUTION_TOOLS.includes(call.tool)) {
      if (!call.capabilityId) {
        this.blockedCalls.push(call);

        const receipt = this.receiptStore.createReceipt({
          capabilityId: "none",
          delegationChain: [],
          intentId: `intent_${Date.now()}`,
          agentId: call.agentId,
          proposal: {
            asset: call.params.symbol || "",
            action: call.tool,
            amount: parseFloat(call.params.quantity || "0"),
            raw: JSON.stringify(call),
          },
          decision: "BLOCK",
          violations: [
            "Execution tool called without capability ID",
            "All execution must go through INTENTRA authority check",
          ],
        });

        return {
          allowed: false,
          tool: call.tool,
          reason: "Execution tool called without capability. All execution must go through INTENTRA.",
          receiptId: receipt.id,
        };
      }

      const cap = this.compiler.getCapability(call.capabilityId);
      if (!cap) {
        this.blockedCalls.push(call);

        const receipt = this.receiptStore.createReceipt({
          capabilityId: call.capabilityId,
          delegationChain: [],
          intentId: `intent_${Date.now()}`,
          agentId: call.agentId,
          proposal: {
            asset: call.params.symbol || "",
            action: call.tool,
            amount: parseFloat(call.params.quantity || "0"),
            raw: JSON.stringify(call),
          },
          decision: "BLOCK",
          violations: [
            `Capability ${call.capabilityId} not found`,
            "Execution requires valid capability",
          ],
        });

        return {
          allowed: false,
          tool: call.tool,
          reason: `Capability ${call.capabilityId} not found`,
          receiptId: receipt.id,
        };
      }

      if (cap.revokedAt) {
        this.blockedCalls.push(call);

        const receipt = this.receiptStore.createReceipt({
          capabilityId: call.capabilityId,
          delegationChain: cap.chain,
          intentId: `intent_${Date.now()}`,
          agentId: call.agentId,
          proposal: {
            asset: call.params.symbol || "",
            action: call.tool,
            amount: parseFloat(call.params.quantity || "0"),
            raw: JSON.stringify(call),
          },
          decision: "BLOCK",
          violations: [
            `Capability ${call.capabilityId} has been revoked`,
            `Revocation reason: ${cap.revocationReason}`,
          ],
        });

        return {
          allowed: false,
          tool: call.tool,
          reason: `Capability ${call.capabilityId} has been revoked`,
          receiptId: receipt.id,
        };
      }
    }

    return {
      allowed: true,
      tool: call.tool,
      reason: "Tool is in allowed set",
    };
  }

  getBlockedCalls(): ToolCall[] {
    return [...this.blockedCalls];
  }

  getBlockedCallsCount(): number {
    return this.blockedCalls.length;
  }

  reset(): void {
    this.blockedCalls = [];
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("LLM ZERO TOOLS ENFORCEMENT REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Total blocked calls: ${this.blockedCalls.length}`);
    lines.push("");

    if (this.blockedCalls.length === 0) {
      lines.push("No unauthorized tool calls detected.");
    } else {
      lines.push("Blocked calls:");
      for (const call of this.blockedCalls) {
        lines.push(`  Agent: ${call.agentId}`);
        lines.push(`  Tool: ${call.tool}`);
        lines.push(`  Params: ${JSON.stringify(call.params)}`);
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("ENFORCEMENT MODEL");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("LLM has zero direct tool access.");
    lines.push("All execution goes through INTENTRA authority check.");
    lines.push("INTENTRA is the only component allowed to talk to Binance.");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
