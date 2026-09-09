import { describe, it, expect, beforeEach } from "vitest";
import { BudgetTracker } from "../budget-tracker";
import { CapabilityCompiler } from "../capability-compiler";

describe("BudgetTracker", () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker();
  });

  describe("aggregate budget enforcement", () => {
    it("allows delegation within parent total budget", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 20,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });

      expect(child1.capability).toBeDefined();
      expect(child1.violations).toHaveLength(0);
    });

    it("blocks delegation that would exceed parent total budget", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 15,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child2.capability).toBeUndefined();
      expect(child2.violations.length).toBeGreaterThan(0);
      expect(child2.violations[0].reason).toContain("exceeds parent total budget");
    });

    it("tracks cumulative allocations across children", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 25,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });
      expect(child2.capability).toBeDefined();

      const child3 = compiler.delegate(root.id, "agent-d", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });
      expect(child3.capability).toBeUndefined();
      expect(child3.violations[0].reason).toContain("exceeds parent total budget");
    });
  });

  describe("split evasion detection", () => {
    it("detects split evasion across children", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 15,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child2.capability).toBeUndefined();
      expect(child2.violations[0].reason).toContain("exceeds parent total budget");
    });

    it("allows split within budget", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child2.capability).toBeDefined();

      const child3 = compiler.delegate(root.id, "agent-d", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });
      expect(child3.capability).toBeDefined();
    });
  });

  describe("concurrent delegation", () => {
    it("allows concurrent delegation within total budget", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 25,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 25,
      });
      expect(child2.capability).toBeDefined();
    });

    it("blocks concurrent delegation that exceeds total budget", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      const child1 = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 20,
      });
      expect(child1.capability).toBeDefined();

      const child2 = compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 20,
      });
      expect(child2.capability).toBeUndefined();
      expect(child2.violations[0].reason).toContain("exceeds parent total budget");
    });
  });

  describe("budget tracking across tree", () => {
    it("tracks tree budget correctly", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });

      compiler.delegate(root.id, "agent-c", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });

      const treeBudget = compiler.getBudgetTracker().getTreeBudget(root.id);
      expect(treeBudget.totalAllocated).toBe(20);
      expect(treeBudget.childCount).toBe(3);
    });

    it("records execution and updates spent", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      const child = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const result = compiler.recordExecution(child.capability!.id, 5);
      expect(result.valid).toBe(true);

      const budget = compiler.getBudgetTracker().getBudget(child.capability!.id);
      expect(budget?.totalSpent).toBe(5);
    });

    it("blocks execution that exceeds total spend", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      const child = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      compiler.recordExecution(child.capability!.id, 8);
      const result = compiler.recordExecution(child.capability!.id, 5);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds limit");
    });

    it("blocks execution that exceeds daily spend", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
        maxDailySpend: 8,
      });

      const child = compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
        maxDailySpend: 8,
      });

      compiler.recordExecution(child.capability!.id, 5);
      const result = compiler.recordExecution(child.capability!.id, 5);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds limit");
    });
  });

  describe("revocation cascade", () => {
    it("cascades revoke through budget tracker", () => {
      const compiler = new CapabilityCompiler();
      const root = compiler.issueRoot("agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 30,
      });

      compiler.delegate(root.id, "agent-b", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 10,
      });

      compiler.revoke(root.id, "test revocation");

      const budget = compiler.getBudgetTracker().getBudget(root.id);
      expect(budget).toBeUndefined();
    });
  });
});
