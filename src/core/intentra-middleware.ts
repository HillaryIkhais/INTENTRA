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
  allowed: boolean;
  reason: string;
}

export interface AuthorityCheck {
  allowed: boolean;
  reason: string;
  requiresProposalValidation: boolean;
  operationType: "MUTATE" | "READ" | "BLOCKED";
}

export class IntentraMiddleware {
  private compiler: CapabilityCompiler;
  private receiptStore: ProvenanceReceiptStore;
  private adapter: ExecutionAdapter;
  private interceptedCalls: InterceptedCall[] = [];

  constructor(config: MiddlewareConfig) {
    this.compiler = new CapabilityCompiler();
    this.receiptStore = new ProvenanceReceiptStore();
    this.adapter = new ExecutionAdapter({
      mode: config.mode,
      receiptStore: this.receiptStore,
      binanceClient: config.binanceClient,
    });
  }

  /**
   * Classify operation type.
   * Every operation gets an authority check.
   */
  private classifyOperation(tool: string): AuthorityCheck {
    const MUTATING_TOOLS = ["place_order", "cancel_order"];
    const READ_TOOLS = ["get_order", "get_account", "get_ticker", "get_klines"];
    const BLOCKED_TOOLS = ["transfer_funds", "withdraw_crypto", "internal_transfer"];

    if (BLOCKED_TOOLS.includes(tool)) {
      return {
        allowed: false,
        reason: `Tool "${tool}" is permanently blocked.`,
        requiresProposalValidation: false,
        operationType: "BLOCKED",
      };
    }

    if (MUTATING_TOOLS.includes(tool)) {
      return {
        allowed: true,
        reason: "Mutating operation - requires proposal validation.",
        requiresProposalValidation: true,
        operationType: "MUTATE",
      };
    }

    if (READ_TOOLS.includes(tool)) {
      return {
        allowed: true,
        reason: "Read operation - requires valid capability.",
        requiresProposalValidation: false,
        operationType: "READ",
      };
    }

    return {
      allowed: false,
      reason: `Tool "${tool}" is not in the allowed set.`,
      requiresProposalValidation: false,
      operationType: "BLOCKED",
    };
  }

  /**
   * Validate proposal against capability constraints.
   * This is the core authority check for mutating operations.
   */
  private validateProposal(
    capabilityId: string,
    tool: string,
    args: Record<string, any>
  ): { allowed: boolean; reason: string } {
    const cap = this.compiler.getCapability(capabilityId);
    if (!cap) {
      return { allowed: false, reason: `Capability ${capabilityId} not found.` };
    }

    if (cap.revokedAt) {
      return { allowed: false, reason: `Capability ${capabilityId} has been revoked.` };
    }

    if (tool === "place_order") {
      const proposal = {
        asset: args.symbol || "",
        action: args.side || "BUY",
        amount: parseFloat(args.quoteOrderQty || args.quantity || "0"),
      };

      const validation = this.compiler.validateProposal(capabilityId, proposal);

      if (validation.decision === "BLOCK") {
        return {
          allowed: false,
          reason: `BLOCKED: ${validation.violations.map(v => v.reason).join("; ")}`,
        };
      }
    }

    if (tool === "cancel_order") {
      if (!args.orderId) {
        return { allowed: false, reason: "cancel_order requires orderId." };
      }
    }

    return { allowed: true, reason: "Proposal validation passed." };
  }

  /**
   * Intercept and validate ANY tool call.
   * Every call gets an authority check.
   */
  intercept(tool: string, args: Record<string, any>, capabilityId?: string): {
    allowed: boolean;
    reason: string;
    result?: ExecutionResult;
    operationType: string;
  } {
    const classification = this.classifyOperation(tool);

    if (!classification.allowed) {
      this.interceptedCalls.push({
        tool,
        args,
        agentId: "external",
        capabilityId,
        allowed: false,
        reason: classification.reason,
      });
      return {
        allowed: false,
        reason: classification.reason,
        operationType: classification.operationType,
      };
    }

    if (!capabilityId) {
      this.interceptedCalls.push({
        tool,
        args,
        agentId: "external",
        capabilityId,
        allowed: false,
        reason: "Execution requires a valid capability ID.",
      });
      return {
        allowed: false,
        reason: "Execution requires a valid capability ID.",
        operationType: classification.operationType,
      };
    }

    const cap = this.compiler.getCapability(capabilityId);
    if (!cap) {
      this.interceptedCalls.push({
        tool,
        args,
        agentId: "external",
        capabilityId,
        allowed: false,
        reason: `Capability ${capabilityId} not found.`,
      });
      return {
        allowed: false,
        reason: `Capability ${capabilityId} not found.`,
        operationType: classification.operationType,
      };
    }

    if (cap.revokedAt) {
      this.interceptedCalls.push({
        tool,
        args,
        agentId: "external",
        capabilityId,
        allowed: false,
        reason: `Capability ${capabilityId} has been revoked.`,
      });
      return {
        allowed: false,
        reason: `Capability ${capabilityId} has been revoked.`,
        operationType: classification.operationType,
      };
    }

    if (classification.requiresProposalValidation) {
      const proposalResult = this.validateProposal(capabilityId, tool, args);

      if (!proposalResult.allowed) {
        this.interceptedCalls.push({
          tool,
          args,
          agentId: cap.agentId,
          capabilityId,
          allowed: false,
          reason: proposalResult.reason,
        });
        return {
          allowed: false,
          reason: proposalResult.reason,
          operationType: classification.operationType,
        };
      }
    }

    this.interceptedCalls.push({
      tool,
      args,
      agentId: cap.agentId,
      capabilityId,
      allowed: true,
      reason: classification.reason,
    });

    return {
      allowed: true,
      reason: classification.reason,
      operationType: classification.operationType,
    };
  }

  getInterceptedCalls(): InterceptedCall[] {
    return [...this.interceptedCalls];
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
    lines.push(`Total intercepted calls: ${this.interceptedCalls.length}`);

    const blocked = this.interceptedCalls.filter(c => !c.allowed);
    const allowed = this.interceptedCalls.filter(c => c.allowed);
    const mutations = this.interceptedCalls.filter(c => c.operationType === "MUTATE");
    const reads = this.interceptedCalls.filter(c => c.operationType === "READ");

    lines.push(`  Allowed: ${allowed.length}`);
    lines.push(`  Blocked: ${blocked.length}`);
    lines.push(`  Mutations: ${mutations.length}`);
    lines.push(`  Reads: ${reads.length}`);
    lines.push("");

    if (blocked.length > 0) {
      lines.push("BLOCKED CALLS:");
      for (const call of blocked) {
        lines.push(`  Tool: ${call.tool}`);
        lines.push(`  Reason: ${call.reason}`);
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("ENFORCEMENT MODEL");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("Every operation is classified:");
    lines.push("  MUTATE — requires proposal validation against capability");
    lines.push("  READ — requires valid, non-revoked capability");
    lines.push("  BLOCKED — permanently denied");
    lines.push("");
    lines.push("Authority is enforced on EVERY call, not just place_order.");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
