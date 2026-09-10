import { describe, it, expect, vi, beforeEach } from "vitest";
import { CapabilityCompiler } from "../capability-compiler";
import { ExecutionAdapter } from "../execution-adapter";
import { ProvenanceReceiptStore } from "../provenance-receipt";

describe("Binance Security Boundary", () => {
  let compiler: CapabilityCompiler;
  let receiptStore: ProvenanceReceiptStore;

  beforeEach(() => {
    compiler = new CapabilityCompiler();
    receiptStore = new ProvenanceReceiptStore();
  });

  describe("BLOCK = zero Binance calls", () => {
    it("blocks unauthorized proposal and makes zero Binance calls", async () => {
      const root = compiler.issueRoot("trading-agent", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child = compiler.delegate(root.id, "execution-agent", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 25,
      });

      expect(child.capability).toBeDefined();

      const proposalResult = compiler.validateProposal(child.capability!.id, {
        asset: "ETHUSDT",
        action: "BUY",
        amount: 3,
      });

      expect(proposalResult.decision).toBe("BLOCK");
      expect(proposalResult.violations.length).toBeGreaterThan(0);

      const adapter = new ExecutionAdapter({
        mode: "mock",
        receiptStore,
      });

      const executionResult = await adapter.execute({
        capability: child.capability!,
        delegationChain: child.capability!.chain,
        proposal: { asset: "ETHUSDT", action: "BUY", amount: 3 },
        decision: proposalResult.decision,
        violations: proposalResult.violations.map(v => v.reason),
      });

      expect(executionResult.status).toBe("BLOCKED");
      expect(executionResult.orderId).toBeUndefined();
    });

    it("blocks amount escalation and makes zero Binance calls", async () => {
      const root = compiler.issueRoot("trading-agent", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child = compiler.delegate(root.id, "execution-agent", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 25,
      });

      expect(child.capability).toBeDefined();

      const proposalResult = compiler.validateProposal(child.capability!.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 15,
      });

      expect(proposalResult.decision).toBe("BLOCK");
      expect(proposalResult.violations.length).toBeGreaterThan(0);

      const adapter = new ExecutionAdapter({
        mode: "mock",
        receiptStore,
      });

      const executionResult = await adapter.execute({
        capability: child.capability!,
        delegationChain: child.capability!.chain,
        proposal: { asset: "BNBUSDT", action: "BUY", amount: 15 },
        decision: proposalResult.decision,
        violations: proposalResult.violations.map(v => v.reason),
      });

      expect(executionResult.status).toBe("BLOCKED");
      expect(executionResult.orderId).toBeUndefined();
    });

    it("blocks action escalation and makes zero Binance calls", async () => {
      const root = compiler.issueRoot("trading-agent", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child = compiler.delegate(root.id, "execution-agent", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 25,
      });

      expect(child.capability).toBeDefined();

      const proposalResult = compiler.validateProposal(child.capability!.id, {
        asset: "BNBUSDT",
        action: "SELL",
        amount: 3,
      });

      expect(proposalResult.decision).toBe("BLOCK");
      expect(proposalResult.violations.length).toBeGreaterThan(0);

      const adapter = new ExecutionAdapter({
        mode: "mock",
        receiptStore,
      });

      const executionResult = await adapter.execute({
        capability: child.capability!,
        delegationChain: child.capability!.chain,
        proposal: { asset: "BNBUSDT", action: "SELL", amount: 3 },
        decision: proposalResult.decision,
        violations: proposalResult.violations.map(v => v.reason),
      });

      expect(executionResult.status).toBe("BLOCKED");
      expect(executionResult.orderId).toBeUndefined();
    });

    it("blocks revoked capability and makes zero Binance calls", async () => {
      const root = compiler.issueRoot("trading-agent", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child = compiler.delegate(root.id, "execution-agent", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 25,
      });

      expect(child.capability).toBeDefined();

      compiler.revoke(root.id, "test revocation");

      const proposalResult = compiler.validateProposal(child.capability!.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 3,
      });

      expect(proposalResult.decision).toBe("BLOCK");
      expect(proposalResult.violations.length).toBeGreaterThan(0);

      const adapter = new ExecutionAdapter({
        mode: "mock",
        receiptStore,
      });

      const executionResult = await adapter.execute({
        capability: child.capability!,
        delegationChain: child.capability!.chain,
        proposal: { asset: "BNBUSDT", action: "BUY", amount: 3 },
        decision: proposalResult.decision,
        violations: proposalResult.violations.map(v => v.reason),
      });

      expect(executionResult.status).toBe("BLOCKED");
      expect(executionResult.orderId).toBeUndefined();
    });
  });

  describe("ALLOW = Binance receives order", () => {
    it("allows authorized proposal and records execution", async () => {
      const root = compiler.issueRoot("trading-agent", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 50,
      });

      const child = compiler.delegate(root.id, "execution-agent", {
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 25,
      });

      expect(child.capability).toBeDefined();

      const proposalResult = compiler.validateProposal(child.capability!.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 3,
      });

      expect(proposalResult.decision).toBe("ALLOW");
      expect(proposalResult.violations).toHaveLength(0);

      const adapter = new ExecutionAdapter({
        mode: "mock",
        receiptStore,
      });

      const executionResult = await adapter.execute({
        capability: child.capability!,
        delegationChain: child.capability!.chain,
        proposal: { asset: "BNBUSDT", action: "BUY", amount: 3 },
        decision: proposalResult.decision,
        violations: [],
      });

      expect(executionResult.status).toBe("BLOCKED");
      expect(executionResult.message).toContain("MOCK BLOCKED");
      expect(executionResult.receipt).toBeDefined();
    });
  });

  describe("aggregate budget enforcement", () => {
    it("blocks split evasion across children", async () => {
      const root = compiler.issueRoot("trading-agent", {
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
  });
});
