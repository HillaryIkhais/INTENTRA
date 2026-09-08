// @ts-nocheck
import { randomBytes } from "crypto";
import {
  IntentConstraint,
  Proposal,
  TransactionPlan,
  Evaluation,
  Action,
  Violation,
  ViolationType,
  AgentAuthority,
  Session,
  SessionStatus,
  Revocation,
  Receipt,
  ExecutableAction,
  IntentraSdkConfig,
} from "../types/index.js";
import { IntentParser } from "./intent-parser.js";
import { ProposalNormalizer } from "./proposal-normalizer.js";
import { IntentChecker } from "./intent-checker.js";
import { BinanceMcpClient } from "../mcp/binance-client.js";
import { ReceiptStore } from "./receipt-store.js";

export class IntentraSdk {
  private config: IntentraSdkConfig;
  private parser = new IntentParser();
  private normalizer = new ProposalNormalizer();
  private checker = new IntentChecker();
  private binanceClient: BinanceMcpClient;
  private receiptStore: ReceiptStore;
  private authorities = new Map<string, AgentAuthority>();
  private sessions = new Map<string, Session>();
  private revocations = new Map<string, Revocation[]>();
  private activeIntent: IntentConstraint | null = null;
  private totalExecuted = 0;
  private totalBlocked = 0;
  private proposalHistory: Array<{
    plan: TransactionPlan;
    receipt?: Receipt;
    timestamp: string;
  }> = [];

  constructor(config?: IntentraSdkConfig) {
    this.config = config || {};
    this.binanceClient = new BinanceMcpClient({
      baseUrl: this.config.binanceBaseUrl || "https://agent.binance.com/mcp/agentic",
      clientId: this.config.binanceClientId,
    });
    this.receiptStore = new ReceiptStore(this.config.receiptsDir);
  }

  setIntent(intentText: string): IntentConstraint {
    const intent = this.parser.parse(intentText);
    this.activeIntent = intent;
    return intent;
  }

  getIntent(): IntentConstraint | null {
    return this.activeIntent;
  }

  propose(proposalText: string, sessionId?: string): TransactionPlan {
    if (!this.activeIntent) {
      throw new Error("No intent set. Call setIntent() first.");
    }

    return this.compile(this.activeIntent, proposalText, sessionId);
  }

  async execute(plan: TransactionPlan): Promise<{ executed: boolean; receipt?: Receipt }> {
    if (plan.result.decision === "BLOCK") {
      this.totalBlocked++;
      this.proposalHistory.push({
        plan,
        timestamp: new Date().toISOString(),
      });
      return { executed: false };
    }

    if (plan.result.decision === "APPROVAL_REQUIRED") {
      if (!this.config.autoApprove) {
        if (this.config.onApprovalRequired) {
          const approved = await this.config.onApprovalRequired(plan);
          if (!approved) {
            this.totalBlocked++;
            this.proposalHistory.push({
              plan,
              timestamp: new Date().toISOString(),
            });
            return { executed: false };
          }
        } else {
          throw new Error("Approval required but no approval handler configured");
        }
      }
    }

    const executableActions: ExecutableAction[] = plan.proposal.actions
      .filter(a => a.asset && a.amount > 0)
      .map(a => ({
        actionType: a.type.toLowerCase() as "buy" | "sell",
        asset: a.asset,
        amount: a.amount,
        constraints: plan.intent,
      }));

    if (this.config.mockExecution !== false && executableActions.length > 0) {
      const receipt: Receipt = {
        id: `receipt_${Date.now()}_${randomBytes(4).toString("hex")}`,
        planId: plan.id,
        intent: plan.intent,
        proposal: plan.proposal,
        result: plan.result,
        executed: true,
        executedAt: new Date().toISOString(),
        orderIds: ["MOCK_" + randomBytes(8).toString("hex")],
        totalAmount: plan.result.totals.totalSpend,
        fees: plan.result.totals.fees,
      };

      this.receiptStore.save(receipt);
      this.totalExecuted++;
      this.proposalHistory.push({
        plan,
        receipt,
        timestamp: new Date().toISOString(),
      });

      return { executed: true, receipt };
    }

    if (!this.binanceClient.isAuthenticated()) {
      await this.binanceClient.authenticate();
    }

    let receipt: Receipt | undefined;

    for (const action of executableActions) {
      const result = await this.binanceClient.executeTransaction(action);

      if (result.orderId) {
        if (!receipt) {
          receipt = {
            id: `receipt_${Date.now()}_${randomBytes(4).toString("hex")}`,
            planId: plan.id,
            intent: plan.intent,
            proposal: plan.proposal,
            result: plan.result,
            executed: true,
            executedAt: new Date().toISOString(),
            orderIds: [result.orderId],
            totalAmount: 0,
            fees: 0,
          };
        } else {
          receipt.orderIds.push(result.orderId);
        }
      }
    }

    if (receipt) {
      receipt.totalAmount = plan.result.totals.totalSpend;
      receipt.fees = plan.result.totals.fees;
      this.receiptStore.save(receipt);
    }

    this.totalExecuted++;
    this.proposalHistory.push({
      plan,
      receipt,
      timestamp: new Date().toISOString(),
    });

    return { executed: !!receipt, receipt };
  }

