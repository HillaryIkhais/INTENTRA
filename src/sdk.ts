import { IntentParser } from "./core/intent-parser";
import { ProposalNormalizer } from "./core/proposal-normalizer";
import { IntentChecker } from "./core/intent-checker";
import { TransactionPlanner } from "./core/transaction-planner";
import { BinanceClient } from "./mcp/binance-client";
import { SessionManager } from "./core/session-manager";
import { ReceiptStore } from "./core/receipt-store";
import {
  IntentConstraint,
  Action,
  Decision,
  IntentraError,
  AgentIntent,
  TransactionPlan,
  Violation,
  Session,
  Revocation,
} from "./types";
export { ViolationType, SessionStatus } from "./types";

export interface IntentraConfig {
  binanceClient?: BinanceClient;
  mockMode?: boolean;
}

export interface ValidationResult {
  sessionId: string;
  proposal: string;
  normalizedActions: Action[];
  decision: Decision;
  violations: Violation[];
  plan?: TransactionPlan;
  executionAttempted: boolean;
  executedOnBinance: boolean;
  receiptId?: string;
  timestamp: string;
}

export class Intentra {
  private parser: IntentParser;
  private normalizer: ProposalNormalizer;
  private checker: IntentChecker;
  private planner: TransactionPlanner;
  private binanceClient: BinanceClient | null;
  private sessionManager: SessionManager;
  private receiptStore: ReceiptStore;
  private mockMode: boolean;
  private currentSessionId: string | null = null;

  constructor(config: IntentraConfig = {}) {
    this.parser = new IntentParser();
    this.normalizer = new ProposalNormalizer();
    this.checker = new IntentChecker();
    this.planner = new TransactionPlanner();
    this.binanceClient = config.binanceClient || null;
    this.sessionManager = new SessionManager();
    this.receiptStore = new ReceiptStore();
    this.mockMode = config.mockMode !== false;
  }

  getBinanceClient(): BinanceClient | null {
    return this.binanceClient;
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  async connectBinance(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    if (!this.binanceClient) {
      return { success: false, error: "No Binance client configured" };
    }

    const result = await this.binanceClient.authenticate();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (result.authUrl) {
      return { success: true, authUrl: result.authUrl };
    }

    this.mockMode = false;
    return { success: true };
  }

  createSession(
    intentDescription: string,
    options: {
      agentId?: string;
      expiresInSeconds?: number;
      maxProposals?: number;
      parentSessionId?: string;
    } = {}
  ): Session {
    const constraints = this.parser.parse(intentDescription);
    const agentId = options.agentId || "default-agent";

    if (options.parentSessionId) {
      const validation = this.sessionManager.validateSubSession(
        options.parentSessionId,
        constraints
      );
      if (!validation.valid) {
        throw new IntentraError(
          "AUTHORITY_WIDENING",
          validation.reason || "Sub-session widens parent authority"
        );
      }
    }

    const session = this.sessionManager.createSession(agentId, constraints, {
      expiresInSeconds: options.expiresInSeconds || 3600,
      maxProposals: options.maxProposals || 100,
      parentSessionId: options.parentSessionId,
    });

    this.currentSessionId = session.id;
    return session;
  }

  createSubSession(
    parentSessionId: string,
    intentDescription: string,
    options: {
      agentId?: string;
      expiresInSeconds?: number;
      maxProposals?: number;
    } = {}
  ): Session {
    const validation = this.sessionManager.validateSubSession(
      parentSessionId,
      this.parser.parse(intentDescription)
    );
    if (!validation.valid) {
      throw new IntentraError(
        "AUTHORITY_WIDENING",
        validation.reason || "Sub-session widens parent authority"
      );
    }

    return this.createSession(intentDescription, {
      ...options,
      parentSessionId,
    });
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  getActiveSessions(): Session[] {
    return this.sessionManager.getActiveSessions();
  }

  revokeSession(
    sessionId: string,
    reason: string = "Manual revocation"
  ): boolean {
    return this.sessionManager.revokeSession(sessionId, "human", reason);
  }

  getRevocations(): Revocation[] {
    return this.sessionManager.getRevocations();
  }

  setCurrentSession(sessionId: string): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new IntentraError("UNKNOWN_INTENT", `Session ${sessionId} not found`);
    }
    this.currentSessionId = sessionId;
  }

