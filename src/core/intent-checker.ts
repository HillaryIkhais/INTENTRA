import { Action, IntentConstraint, Violation, ViolationType } from "../types/index.js";

/**
 * INTENTRA — Intent Checker
 *
 * The core authority enforcement layer.
 * This is where INTENTRA determines whether a proposed action
 * falls inside the authority the human actually granted.
 *
 * INVARIANT: Authority can only narrow. Never widen.
 *
 * THREE OUTCOMES:
 * - BLOCKED: Outside authority (e.g., $150 > $100 limit)
 * - APPROVAL_REQUIRED: Inside authority but needs human confirmation
 * - ALLOW: Inside authority and no approval needed
 */

const FEE_RATE = 0.001;
const ROUND_TRIP_FEE_RATE = 0.002;

export class IntentChecker {
  check(actions: Action[], constraint: IntentConstraint): {
    violations: Violation[];
    explanations: string[];
    needsApproval: boolean;
    approvalReason: string | null;
  } {
    const violations: Violation[] = [];
    const explanations: string[] = [];
    let needsApproval = false;
    let approvalReason: string | null = null;

    // Calculate total spend for approval check
    const totalSpend = actions.reduce((sum, a) => sum + (a.amount || 0), 0);

    // Check approval threshold FIRST (separate from violations)
    if (constraint.approvalThreshold && totalSpend > constraint.approvalThreshold) {
      needsApproval = true;
      approvalReason = `Total $${totalSpend} exceeds approval threshold of $${constraint.approvalThreshold}`;
    } else if (constraint.requireApprovalAbove && totalSpend > constraint.requireApprovalAbove) {
      needsApproval = true;
      approvalReason = `Total $${totalSpend} requires approval above $${constraint.requireApprovalAbove}`;
    }

    // Check actual authority violations (these BLOCK the trade)
    for (const action of actions) {
      // 1. Action authority
      if (!constraint.allowedActions.includes(action.type)) {
        violations.push({
          action,
          type: "ACTION_PROHIBITED" as ViolationType,
          reason: `Action ${action.type} is not in allowed actions: ${constraint.allowedActions.join(", ")}`,
          constraint: `allowedActions: [${constraint.allowedActions.join(", ")}]`,
        });
        explanations.push(`${action.type} ${action.asset} is not authorized`);
      }

      // 2. Asset authority
      if (action.asset && !constraint.allowedAssets.includes(action.asset)) {
        violations.push({
          action,
          type: "ASSET_RESTRICTED" as ViolationType,
          reason: `Asset ${action.asset} is not in allowed assets: ${constraint.allowedAssets.join(", ")}`,
          constraint: `allowedAssets: [${constraint.allowedAssets.join(", ")}]`,
        });
        explanations.push(`${action.asset} is not authorized`);
      }

      // 3. Per-order limit (this BLOCKS)
      if (action.amount && constraint.maxPerOrder && action.amount > constraint.maxPerOrder) {
        violations.push({
          action,
          type: "LIMIT_EXCEEDED" as ViolationType,
          reason: `Single order $${action.amount} exceeds per-order limit of $${constraint.maxPerOrder}`,
          constraint: `maxPerOrder: $${constraint.maxPerOrder}`,
        });
        explanations.push(`${action.type} ${action.asset} $${action.amount} exceeds per-order limit`);
      }

      // 4. Total spend limit (this BLOCKS)
      if (action.amount && constraint.maxTotalSpend && action.amount > constraint.maxTotalSpend) {
        violations.push({
          action,
          type: "LIMIT_EXCEEDED" as ViolationType,
          reason: `Amount $${action.amount} exceeds total spend limit of $${constraint.maxTotalSpend}`,
          constraint: `maxTotalSpend: $${constraint.maxTotalSpend}`,
        });
        explanations.push(`Amount $${action.amount} exceeds total spend limit`);
      }

      // 5. Prohibited actions (this BLOCKS)
      if (constraint.prohibitedActions.includes(action.type)) {
        violations.push({
          action,
          type: "ACTION_PROHIBITED" as ViolationType,
          reason: `Action ${action.type} is explicitly prohibited`,
          constraint: `prohibitedActions: [${constraint.prohibitedActions.join(", ")}]`,
        });
        explanations.push(`${action.type} is explicitly prohibited`);
      }

      // 6. Expiry (this BLOCKS)
      if (constraint.expiresAt) {
        const expiry = new Date(constraint.expiresAt);
        if (expiry < new Date()) {
          violations.push({
            action,
            type: "EXPIRED" as ViolationType,
            reason: `Authority expired at ${constraint.expiresAt}`,
            constraint: `expiresAt: ${constraint.expiresAt}`,
          });
          explanations.push(`Authority has expired`);
        }
      }

      // 7. Intent constraints (this BLOCKS)
      if (constraint.prohibitedActions.includes("SELL") && action.type === "SELL") {
        violations.push({
          action,
          type: "INTENT_VIOLATION" as ViolationType,
          reason: `SELL is prohibited by declared intent`,
          constraint: `prohibitedActions: [${constraint.prohibitedActions.join(", ")}]`,
        });
        explanations.push(`SELL is prohibited by declared intent`);
      }
    }

    // Aggregate limit check (this BLOCKS)
    if (constraint.maxTotalSpend) {
      if (totalSpend > constraint.maxTotalSpend) {
        violations.push({
          action: actions[0],
          type: "BUDGET_EXCEEDED" as ViolationType,
          reason: `Projected total $${totalSpend} exceeds limit of $${constraint.maxTotalSpend}`,
          constraint: `maxTotalSpend: $${constraint.maxTotalSpend}`,
        });
        explanations.push(`Total spend $${totalSpend} exceeds limit`);
      }
    }

    // Daily limit check (this BLOCKS)
    if (constraint.maxDailySpend) {
      if (totalSpend > constraint.maxDailySpend) {
        violations.push({
          action: actions[0],
          type: "LIMIT_EXCEEDED" as ViolationType,
          reason: `Daily spend $${totalSpend} exceeds limit of $${constraint.maxDailySpend}`,
          constraint: `maxDailySpend: $${constraint.maxDailySpend}`,
        });
        explanations.push(`Daily spend $${totalSpend} exceeds limit`);
      }
    }

    return { violations, explanations, needsApproval, approvalReason };
  }

  getTotals(actions: Action[], constraint: IntentConstraint): {
    totalSpend: number;
    fees: number;
    maxSpend: number;
  } {
    const totalSpend = actions.reduce((sum, a) => sum + (a.amount || 0), 0);
    const fees = totalSpend * FEE_RATE;
    const maxSpend = constraint.maxTotalSpend || totalSpend;

    return { totalSpend, fees, maxSpend };
  }
}