  async proposeAndExecute(proposalText: string, sessionId?: string): Promise<{
    plan: TransactionPlan;
    executed: boolean;
    receipt?: Receipt;
  }> {
    const plan = this.propose(proposalText, sessionId);
    const result = await this.execute(plan);
    return { plan, ...result };
  }

  createSession(
    agentId: string,
    intent: IntentConstraint,
    options: {
      durationMs?: number;
      maxProposals?: number;
      parentSessionId?: string;
    } = {}
  ): Session {
    const durationMs = options.durationMs || 60 * 60 * 1000;
    const maxProposals = options.maxProposals || 100;

    const session: Session = {
      id: `session_${Date.now()}_${randomBytes(4).toString("hex")}`,
      agentId,
      intent,
      constraints: { ...intent },
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
      parentSessionId: options.parentSessionId,
      maxProposals,
      proposalCount: 0,
      totalExecuted: 0,
      totalBlocked: 0,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.status === "active" && new Date(session.expiresAt) < new Date()) {
      session.status = "expired";
    }
    return session;
  }

  listSessions(agentId?: string): Session[] {
    const sessions = Array.from(this.sessions.values());
    if (agentId) {
      return sessions.filter(s => s.agentId === agentId);
    }
    return sessions;
  }

  revokeSession(
    sessionId: string,
    revokedBy: "human" | "system" | "timeout",
    reason: string
  ): Revocation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const now = new Date().toISOString();
    session.status = "revoked";
    session.revokedAt = now;
    session.revokedBy = revokedBy;
    session.revocationReason = reason;

    const revocation: Revocation = {
      sessionId,
      revokedBy,
      reason,
      timestamp: now,
    };

    const revocations = this.revocations.get(sessionId) || [];
    revocations.push(revocation);
    this.revocations.set(sessionId, revocations);

