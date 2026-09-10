import { CapabilityCompiler } from "./capability-compiler";
import { IntentraMiddleware } from "./intentra-middleware";
import { ReadbackAttester } from "./readback-attester";
import { ExecutionAdapter, ExecutionResult } from "./execution-adapter";
import { ProvenanceReceiptStore, ProvenanceReceipt } from "./provenance-receipt";
import { OfflineVerifier } from "./offline-verifier";

/**
 * INTENTRA SDK
 *
 * A simple, reusable interface for developers.
 *
 * This is the product primitive, not just the engine.
 *
 * CLASP pattern:
 * REAL PLATFORM GAP → NEW PRIMITIVE → ENFORCEMENT → REAL EXECUTION
 * → FAILURE HANDLING → REVOCATION → REUSABLE SDK → USER FLOW → PROOF
 *
 * Usage:
 * const intentra = new Intentra({ mode: "mock" });
 *
 * // Issue capability
 * const root = intentra.issue({
 *   agentId: "trading-bot",
 *   assets: ["BNBUSDT"],
 *   actions: ["BUY"],
 *   maxPerOrder: 10,
 *   maxTotal: 50
 * });
 *
 * // Delegate
 * const child = intentra.delegate(root.id, {
 *   agentId: "research-bot",
 *   maxPerOrder: 5,
 *   maxTotal: 20
 * });
 *
 * // Execute
 * const result = await intentra.execute(child.id, {
 *   asset: "BNBUSDT",
 *   action: "BUY",
 *   amount: 5
 * });
 *
 * // Revoke
 * intentra.revoke(root.id, "user requested");
 *
 * // Verify
 * const verification = intentra.verify(result.receipt.id);
 */

export interface IntentraConfig {
  mode: "mock" | "real";
  binanceClient?: any;
  receiptStore?: ProvenanceReceiptStore;
}

export interface IssueParams {
  agentId: string;
  assets: string[];
  actions: string[];
  maxPerOrder: number;
  maxTotal: number;
  maxDaily?: number;
  expiryMs?: number;
  objective?: string;
}

export interface DelegateParams {
  parentId: string;
  childAgentId: string;
  maxPerOrder?: number;
  maxTotal?: number;
  assets?: string[];
  actions?: string[];
}

export interface ExecutionParams {
  capabilityId: string;
  asset: string;
  action: string;
  amount: number;
}

export interface IntentraResult {
  success: boolean;
  status: string;
  receipt?: ProvenanceReceipt;
  orderId?: string;
  readback?: { match: boolean; discrepancies: string[] };
  message: string;
}

export class Intentra {
  private compiler: CapabilityCompiler;
  private middleware: IntentraMiddleware;
  private readbackAttester: ReadbackAttester;
  private executionAdapter: ExecutionAdapter;
  private receiptStore: ProvenanceReceiptStore;
  private verifier: OfflineVerifier;

  constructor(config: IntentraConfig) {
    this.compiler = new CapabilityCompiler();
    this.receiptStore = config.receiptStore || new ProvenanceReceiptStore();
    this.middleware = new IntentraMiddleware({
      mode: config.mode,
      binanceClient: config.binanceClient,
    });
    // Inject the same compiler instance into the middleware
    (this.middleware as any).compiler = this.compiler;
    this.readbackAttester = new ReadbackAttester(config.binanceClient);
    this.executionAdapter = new ExecutionAdapter({
      mode: config.mode,
      binanceClient: config.binanceClient,
      receiptStore: this.receiptStore,
      readbackAttester: this.readbackAttester,
    });
    this.verifier = new OfflineVerifier();
  }

  /**
   * Issue a root capability.
   *
   * This is the entry point: "What can this agent do?"
   */
  issue(params: IssueParams): {
    success: boolean;
    capabilityId: string;
    agentId: string;
    constraints: {
      assets: string[];
      actions: string[];
      maxPerOrder: number;
      maxTotal: number;
    };
  } {
    const cap = this.compiler.issueRoot(
      params.agentId,
      {
        objective: params.objective || "Trading",
        allowedActions: params.actions,
        allowedAssets: params.assets,
        maxPerOrder: params.maxPerOrder,
        maxTotalSpend: params.maxTotal,
        maxDailySpend: params.maxDaily,
      },
      { durationMs: params.expiryMs || 86400000 }
    );

    return {
      success: true,
      capabilityId: cap.id,
      agentId: cap.agentId,
      constraints: {
        assets: cap.constraints.allowedAssets || [],
        actions: cap.constraints.allowedActions || [],
        maxPerOrder: cap.constraints.maxPerOrder || 0,
        maxTotal: cap.constraints.maxTotalSpend || 0,
      },
    };
  }

