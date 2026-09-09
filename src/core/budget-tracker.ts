import { Capability } from "../types";

export interface BudgetState {
  capabilityId: string;
  rootId: string;
  maxTotalSpend: number;
  maxDailySpend: number;
  maxPerOrder: number;
  totalAllocated: number;
  totalSpent: number;
  dailySpent: number;
  dailySpentAt: string;
  children: string[];
  concurrentExposure: number;
}

export interface BudgetCheckResult {
  valid: boolean;
  reason?: string;
  code?: string;
}

export class BudgetTracker {
  private budgets: Map<string, BudgetState> = new Map();

  registerRoot(cap: Capability): void {
    const c = cap.constraints;
    this.budgets.set(cap.id, {
      capabilityId: cap.id,
      rootId: cap.id,
      maxTotalSpend: c.maxTotalSpend ?? Infinity,
      maxDailySpend: c.maxDailySpend ?? Infinity,
      maxPerOrder: c.maxPerOrder ?? Infinity,
      totalAllocated: 0,
      totalSpent: 0,
      dailySpent: 0,
      dailySpentAt: new Date().toISOString().slice(0, 10),
      children: [],
      concurrentExposure: 0,
    });
  }

  registerDelegation(parentId: string, child: Capability): BudgetCheckResult {
    const parentBudget = this.budgets.get(parentId);
    if (!parentBudget) {
      return { valid: true };
    }

    const childConstraints = child.constraints;
    const childMaxTotal = childConstraints.maxTotalSpend ?? Infinity;
    const childMaxDaily = childConstraints.maxDailySpend ?? Infinity;
    const childMaxPerOrder = childConstraints.maxPerOrder ?? Infinity;

    const newTotalAllocated = parentBudget.totalAllocated + childMaxTotal;
    if (newTotalAllocated > parentBudget.maxTotalSpend) {
      return {
        valid: false,
        reason: `Aggregate allocation $${newTotalAllocated.toFixed(2)} exceeds parent total budget $${parentBudget.maxTotalSpend.toFixed(2)} (adding child $${childMaxTotal.toFixed(2)})`,
        code: "AGGREGATE_TOTAL_EXCEEDED",
      };
    }

    const newDailyAllocated = parentBudget.dailySpent + childMaxDaily;
    if (newDailyAllocated > parentBudget.maxDailySpend) {
      return {
        valid: false,
        reason: `Aggregate daily allocation $${newDailyAllocated.toFixed(2)} exceeds parent daily budget $${parentBudget.maxDailySpend.toFixed(2)}`,
        code: "AGGREGATE_DAILY_EXCEEDED",
      };
    }

    parentBudget.totalAllocated += childMaxTotal;
    parentBudget.children.push(child.id);

    this.budgets.set(child.id, {
      capabilityId: child.id,
      rootId: parentBudget.rootId,
      maxTotalSpend: childMaxTotal,
      maxDailySpend: childMaxDaily,
      maxPerOrder: childMaxPerOrder,
      totalAllocated: 0,
      totalSpent: 0,
      dailySpent: 0,
      dailySpentAt: new Date().toISOString().slice(0, 10),
      children: [],
      concurrentExposure: 0,
    });

    return { valid: true };
  }

