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
  Revocation,
} from "./types/index.js";
import { IntentParser } from "./core/intent-parser.js";
import { ProposalNormalizer } from "./core/proposal-normalizer.js";
import { IntentChecker } from "./core/intent-checker.js";
import { ReceiptStore } from "./core/receipt-store.js";

/**
 * INTENTRA — Authority Provenance Layer for Agent Chains
 *
 * "AI agents can delegate. Authority cannot."
 *
 * Every authorization gets a lineage. A child agent can inherit authority.
 * It can never manufacture more.
 *
 * The invariant: Authority can only narrow. Never widen.
 *
 * SDK Usage:
 *   import { Intentra } from "intentra";
 *   const intentra = new Intentra();
 *
 *   // Create a session (time-boxed authority)
 *   const session = intentra.createSession(
 *     "agent-123",
 *     "Buy BTC only. Max $100 per order. Max $200 per day.",
 *     { durationMs: 60 * 60 * 1000 } // 1 hour
 *   );
 *
 *   // Check if agent proposal is authorized
 *   const plan = intentra.compile(session.id, "Buy $90 BTC");
 *   console.log(plan.result.decision); // ALLOW | BLOCK | APPROVAL_REQUIRED
 *
 *   // Validate sub-agent delegation
 *   const result = intentra.validateSubAuthority(
 *     "Buy BTC and ETH. Max $500 total.",
 *     "Buy BTC only. Max $100 total."
 *   );
 *   console.log(result.valid); // true (narrower is ok)
 *
 *   // Revoke instantly
 *   intentra.revokeSession(session.id, "human", "Unauthorized activity detected");
 *
 * @version 2.0.0
 * @see https://intentra-three.vercel.app
 */

export class Intentra {
  private parser = new IntentParser();
  private normalizer = new ProposalNormalizer();
  private checker = new IntentChecker();
  private receipts: ReceiptStore;

  private sessions = new Map<string, Session>();
  private revocations = new Map<string, Revocation[]>();
  private authorities = new Map<string, AgentAuthority>();
  private executedAmount = 0;

  constructor(receiptsDir?: string) {
    this.receipts = new ReceiptStore(receiptsDir);
  }

