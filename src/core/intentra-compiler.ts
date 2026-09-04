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
  StateUpdate,
  Totals,
  TransactionPlanner,
  Session,
  SessionStatus,
  Revocation,
  AgentId,
} from "../types/index.js";
import { IntentParser } from "./intent-parser.js";
import { ProposalNormalizer } from "./proposal-normalizer.js";
import { IntentChecker } from "./intent-checker.js";

/**
 * INTENTRA — The Transaction Compiler
 *
 * Compiles agent proposals against declared intent.
 * This is the authority enforcement layer.
 *
 * The invariant: Authority can only narrow. Never widen.
 */

export class IntentraCompiler {
  private parser = new IntentParser();
  private normalizer = new ProposalNormalizer();
  private checker = new IntentChecker();
  private decisionEngine = new DecisionEngine();
  private authorities = new Map<string, AgentAuthority>();
  private sessions = new Map<string, Session>();
  private revocations = new Map<string, Revocation[]>();

  compile(
    intentText: string,
    proposalText: string,
    agentId?: string,
    sessionId?: string
  ): TransactionPlan {
    // Check if session is valid
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

    // Check for authority mutation attempts FIRST
    const mutationCheck = this.detectAuthorityMutation(proposalText, agentId);
    if (mutationCheck.isMutation) {
      // This is an authority mutation attempt
      const intent = this.parser.parse(intentText);
      const proposal: Proposal = {
        actions: [{ type: "BUY", asset: "", amount: 0 }],
        raw: proposalText,
      };

      let decision: "BLOCK" | "ALLOW" | "APPROVAL_REQUIRED" = "BLOCK";
      if (agentId) {
        // Register authority if not exists
        if (!this.authorities.has(agentId)) {
          this.registerAuthority(agentId, intent);
        }

        // Check the specific mutation
        const result = this.checkAuthorityMutation(agentId, mutationCheck.changes);
        if (result.allowed) {
          // Should never happen for mutation attempts
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

      if (sessionId) {
        const session = this.sessions.get(sessionId)!;
        if (decision === "ALLOW") {
          session.totalExecuted++;
        } else {
          session.totalBlocked++;
        }
      }

      return plan;
    }

    // Normal compilation path
    const intent = this.parser.parse(intentText);
    const rawActions = this.normalizer.normalize(proposalText);
    const proposal: Proposal = { actions: rawActions, raw: proposalText };

    const { violations, explanations, needsApproval, approvalReason } = this.checker.check(
      rawActions,
      intent
    );
    const totals = this.checker.getTotals(rawActions, intent);

    // Determine decision based on THREE outcomes
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

    // Update session stats
    if (sessionId) {
      const session = this.sessions.get(sessionId)!;
      if (decision === "ALLOW" || decision === "APPROVAL_REQUIRED") {
        // APPROVAL_REQUIRED is still within authority
        session.totalExecuted++;
      } else {
        session.totalBlocked++;
      }
    }

    return plan;
  }

  /**
   * Detect authority mutation attempts in proposal text
   *
   * These are attempts by the agent to modify:
   * - maxDailySpend, maxPerOrder, maxTotalSpend
   * - allowedAssets, allowedActions
   * - approvalThreshold, requireApprovalAbove
   * - session expiry
   */
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
      // Generic "limit to $500" — assume daily limit
      const amount = parseFloat(limitMatch[1]);
      changes.maxDailySpend = amount;
    }

    // Detect keywords for authority modification
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

    // Detect asset modification
    const assetMatch = proposalText.match(/(?:add|allow|include)\s+(\w{2,10})\s+(?:to|in)/i);
    if (assetMatch && hasMutationKeyword) {
      // This is trying to add a new asset to allowed list
      // We can't know the current allowed list without agentId,
      // but we can flag it as a mutation attempt
    }

    // Determine if this is a mutation attempt
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
      // Build violations
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

      // Generic violation if no specific changes detected
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

  validateSubAuthority(
    parentAuthority: IntentConstraint,
    subAuthority: IntentConstraint
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    // Check: sub-agent cannot have wider allowed assets
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

    // Check: sub-agent cannot have wider allowed actions
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

    // Check: sub-agent cannot have wider spending limits
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

  registerAuthority(agentId: string, authority: IntentConstraint, parentId?: string): void {
    this.authorities.set(agentId, {
      agentId,
      parentId,
      constraints: authority,
      state: {
        usedTotal: 0,
        usedToday: 0,
        lastOrderTime: "",
        approvedOrders: 0,
      },
      timestamp: new Date().toISOString(),
    });
  }

  getAuthority(agentId: string): AgentAuthority | undefined {
    return this.authorities.get(agentId);
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  //
  // Time-boxed authority. Sessions expire. Revocation is instant.
  // ═══════════════════════════════════════════════════════════════

  createSession(
    agentId: string,
    intent: IntentConstraint,
    options: {
      durationMs?: number;
      maxProposals?: number;
      parentSessionId?: string;
    } = {}
  ): Session {
    const durationMs = options.durationMs || 60 * 60 * 1000; // 1 hour default
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

  // ═══════════════════════════════════════════════════════════════
  // REVOCATION
  //
  // Revocation is instant. No grace period. No negotiation.
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  // AUTHORITY ENFORCEMENT
  //
  // The thing being governed cannot rewrite the rules governing itself.
  // ═══════════════════════════════════════════════════════════════

  checkAuthorityMutation(
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

    // Check: agent cannot widen allowed assets
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

    // Check: agent cannot widen allowed actions
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

    // Check: agent cannot increase spending limits
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

    // Check: agent cannot remove restrictions
    if (proposedChanges.prohibitedActions) {
      const removed = authority.constraints.prohibitedActions.filter(
        a => !proposedChanges.prohibitedActions!.includes(a)
      );
      if (removed.length > 0) {
        removed.forEach(action => {
          violations.push({
            action: { type: action as any, asset: "" },
            type: "AUTHORITY_WIDENING",
            reason: `Agent attempting to remove prohibition on ${action}`,
          });
        });
      }
    }

    // Check: agent cannot change expiry to extend authority
    if (proposedChanges.expiresAt && authority.constraints.expiresAt) {
      const newExpiry = new Date(proposedChanges.expiresAt);
      const currentExpiry = new Date(authority.constraints.expiresAt);
      if (newExpiry > currentExpiry) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `Agent attempting to extend authority expiry`,
        });
      }
    }

    return { allowed: violations.length === 0, violations };
  }
}