    return revocation;
  }

  getRevocations(sessionId: string): Revocation[] {
    return this.revocations.get(sessionId) || [];
  }

  getReceipt(receiptId: string): Receipt | undefined {
    return this.receiptStore.get(receiptId);
  }

  listReceipts(limit?: number): Receipt[] {
    return this.receiptStore.list(limit);
  }

  getStats(): {
    totalEvaluated: number;
    totalExecuted: number;
    totalBlocked: number;
    authorityScore: number;
    activeSessions: number;
  } {
    const totalEvaluated = this.totalExecuted + this.totalBlocked;
    const authorityScore = totalEvaluated > 0 ? Math.round((this.totalBlocked / totalEvaluated) * 100) : 100;

    return {
      totalEvaluated,
      totalExecuted: this.totalExecuted,
      totalBlocked: this.totalBlocked,
      authorityScore,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.status === "active").length,
    };
  }

  getHistory(): Array<{
    plan: TransactionPlan;
    receipt?: Receipt;
    timestamp: string;
  }> {
    return [...this.proposalHistory];
  }

  validateSubAuthority(
    parentAuthority: IntentConstraint,
    subAuthority: IntentConstraint
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    const newAssets = subAuthority.allowedAssets.filter(
      a => !parentAuthority.allowedAssets.includes(a)
    );
    if (newAssets.length > 0) {
      newAssets.forEach(asset => {
        violations.push({
          action: { type: "BUY", asset },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent granted asset ${asset} not in parent authority`,
        });
      });
    }

    const newActions = subAuthority.allowedActions.filter(
      a => !parentAuthority.allowedActions.includes(a)
    );
    if (newActions.length > 0) {
      newActions.forEach(action => {
        violations.push({
          action: { type: action as any, asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent granted action ${action} not in parent authority`,
        });
      });
    }

    if (subAuthority.maxTotalSpend && parentAuthority.maxTotalSpend) {
      if (subAuthority.maxTotalSpend > parentAuthority.maxTotalSpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent spending limit $${subAuthority.maxTotalSpend} exceeds parent limit $${parentAuthority.maxTotalSpend}`,
        });
      }
    }

    if (subAuthority.maxPerOrder && parentAuthority.maxPerOrder) {
      if (subAuthority.maxPerOrder > parentAuthority.maxPerOrder) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent per-order limit $${subAuthority.maxPerOrder} exceeds parent limit $${parentAuthority.maxPerOrder}`,
        });
      }
    }

    return { valid: violations.length === 0, violations };
  }

  private compile(
    intent: IntentConstraint,
    proposalText: string,
    sessionId?: string
  ): TransactionPlan {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      if (session.status !== "active") {
        throw new Error(`Session ${sessionId} is ${session.status}`);
      }
      if (new Date(session.expiresAt) < new Date()) {
        session.status = "expired";
        throw new Error(`Session ${sessionId} has expired`);
      }
      if (session.proposalCount >= session.maxProposals) {
        throw new Error(`Session ${sessionId} has exceeded max proposals`);
      }
      session.proposalCount++;
    }

    const mutationCheck = this.detectAuthorityMutation(proposalText);
    if (mutationCheck.isMutation) {
      const proposal: Proposal = {
        actions: [{ type: "BUY", asset: "", amount: 0 }],
        raw: proposalText,
      };

      const evaluation: Evaluation = {
        decision: "BLOCK",
        violations: mutationCheck.violations,
        explanations: mutationCheck.violations.map(v => v.reason),
        totals: { totalSpend: 0, fees: 0, maxSpend: 0 },
        requiresApproval: false,
      };

      const plan: TransactionPlan = {
        id: `plan_${Date.now()}_${randomBytes(4).toString("hex")}`,
        intent,
        proposal,
        result: evaluation,
        timestamp: new Date().toISOString(),
      };

      if (sessionId) {
        const session = this.sessions.get(sessionId)!;
        session.totalBlocked++;
      }

      return plan;
    }

    const rawActions = this.normalizer.normalize(proposalText);
    const proposal: Proposal = { actions: rawActions, raw: proposalText };

    const { violations, explanations, needsApproval, approvalReason } = this.checker.check(
      rawActions,
      intent
    );
    const totals = this.checker.getTotals(rawActions, intent);

    let decision: "BLOCK" | "ALLOW" | "APPROVAL_REQUIRED";
    if (violations.length > 0) {
      decision = "BLOCK";
    } else if (needsApproval) {
      decision = "APPROVAL_REQUIRED";
    } else {
      decision = "ALLOW";
    }

    const evaluation: Evaluation = {
      decision,
      violations,
      explanations,
      totals,
      requiresApproval: needsApproval,
      approvalReason: approvalReason || undefined,
    };

    const plan: TransactionPlan = {
      id: `plan_${Date.now()}_${randomBytes(4).toString("hex")}`,
      intent,
      proposal,
      result: evaluation,
      timestamp: new Date().toISOString(),
    };

    if (sessionId) {
      const session = this.sessions.get(sessionId)!;
      if (decision === "ALLOW" || decision === "APPROVAL_REQUIRED") {
        session.totalExecuted++;
      } else {
        session.totalBlocked++;
      }
    }

    return plan;
  }

  private detectAuthorityMutation(
    proposalText: string
  ): {
    isMutation: boolean;
    changes: Partial<IntentConstraint>;
    violations: Violation[];
  } {
    const upper = proposalText.toUpperCase().trim();
    const changes: Partial<IntentConstraint> = {};
    const violations: Violation[] = [];

    const dailyLimitMatch = proposalText.match(/(?:daily|day)\s*(?:limit|max|spend)?\s*(?:to|\$)?\s*(\d+(?:\.\d{2})?)/i);
    if (dailyLimitMatch) {
      const amount = parseFloat(dailyLimitMatch[1]);
      changes.maxDailySpend = amount;
    }

    const perOrderMatch = proposalText.match(/(?:per\s*order|order)\s*(?:limit|max|spend)?\s*(?:to|\$)?\s*(\d+(?:\.\d{2})?)/i);
    if (perOrderMatch) {
      const amount = parseFloat(perOrderMatch[1]);
      changes.maxPerOrder = amount;
    }

    const totalMatch = proposalText.match(/(?:total|overall)\s*(?:limit|max|spend)?\s*(?:to|\$)?\s*(\d+(?:\.\d{2})?)/i);
    if (totalMatch) {
      const amount = parseFloat(totalMatch[1]);
      changes.maxTotalSpend = amount;
    }

    const limitMatch = proposalText.match(/(?:limit|max|spend)\s*(?:to|\$)?\s*(\d+(?:\.\d{2})?)/i);
    if (limitMatch && Object.keys(changes).length === 0) {
      const amount = parseFloat(limitMatch[1]);
      changes.maxDailySpend = amount;
    }

    const mutationKeywords = [
      "increase",
      "decrease",
      "change",
      "modify",
      "set",
      "adjust",
      "update",
      "extend",
      "reduce",
      "raise",
      "lower",
      "mutate",
      "alter",
    ];

    const hasMutationKeyword = mutationKeywords.some(
      k => upper.includes(k.toUpperCase())
    );

    const isMutation =
      (hasMutationKeyword && Object.keys(changes).length > 0) ||
      upper.includes("MODIFY LIMIT") ||
      upper.includes("CHANGE LIMIT") ||
      upper.includes("INCREASE LIMIT") ||
      upper.includes("DECREASE LIMIT") ||
      upper.includes("SET LIMIT") ||
      upper.includes("ADJUST LIMIT") ||
      upper.includes("UPDATE LIMIT") ||
      upper.includes("EXTEND LIMIT") ||
      (upper.includes("LIMIT") && upper.includes("TO") && !upper.includes("BUY") && !upper.includes("SELL"));

    if (isMutation) {
      if (changes.maxDailySpend !== undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Agent attempting to modify daily limit to $${changes.maxDailySpend}`,
          constraint: "maxDailySpend",
        });
      }
      if (changes.maxPerOrder !== undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Agent attempting to modify per-order limit to $${changes.maxPerOrder}`,
          constraint: "maxPerOrder",
        });
      }
      if (changes.maxTotalSpend !== undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Agent attempting to modify total limit to $${changes.maxTotalSpend}`,
          constraint: "maxTotalSpend",
        });
      }

      if (violations.length === 0) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "POLICY_MUTATION" as ViolationType,
          reason: "Agent attempting to modify human-granted authority parameters",
          constraint: "authority parameters",
        });
      }
    }

    return { isMutation, changes, violations };
  }
}