  getCurrentSession(): Session | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessionManager.getSession(this.currentSessionId);
  }

  validate(
    proposal: string,
    sessionId?: string
  ): ValidationResult {
    const effectiveSessionId = sessionId || this.currentSessionId;
    if (!effectiveSessionId) {
      throw new IntentraError("UNKNOWN_INTENT", "No active session. Use createSession() first.");
    }

    const session = this.sessionManager.getSession(effectiveSessionId);
    if (!session) {
      throw new IntentraError("UNKNOWN_INTENT", `Session ${effectiveSessionId} not found`);
    }

    if (session.status !== "active") {
      throw new IntentraError(
        "EXPIRED",
        `Session is ${session.status}. Create a new session.`
      );
    }

    this.sessionManager.incrementProposalCount(effectiveSessionId);

    const normalized = this.normalizer.normalize(proposal);
    const constraint = ((session as any).intent ?? (session as any).constraints) as IntentConstraint;

    const check = this.checker.check(normalized, constraint);
    const totals = this.checker.getTotals(normalized, constraint);
    const decision: Decision =
      check.violations.length > 0 ? "BLOCK" : check.needsApproval ? "APPROVAL_REQUIRED" : "ALLOW";
    const plan = {
      intentId: (session as any).id ?? effectiveSessionId,
      actions: normalized,
      totalRequested: totals.totalSpend,
      totalNotional: totals.totalSpend,
      estimatedFees: totals.fees,
      violations: check.violations,
      decision,
      needsHumanApproval: check.needsApproval,
      createdAt: new Date().toISOString(),
    } as unknown as TransactionPlan;

    return {
      sessionId: effectiveSessionId,
      proposal,
      normalizedActions: normalized,
      decision,
      violations: check.violations,
      plan,
      executionAttempted: false,
      executedOnBinance: false,
      timestamp: new Date().toISOString(),
    };
  }

  async execute(
    validationResult: ValidationResult
  ): Promise<ValidationResult> {
    if (validationResult.decision !== "ALLOW") {
      return {
        ...validationResult,
        executionAttempted: true,
        executedOnBinance: false,
      };
    }

    if (!validationResult.plan) {
      throw new IntentraError("UNKNOWN_INTENT", "No transaction plan to execute");
    }

    let executedOnBinance = false;
    let receiptId: string | undefined;

    const planId = `${validationResult.sessionId}_${Date.now()}`;
    if (this.mockMode || !this.binanceClient) {
      const receipt = this.receiptStore.generateReceipt(
        planId,
        validationResult.sessionId,
        validationResult.proposal,
        validationResult.decision,
        "human"
      );
      receiptId = receipt.receiptHash;
      executedOnBinance = false;
    } else {
      try {
        const first = validationResult.normalizedActions[0] as any;
        const result = await this.binanceClient.executeTransaction({
          symbol: `${first?.asset ?? "BTC"}USDT`,
          side: (first?.type ?? "BUY") as "BUY" | "SELL",
          type: "MARKET",
          quoteOrderQty: String(first?.amount ?? 0),
        } as any);
        const receipt = this.receiptStore.generateReceipt(
          planId,
          validationResult.sessionId,
          validationResult.proposal,
          validationResult.decision,
          "human"
        );
        (receipt as any).binanceOrderId = result.orderId || `binance_${Date.now()}`;
        (receipt as any).executed = true;
        this.receiptStore.save(receipt as any);
        receiptId = receipt.receiptHash;
        executedOnBinance = true;
      } catch (e: any) {
        const receipt = this.receiptStore.generateReceipt(
          planId,
          validationResult.sessionId,
          validationResult.proposal,
          validationResult.decision,
          "human"
        );
        (receipt as any).error = e.message || "Execution failed";
        this.receiptStore.save(receipt as any);
        receiptId = receipt.receiptHash;
      }
    }

    if (executedOnBinance && validationResult.plan) {
      this.sessionManager.incrementExecuted(
        validationResult.sessionId,
        validationResult.plan.totalRequested
      );
    } else {
      this.sessionManager.incrementBlocked(validationResult.sessionId);
    }

    return {
      ...validationResult,
      receiptId,
      executionAttempted: true,
      executedOnBinance,
      timestamp: new Date().toISOString(),
    };
  }

  async proposeAndExecute(
    proposal: string,
    sessionId?: string
  ): Promise<ValidationResult> {
    const validation = this.validate(proposal, sessionId);
    if (validation.decision !== "ALLOW") {
      this.sessionManager.incrementBlocked(validation.sessionId);
      return {
        ...validation,
        executionAttempted: false,
        executedOnBinance: false,
      };
    }

    return this.execute(validation);
  }

  getReceipt(receiptId: string) {
    return this.receiptStore.getReceipt(receiptId);
  }

  getAllReceipts() {
    return this.receiptStore.getAllReceipts();
  }

  parseIntent(description: string): IntentConstraint {
    return this.parser.parse(description);
  }

  normalizeProposal(proposal: string): Action[] {
    return this.normalizer.normalize(proposal);
  }
}

export { IntentraCompiler } from "./core/intentra-compiler";
export { IntentParser } from "./core/intent-parser";
export { ProposalNormalizer } from "./core/proposal-normalizer";
export { IntentChecker } from "./core/intent-checker";
export { TransactionPlanner } from "./core/transaction-planner";
export { SessionManager } from "./core/session-manager";
export { BinanceClient } from "./mcp/binance-client";
export { ReceiptStore } from "./core/receipt-store";