  recordExecution(capabilityId: string, amount: number): BudgetCheckResult {
    const budget = this.budgets.get(capabilityId);
    if (!budget) {
      return { valid: false, reason: "Capability not tracked", code: "NOT_FOUND" };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (budget.dailySpentAt !== today) {
      budget.dailySpent = 0;
      budget.dailySpentAt = today;
    }

    const newTotalSpent = budget.totalSpent + amount;
    if (newTotalSpent > budget.maxTotalSpend) {
      return {
        valid: false,
        reason: `Total spent $${newTotalSpent.toFixed(2)} exceeds limit $${budget.maxTotalSpend.toFixed(2)}`,
        code: "TOTAL_SPEND_EXCEEDED",
      };
    }

    const newDailySpent = budget.dailySpent + amount;
    if (newDailySpent > budget.maxDailySpend) {
      return {
        valid: false,
        reason: `Daily spent $${newDailySpent.toFixed(2)} exceeds limit $${budget.maxDailySpend.toFixed(2)}`,
        code: "DAILY_SPEND_EXCEEDED",
      };
    }

    if (amount > budget.maxPerOrder) {
      return {
        valid: false,
        reason: `Order amount $${amount.toFixed(2)} exceeds per-order limit $${budget.maxPerOrder.toFixed(2)}`,
        code: "PER_ORDER_EXCEEDED",
      };
    }

    budget.totalSpent = newTotalSpent;
    budget.dailySpent = newDailySpent;

    const rootBudget = this.budgets.get(budget.rootId);
    if (rootBudget) {
      rootBudget.concurrentExposure += amount;
    }

    return { valid: true };
  }

  releaseExposure(capabilityId: string, amount: number): void {
    const budget = this.budgets.get(capabilityId);
    if (!budget) return;

    const rootBudget = this.budgets.get(budget.rootId);
    if (rootBudget) {
      rootBudget.concurrentExposure = Math.max(0, rootBudget.concurrentExposure - amount);
    }
  }

  getBudget(capabilityId: string): BudgetState | undefined {
    return this.budgets.get(capabilityId);
  }

  getTreeBudget(rootId: string): {
    totalAllocated: number;
    totalSpent: number;
    dailySpent: number;
    concurrentExposure: number;
    childCount: number;
  } {
    const root = this.budgets.get(rootId);
    if (!root) {
      return { totalAllocated: 0, totalSpent: 0, dailySpent: 0, concurrentExposure: 0, childCount: 0 };
    }

    let totalSpent = 0;
    let dailySpent = 0;
    let childCount = 0;

    for (const [, budget] of this.budgets) {
      if (budget.rootId === rootId) {
        totalSpent += budget.totalSpent;
        dailySpent += budget.dailySpent;
        childCount++;
      }
    }

    return {
      totalAllocated: root.totalAllocated,
      totalSpent,
      dailySpent,
      concurrentExposure: root.concurrentExposure,
      childCount,
    };
  }

  validateSplitEvasion(
    rootId: string,
    proposedAmount: number,
    mode: "allocate" | "execute" = "execute"
  ): BudgetCheckResult {
    const root = this.budgets.get(rootId);
    if (!root) {
      return { valid: true };
    }

    if (mode === "allocate") {
      const newTotalAllocated = root.totalAllocated + proposedAmount;
      if (newTotalAllocated > root.maxTotalSpend) {
        return {
          valid: false,
          reason: `Aggregate allocation $${newTotalAllocated.toFixed(2)} exceeds root total budget $${root.maxTotalSpend.toFixed(2)} (adding $${proposedAmount.toFixed(2)})`,
          code: "AGGREGATE_TOTAL_EXCEEDED",
        };
      }

      const newDailyAllocated = root.dailySpent + proposedAmount;
      if (newDailyAllocated > root.maxDailySpend) {
        return {
          valid: false,
          reason: `Aggregate daily allocation $${newDailyAllocated.toFixed(2)} exceeds root daily budget $${root.maxDailySpend.toFixed(2)}`,
          code: "AGGREGATE_DAILY_EXCEEDED",
        };
      }
    } else {
      const newTotalSpent = root.totalSpent + proposedAmount;
      if (newTotalSpent > root.maxTotalSpend) {
        return {
          valid: false,
          reason: `Split evasion: aggregate $${newTotalSpent.toFixed(2)} would exceed root total $${root.maxTotalSpend.toFixed(2)}`,
          code: "SPLIT_EVASION",
        };
      }

      const today = new Date().toISOString().slice(0, 10);
      let dailySpent = root.dailySpent;
      if (root.dailySpentAt !== today) {
        dailySpent = 0;
      }

      const newDailySpent = dailySpent + proposedAmount;
      if (newDailySpent > root.maxDailySpend) {
        return {
          valid: false,
          reason: `Split evasion: daily aggregate $${newDailySpent.toFixed(2)} would exceed root daily $${root.maxDailySpend.toFixed(2)}`,
          code: "SPLIT_EVASION_DAILY",
        };
      }
    }

    return { valid: true };
  }

  revoke(rootId: string): void {
    const toRemove: string[] = [];
    for (const [id, budget] of this.budgets) {
      if (budget.rootId === rootId || id === rootId) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      this.budgets.delete(id);
    }
  }

  reset(): void {
    this.budgets.clear();
  }
}
