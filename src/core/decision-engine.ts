// @ts-nocheck
import { Action, IntentConstraint, Violation, ViolationType, StateUpdate, Totals } from "../types/index.js";

/**
 * INTENTRA — Decision Engine
 *
 * Makes ALLOW/BLOCK decisions based on constraint checking.
 * This is where INTENTRA enforces the authority boundary.
 */

const FEE_RATE = 0.001;
const ROUND_TRIP_FEE_RATE = 0.002;

export interface Decision {
  decision: "BLOCK" | "ALLOW";
  violations: Violation[];
  explanations: string[];
  totals: Totals;
  stateUpdate?: StateUpdate;
}

export class DecisionEngine {
  private state: StateUpdate = {
    usedTotal: 0,
    usedToday: 0,
    lastOrderTime: "",
    approvedOrders: 0,
  };

  check(
    actions: Action[],
    constraint: IntentConstraint,
    forceApproval?: boolean
  ): Decision {
    const violations: Violation[] = [];
    const explanations: string[] = [];

    // Check each action
    for (const action of actions) {
      // Action authority
      if (!constraint.allowedActions.includes(action.type)) {
        violations.push({
          action,
          type: "ACTION_PROHIBITED",
          reason: `Action ${action.type} is not authorized`,
        });
      }

      // Asset authority
      if (!constraint.allowedAssets.includes(action.asset)) {
        violations.push({
          action,
          type: "ASSET_RESTRICTED",
          reason: `Asset ${action.asset} is not authorized`,
        });
      }

      // Per-order limit
      if (action.amount && constraint.maxPerOrder && action.amount > constraint.maxPerOrder) {
        violations.push({
          action,
          type: "LIMIT_EXCEEDED",
          reason: `Amount $${action.amount} exceeds per-order limit of $${constraint.maxPerOrder}`,
        });
      }

      // Total spend limit
      if (action.amount && constraint.maxTotalSpend && action.amount > constraint.maxTotalSpend) {
        violations.push({
          action,
          type: "LIMIT_EXCEEDED",
          reason: `Amount $${action.amount} exceeds total spend limit of $${constraint.maxTotalSpend}`,
        });
      }

      // Daily limit
      if (action.amount && constraint.maxDailySpend) {
        const projected = this.state.usedToday + action.amount;
        if (projected > constraint.maxDailySpend) {
          violations.push({
            action,
            type: "DAILY_LIMIT_EXCEEDED",
            reason: `Projected daily spend $${projected} exceeds limit of $${constraint.maxDailySpend}`,
          });
        }
      }

      // Aggregate limit
      if (action.amount && constraint.maxTotalSpend) {
        const projected = this.state.usedTotal + action.amount;
        if (projected > constraint.maxTotalSpend) {
          violations.push({
            action,
            type: "AGGREGATE_EXCEEDED",
            reason: `Projected total $${projected} exceeds limit of $${constraint.maxTotalSpend}`,
          });
        }
      }

      // Approval threshold
      if (action.amount && constraint.approvalThreshold && action.amount > constraint.approvalThreshold) {
        violations.push({
          action,
          type: "CONDITION_NOT_MET",
          reason: `Amount $${action.amount} exceeds approval threshold of $${constraint.approvalThreshold}`,
        });
      }

      // Expiry
      if (constraint.expiresAt && new Date(constraint.expiresAt) < new Date()) {
        violations.push({
          action,
          type: "EXPIRED",
          reason: `Authority expired at ${constraint.expiresAt}`,
        });
      }
    }

    // Calculate totals
    const totalSpend = actions.reduce((sum, a) => sum + (a.amount || 0), 0);
    const fees = totalSpend * FEE_RATE;
    const maxSpend = constraint.maxTotalSpend || totalSpend;

    const totals: Totals = { totalSpend, fees, maxSpend };

    // Decision
    const decision = violations.length > 0 ? "BLOCK" : "ALLOW";

    // State update
    const stateUpdate: StateUpdate = {
      usedTotal: this.state.usedTotal + totalSpend,
      usedToday: this.state.usedToday + totalSpend,
      lastOrderTime: new Date().toISOString(),
      approvedOrders: this.state.approvedOrders + (decision === "ALLOW" ? 1 : 0),
    };

    this.state = stateUpdate;

    return {
      decision,
      violations,
      explanations: violations.map(v => v.reason),
      totals,
      stateUpdate,
    };
  }
}