  /**
   * Compile an agent proposal against declared intent.
   *
   * This is the authority enforcement layer.
   *
   * @param sessionId - Session ID from createSession()
   * @param proposalText - The agent's proposal (e.g., "Buy $90 BTC")
   * @returns TransactionPlan with decision (ALLOW | BLOCK | APPROVAL_REQUIRED)
   *
   * @example
   * const plan = intentra.compile(session.id, "Buy $90 BTC");
   * if (plan.result.decision === "ALLOW") {
   *   // Execute on Binance MCP
   * }
   */
  compile(sessionId: string, proposalText: string): TransactionPlan {
    // Check if session is valid
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

    // Check for authority mutation attempts FIRST
    const mutationCheck = this.detectAuthorityMutation(proposalText, session.agentId);
    if (mutationCheck.isMutation) {
      const intent = session.intent;
      const proposal: Proposal = {
        actions: [{ type: "BUY", asset: "", amount: 0 }],
        raw: proposalText,
      };

      // Self-modification of authority is never allowed, even when the
      // parser cannot extract specific field changes (generic POLICY_MUTATION).
      // Authority can only narrow via a parent session, never via self-edit.
      let decision: "BLOCK" | "ALLOW" | "APPROVAL_REQUIRED" = "BLOCK";
      if (Object.keys(mutationCheck.changes).length > 0) {
        const result = this.checkAuthorityMutation(session.agentId, mutationCheck.changes);
        if (result.allowed) {
          decision = "ALLOW";
        }
      }

      const violations: Violation[] = mutationCheck.violations;
      const evaluation: Evaluation = {
        decision,
        violations,
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

      session.totalBlocked++;
      return plan;
    }

    // Normal compilation path
    const intent = session.intent;
    const rawActions = this.normalizer.normalize(proposalText);
    const proposal: Proposal = { actions: rawActions, raw: proposalText };

    // Check daily budget including already executed amount
    const dailyBudget = intent.maxDailySpend || 0;
    const newAmount = rawActions.reduce((sum, a) => sum + a.amount, 0);
    const aggregateAmount = this.executedAmount + newAmount;

    // Build extended violations list
    const baseCheck = this.checker.check(rawActions, intent);
    const violations = [...baseCheck.violations];
    const explanations = [...baseCheck.explanations];

    // Add aggregate check if violated
    if (aggregateAmount > dailyBudget) {
      const existingDailyViolation = violations.find(
        (v) => v.type === "DAILY_LIMIT_EXCEEDED"
      );
      if (!existingDailyViolation) {
        violations.push({
          action: rawActions[0] || { type: "BUY", asset: "", amount: 0 },
          type: "DAILY_LIMIT_EXCEEDED",
          reason: `Aggregate would exceed daily budget: ${this.executedAmount} spent + ${newAmount} proposed > ${dailyBudget} max`,
          constraint: "maxDailySpend",
        });
        explanations.push(
          `Aggregate would exceed daily budget: ${this.executedAmount} spent + ${newAmount} proposed > ${dailyBudget} max`
        );
      }
    }

    const totals = this.checker.getTotals(rawActions, intent);
    const needsApproval = baseCheck.needsApproval;
    const approvalReason = baseCheck.approvalReason;

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

    if (decision === "ALLOW" || decision === "APPROVAL_REQUIRED") {
      session.totalExecuted++;
    } else {
      session.totalBlocked++;
    }

    return plan;
  }

  /**
   * Create a session (time-boxed authority).
   *
   * Sessions expire. Revocation is instant.
   *
   * @param agentId - Unique identifier for the agent
   * @param intentText - Human-declared intent (e.g., "Buy BTC only. Max $100 per order.")
   * @param options - Session options (duration, max proposals)
   * @returns Session object with ID, expiry, etc.
   *
   * @example
   * const session = intentra.createSession(
   *   "agent-123",
   *   "Buy BTC only. Max $100 per order.",
   *   { durationMs: 60 * 60 * 1000 } // 1 hour
   * );
   */
  createSession(
    agentId: string,
    intentText: string,
    options: {
      durationMs?: number;
      maxProposals?: number;
      parentSessionId?: string;
    } = {}
  ): Session {
    const durationMs = options.durationMs || 60 * 60 * 1000; // 1 hour default
    const maxProposals = options.maxProposals || 100;
    const intent = this.parser.parse(intentText);

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

    // Register authority for this agent
    this.authorities.set(agentId, {
      agentId,
      parentId: options.parentSessionId,
      constraints: intent,
      state: {
        usedTotal: 0,
        usedToday: 0,
        lastOrderTime: "",
        approvedOrders: 0,
      },
      timestamp: new Date().toISOString(),
    });

    return session;
  }

  /**
   * Get a session by ID.
   *
   * @param sessionId - Session ID from createSession()
   * @returns Session object or undefined
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.status === "active" && new Date(session.expiresAt) < new Date()) {
      session.status = "expired";
    }
    return session;
  }

  /**
   * List all sessions (optionally filtered by agent).
   *
   * @param agentId - Optional agent ID to filter
   * @returns Array of Session objects
   */
  listSessions(agentId?: string): Session[] {
    const sessions = Array.from(this.sessions.values());
    if (agentId) {
      return sessions.filter(s => s.agentId === agentId);
    }
    return sessions;
  }

  /**
   * Revoke a session instantly.
   *
   * Revocation is instant. No grace period. No negotiation.
   *
   * @param sessionId - Session ID to revoke
   * @param revokedBy - Who is revoking ("human" | "system" | "timeout")
   * @param reason - Reason for revocation
   * @returns Revocation object
   *
   * @example
   * intentra.revokeSession(
   *   session.id,
   *   "human",
   *   "Unauthorized activity detected"
   * );
   */
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

  /**
   * Get revocation history for a session.
   *
   * @param sessionId - Session ID
   * @returns Array of Revocation objects
   */
  getRevocations(sessionId: string): Revocation[] {
    return this.revocations.get(sessionId) || [];
  }

  /**
   * Validate that a sub-agent's authority does not exceed its parent's.
   *
   * The invariant: Authority can only narrow. Never widen.
   *
   * @param parentIntent - Parent agent's intent text
   * @param subIntent - Sub-agent's proposed intent text
   * @returns { valid: boolean; violations: Violation[] }
   *
   * @example
   * const result = intentra.validateSubAuthority(
   *   "Buy BTC and ETH. Max $500 total.",
   *   "Buy BTC only. Max $100 total."
   * );
   * console.log(result.valid); // true (narrower is ok)
   */
  validateSubAuthority(
    parentIntent: string,
    subIntent: string
  ): { valid: boolean; violations: Violation[] } {
    const parent = this.parser.parse(parentIntent);
    const sub = this.parser.parse(subIntent);

    const violations: Violation[] = [];

    // Check: sub-agent cannot have wider allowed assets
    const newAssets = sub.allowedAssets.filter(
      a => !parent.allowedAssets.includes(a)
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

    // Check: sub-agent cannot have wider allowed actions
    const newActions = sub.allowedActions.filter(
      a => !parent.allowedActions.includes(a)
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

    // Check: sub-agent cannot have wider spending limits
    if (sub.maxTotalSpend && parent.maxTotalSpend) {
      if (sub.maxTotalSpend > parent.maxTotalSpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent spending limit $${sub.maxTotalSpend} exceeds parent limit $${parent.maxTotalSpend}`,
        });
      }
    }

    if (sub.maxPerOrder && parent.maxPerOrder) {
      if (sub.maxPerOrder > parent.maxPerOrder) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent per-order limit $${sub.maxPerOrder} exceeds parent limit $${parent.maxPerOrder}`,
        });
      }
    }

    if (sub.maxDailySpend && parent.maxDailySpend) {
      if (sub.maxDailySpend > parent.maxDailySpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Sub-agent daily limit $${sub.maxDailySpend} exceeds parent limit $${parent.maxDailySpend}`,
        });
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Record execution of a plan.
   *
   * Call this after Binance MCP confirms execution.
   *
   * @param planId - Plan ID from compile()
   * @param executionData - Execution data from Binance
   */
  recordExecution(planId: string, executionData: { orderId?: string; timestamp?: string } = {}): void {
    let receipt = this.receipts.get(planId);
    if (!receipt) {
      // No receipt exists yet (compile() does not create one) — create a
      // minimal mock receipt so demo/mock flows have verifiable output.
      // Real Binance flows should generate the receipt first, then record.
      receipt = this.receipts.generateReceipt(planId, planId, planId, "ALLOW", "human");
    }
    receipt.executed = true;
    receipt.executedAt = executionData.timestamp || new Date().toISOString();
    if (executionData.orderId) {
      receipt.orderId = executionData.orderId;
    }
    this.receipts.save(receipt);

    // Update executed amount for daily budget tracking
    // Note: This is simplified - real tracking would need the actual amounts
  }

  /**
   * Get a receipt by plan ID.
   *
   * @param planId - Plan ID from compile()
   * @returns Receipt object or undefined
   */
  getReceipt(planId: string) {
    return this.receipts.get(planId);
  }

  /**
   * Get all receipts.
   *
   * @returns Array of Receipt objects
   */
  getAllReceipts() {
    return this.receipts.getAll();
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private detectAuthorityMutation(
    proposalText: string,
    agentId?: string
  ): {
    isMutation: boolean;
    changes: Partial<IntentConstraint>;
    violations: Violation[];
  } {
    const upper = proposalText.toUpperCase().trim();
    const changes: Partial<IntentConstraint> = {};
    const violations: Violation[] = [];

    // Detect limit modification attempts
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
      "increase", "decrease", "change", "modify", "set", "adjust",
      "update", "extend", "reduce", "raise", "lower", "mutate", "alter",
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

  private checkAuthorityMutation(
    agentId: string,
    proposedChanges: Partial<IntentConstraint>
  ): { allowed: boolean; violations: Violation[] } {
    const authority = this.authorities.get(agentId);
    if (!authority) {
      return {
        allowed: false,
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "POLICY_MUTATION",
          reason: `No authority registered for agent ${agentId}`,
        }],
      };
    }

    const violations: Violation[] = [];

    if (proposedChanges.allowedAssets) {
      const newAssets = proposedChanges.allowedAssets.filter(
        a => !authority.constraints.allowedAssets.includes(a)
      );
      if (newAssets.length > 0) {
        newAssets.forEach(asset => {
          violations.push({
            action: { type: "BUY", asset },
            type: "AUTHORITY_WIDENING",
            reason: `Agent attempting to add asset ${asset} to allowed list`,
          });
        });
      }
    }

    if (proposedChanges.allowedActions) {
      const newActions = proposedChanges.allowedActions.filter(
        a => !authority.constraints.allowedActions.includes(a as any)
      );
      if (newActions.length > 0) {
        newActions.forEach(action => {
          violations.push({
            action: { type: action as any, asset: "" },
            type: "AUTHORITY_WIDENING",
            reason: `Agent attempting to add action ${action} to allowed list`,
          });
        });
      }
    }

    if (proposedChanges.maxTotalSpend && authority.constraints.maxTotalSpend) {
      if (proposedChanges.maxTotalSpend > authority.constraints.maxTotalSpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Agent attempting to increase total spend from $${authority.constraints.maxTotalSpend} to $${proposedChanges.maxTotalSpend}`,
        });
      }
    }

    if (proposedChanges.maxDailySpend && authority.constraints.maxDailySpend) {
      if (proposedChanges.maxDailySpend > authority.constraints.maxDailySpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Agent attempting to increase daily limit from $${authority.constraints.maxDailySpend} to $${proposedChanges.maxDailySpend}`,
        });
      }
    }

    if (proposedChanges.maxPerOrder && authority.constraints.maxPerOrder) {
      if (proposedChanges.maxPerOrder > authority.constraints.maxPerOrder) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Agent attempting to increase per-order limit from $${authority.constraints.maxPerOrder} to $${proposedChanges.maxPerOrder}`,
        });
      }
    }

    return { allowed: violations.length === 0, violations };
  }
}

export default Intentra;