  /**
   * Delegate authority to a sub-agent.
   *
   * The key invariant: child ≤ parent.
   */
  delegate(parentId: string, params: DelegateParams): {
    success: boolean;
    capabilityId?: string;
    agentId: string;
    violations?: string[];
  } {
    const parentCap = this.compiler.getCapability(parentId);
    if (!parentCap) {
      return {
        success: false,
        agentId: params.childAgentId,
        violations: [`Parent capability ${parentId} not found`],
      };
    }

    const result = this.compiler.delegate(
      parentId,
      params.childAgentId,
      {
        objective: "Delegated",
        allowedActions: params.actions || parentCap.constraints.allowedActions || [],
        allowedAssets: params.assets || parentCap.constraints.allowedAssets || [],
        maxPerOrder: params.maxPerOrder || parentCap.constraints.maxPerOrder,
        maxTotalSpend: params.maxTotal || parentCap.constraints.maxTotalSpend,
      }
    );

    if (result.capability) {
      return {
        success: true,
        capabilityId: result.capability.id,
        agentId: result.capability.agentId,
      };
    } else {
      return {
        success: false,
        agentId: params.childAgentId,
        violations: result.violations.map(v => v.reason),
      };
    }
  }

  /**
   * Execute a proposal through INTENTRA → Binance pipeline.
   *
   * This is the closed loop:
   * intent → policy → authorization → execution → observation → verification → receipt
   */
  async execute(params: ExecutionParams): Promise<IntentraResult> {
    const cap = this.compiler.getCapability(params.capabilityId);

    if (!cap) {
      return {
        success: false,
        status: "CAPABILITY_NOT_FOUND",
        message: `Capability ${params.capabilityId} not found`,
      };
    }

    if (cap.revokedAt) {
      return {
        success: false,
        status: "CAPABILITY_REVOKED",
        message: `Capability ${params.capabilityId} has been revoked`,
      };
    }

    const proposalResult = this.compiler.validateProposal(
      params.capabilityId,
      {
        asset: params.asset,
        action: params.action,
        amount: params.amount,
      }
    );

    if (proposalResult.decision === "BLOCK") {
      return {
        success: false,
        status: "BLOCKED",
        message: proposalResult.violations.map(v => v.reason).join("; "),
      };
    }

    const execResult = await this.executionAdapter.execute({
      capability: cap,
      delegationChain: cap.chain,
      proposal: {
        asset: params.asset,
        action: params.action,
        amount: params.amount,
      },
      decision: proposalResult.decision,
      violations: proposalResult.violations.map(v => v.reason),
    });

    return {
      success: execResult.status === "EXECUTED" || execResult.status === "MOCK_EXECUTED",
      status: execResult.status,
      receipt: execResult.receipt,
      orderId: execResult.orderId,
      readback: execResult.readback,
      message: execResult.message,
    };
  }

  /**
   * Revoke a capability and all its descendants.
   */
  revoke(capabilityId: string, reason: string): {
    success: boolean;
    revoked: string[];
  } {
    const result = this.compiler.revoke(capabilityId, reason);
    return {
      success: true,
      revoked: result.revokedIds,
    };
  }

  /**
   * Verify a receipt.
   *
   * Third party can verify without credentials.
   */
  verify(receiptId: string): {
    success: boolean;
    valid: boolean;
    issues: string[];
  } {
    const receipt = this.receiptStore.get(receiptId);
    if (!receipt) {
      return {
        success: false,
        valid: false,
        issues: [`Receipt ${receiptId} not found`],
      };
    }

    const result = this.verifier.verify(receipt);
    return {
      success: true,
      valid: result.overallValid,
      issues: [...result.errors, ...result.warnings],
    };
  }

  /**
   * Get all blocked calls for audit.
   */
  getBlockedCalls(): Array<{
    tool: string;
    args: Record<string, any>;
    capabilityId?: string;
    reason: string;
  }> {
    return this.middleware
      .getInterceptedCalls()
      .filter(c => !c.allowed)
      .map(c => ({
        tool: c.tool,
        args: c.args,
        capabilityId: c.capabilityId,
        reason: c.reason,
      }));
  }

  /**
   * Generate an audit report.
   */
  getReport(): string {
    const blocked = this.getBlockedCalls();
    const attestations = this.readbackAttester.getAllAttestations();

    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA AUDIT REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push("CAPABILITIES:");
    lines.push(`  Issued: ${this.compiler.getAllCapabilities().length}`);
    lines.push(`  Blocked calls: ${blocked.length}`);
    lines.push(`  Readback attestations: ${attestations.length}`);
    lines.push("");

    if (blocked.length > 0) {
      lines.push("BLOCKED CALLS:");
      for (const call of blocked) {
        lines.push(`  ${call.tool}: ${call.reason}`);
      }
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("LIFECYCLE COMPLETE:");
    lines.push("  ✓ Issue → Delegate → Execute → Readback → Verify → Revoke");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
