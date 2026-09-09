import { CapabilityCompiler } from "./capability-compiler";
import { ProvenanceReceiptStore, ProvenanceReceipt } from "./provenance-receipt";
import { ExecutionAdapter, ExecutionResult } from "./execution-adapter";

export interface MiddlewareConfig {
  mode: "mock" | "real";
  binanceClient?: any;
}

export interface InterceptedCall {
  tool: string;
  args: Record<string, any>;
  agentId: string;
  capabilityId?: string;
}

export class IntentraMiddleware {
  private compiler: CapabilityCompiler;
  private receiptStore: ProvenanceReceiptStore;
  private adapter: ExecutionAdapter;
  private blockedCalls: InterceptedCall[] = [];

  constructor(config: MiddlewareConfig) {
    this.compiler = new CapabilityCompiler();
    this.receiptStore = new ProvenanceReceiptStore();
    this.adapter = new ExecutionAdapter({
      mode: config.mode,
      receiptStore: this.receiptStore,
      binanceClient: config.binanceClient,
    });
  }

  intercept(tool: string, args: Record<string, any>, capabilityId?: string): {
    allowed: boolean;
    reason: string;
    result?: ExecutionResult;
  } {
    const ALLOWED_TOOLS = [
      "place_order",
      "cancel_order",
      "get_order",
      "get_account",
      "get_ticker",
      "get_klines",
    ];

    if (!ALLOWED_TOOLS.includes(tool)) {
      this.blockedCalls.push({ tool, args, agentId: "external", capabilityId });
      return {
        allowed: false,
        reason: `Tool "${tool}" is not in the allowed set.`,
      };
    }

    if (!capabilityId) {
      this.blockedCalls.push({ tool, args, agentId: "external", capabilityId });
      return {
        allowed: false,
        reason: "Execution requires a valid capability ID.",
      };
    }

    const cap = this.compiler.getCapability(capabilityId);
    if (!cap) {
      this.blockedCalls.push({ tool, args, agentId: "external", capabilityId });
      return {
        allowed: false,
        reason: `Capability ${capabilityId} not found.`,
      };
    }

    if (cap.revokedAt) {
      this.blockedCalls.push({ tool, args, agentId: "external", capabilityId });
      return {
        allowed: false,
        reason: `Capability ${capabilityId} has been revoked.`,
      };
    }

    if (tool === "place_order") {
      const proposal = {
        asset: args.symbol || "",
        action: args.side || "BUY",
        amount: parseFloat(args.quoteOrderQty || args.quantity || "0"),
      };

      const validation = this.compiler.validateProposal(capabilityId, proposal);

      if (validation.decision === "BLOCK") {
        this.blockedCalls.push({ tool, args, agentId: "external", capabilityId });
        return {
          allowed: false,
          reason: `BLOCKED: ${validation.violations.map(v => v.reason).join("; ")}`,
        };
      }
    }

    return { allowed: true, reason: "Tool call approved by INTENTRA." };
  }

  getBlockedCalls(): InterceptedCall[] {
    return [...this.blockedCalls];
  }

  getCompiler(): CapabilityCompiler {
    return this.compiler;
  }

  getReceiptStore(): ProvenanceReceiptStore {
    return this.receiptStore;
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA MIDDLEWARE REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Total blocked calls: ${this.blockedCalls.length}`);
    lines.push("");

    if (this.blockedCalls.length === 0) {
      lines.push("No unauthorized tool calls detected.");
    } else {
      for (const call of this.blockedCalls) {
        lines.push(`  Tool: ${call.tool}`);
        lines.push(`  Args: ${JSON.stringify(call.args)}`);
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("ENFORCEMENT MODEL");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA sits between the supported agent and Binance.");
    lines.push("The supported agent (Claude/Codex) connects to Binance Agent OS.");
    lines.push("INTENTRA intercepts every call and enforces authority.");
    lines.push("Only calls that pass INTENTRA's checks reach Binance.");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
