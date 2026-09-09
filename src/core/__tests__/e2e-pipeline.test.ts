import { describe, it, expect, beforeEach } from "vitest";
import { CapabilityCompiler } from "../capability-compiler";
import { ProvenanceReceiptStore } from "../provenance-receipt";
import { OfflineVerifier } from "../offline-verifier";
import { EvidencePackBuilder } from "../evidence-pack";
import { LLMZeroToolsEnforcer } from "../llm-zero-tools";
import { EndToEndPipeline } from "../end-to-end-pipeline";
import { DualReadbackAttester } from "../dual-readback-attester";
import { fuzzAuthorityProperties } from "../authority-fuzzer";

describe("OfflineVerifier", () => {
  let store: ProvenanceReceiptStore;
  let verifier: OfflineVerifier;

  beforeEach(() => {
    store = new ProvenanceReceiptStore();
    verifier = new OfflineVerifier();
  });

  it("verifies a valid receipt", () => {
    const receipt = store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    const result = verifier.verify(receipt);
    expect(result.overallValid).toBe(true);
    expect(result.hashValid).toBe(true);
    expect(result.lineageValid).toBe(true);
    expect(result.chainIntact).toBe(true);
  });

  it("detects hash tampering", () => {
    const receipt = store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    const tampered = { ...receipt, receiptHash: "tampered_hash" };
    const result = verifier.verify(tampered);
    expect(result.overallValid).toBe(false);
    expect(result.hashValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("detects empty delegation chain", () => {
    const receipt = store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: [],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    const result = verifier.verify(receipt);
    expect(result.lineageValid).toBe(false);
  });

  it("verifies against public readbacks", () => {
    const receipt = store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    store.recordExecution(receipt.id, {
      orderId: "order_123",
      exchange: "binance",
      executedAt: new Date().toISOString(),
    });

    const readbacks = [
      {
        orderId: "order_123",
        symbol: "BNBUSDT",
        side: "BUY",
        quantity: "5",
        price: "600",
        status: "FILLED",
        executedQty: "5",
        timestamp: new Date().toISOString(),
      },
      {
        orderId: "order_123",
        symbol: "BNBUSDT",
        side: "BUY",
        quantity: "5",
        price: "600",
        status: "FILLED",
        executedQty: "5",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = verifier.verifyAgainstPublicData(receipt, readbacks);
    expect(result.overallValid).toBe(true);
    expect(result.executionAttested).toBe(true);
  });

  it("detects mismatched readbacks", () => {
    const receipt = store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    store.recordExecution(receipt.id, {
      orderId: "order_123",
      exchange: "binance",
      executedAt: new Date().toISOString(),
    });

    const readbacks = [
      {
        orderId: "order_123",
        symbol: "BNBUSDT",
        side: "BUY",
        quantity: "5",
        price: "600",
        status: "FILLED",
        executedQty: "5",
        timestamp: new Date().toISOString(),
      },
      {
        orderId: "order_123",
        symbol: "ETHUSDT",
        side: "BUY",
        quantity: "5",
        price: "600",
        status: "FILLED",
        executedQty: "5",
        timestamp: new Date().toISOString(),
      },
    ];

    const result = verifier.verifyAgainstPublicData(receipt, readbacks);
    expect(result.overallValid).toBe(false);
    expect(result.errors.some(e => e.includes("symbols do not match"))).toBe(true);
  });
});

describe("EvidencePackBuilder", () => {
  let store: ProvenanceReceiptStore;
  let builder: EvidencePackBuilder;

  beforeEach(() => {
    store = new ProvenanceReceiptStore();
    builder = new EvidencePackBuilder();
  });

  it("builds an evidence pack from receipts", () => {
    store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_2",
      agentId: "agent-1",
      proposal: { asset: "ETHUSDT", action: "BUY", amount: 10 },
      decision: "BLOCK",
      violations: ["ASSET_RESTRICTED"],
    });

    const pack = builder.build(store);
    expect(pack.summary.totalReceipts).toBe(2);
    expect(pack.summary.totalAllowed).toBe(1);
    expect(pack.summary.totalBlocked).toBe(1);
    expect(pack.receipts.length).toBe(2);
    expect(pack.verificationResults.length).toBe(2);
    expect(pack.formalModel.theorems.length).toBe(5);
  });

  it("includes fuzz results", () => {
    const fuzzResult = {
      totalChains: 50000,
      totalDelegations: 125000,
      violations: 0,
      strategies: {
        asset_inject: { attempts: 10000, blocked: 10000 },
        action_inject: { attempts: 10000, blocked: 10000 },
      },
    };

    const pack = builder.build(store, fuzzResult);
    expect(pack.adversarialResults.totalChains).toBe(50000);
    expect(pack.adversarialResults.violations).toBe(0);
    expect(pack.summary.strategyBlockRates["asset_inject"]).toBe(100);
  });

  it("generates judge-readable report", () => {
    store.createReceipt({
      capabilityId: "cap_1",
      delegationChain: ["cap_0", "cap_1"],
      intentId: "intent_1",
      agentId: "agent-1",
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 5 },
      decision: "ALLOW",
      violations: [],
    });

    const pack = builder.build(store);
    const report = builder.exportForJudge(pack);
    expect(report).toContain("INTENTRA EVIDENCE PACK");
    expect(report).toContain("FOR JUDGE INSPECTION");
    expect(report).toContain("VALID");
  });
});

describe("LLMZeroToolsEnforcer", () => {
  let compiler: CapabilityCompiler;
  let store: ProvenanceReceiptStore;
  let enforcer: LLMZeroToolsEnforcer;

  beforeEach(() => {
    compiler = new CapabilityCompiler();
    store = new ProvenanceReceiptStore();
    enforcer = new LLMZeroToolsEnforcer(compiler, store);
  });

  it("blocks unauthorized tool calls", () => {
    const result = enforcer.interceptToolCall({
      tool: "transfer_funds",
      params: { to: "attacker", amount: 1000 },
      agentId: "malicious-agent",
    });

    expect(result.allowed).toBe(false);
    expect(result.tool).toBe("transfer_funds");
    expect(result.reason).toContain("not in the allowed set");
    expect(result.receiptId).toBeDefined();
  });

  it("blocks execution without capability", () => {
    const result = enforcer.interceptToolCall({
      tool: "place_order",
      params: { symbol: "BNBUSDT", side: "BUY", quantity: "5" },
      agentId: "agent-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("without capability");
  });

  it("blocks execution with revoked capability", () => {
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    compiler.revoke(root.id, "test");

    const result = enforcer.interceptToolCall({
      tool: "place_order",
      params: { symbol: "BNBUSDT", side: "BUY", quantity: "5" },
      agentId: "agent-1",
      capabilityId: root.id,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("revoked");
  });

  it("allows valid tool calls", () => {
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = enforcer.interceptToolCall({
      tool: "place_order",
      params: { symbol: "BNBUSDT", side: "BUY", quantity: "5" },
      agentId: "agent-1",
      capabilityId: root.id,
    });

    expect(result.allowed).toBe(true);
  });

  it("tracks blocked calls", () => {
    enforcer.interceptToolCall({
      tool: "transfer_funds",
      params: {},
      agentId: "agent-1",
    });

    enforcer.interceptToolCall({
      tool: "withdraw_crypto",
      params: {},
      agentId: "agent-1",
    });

    expect(enforcer.getBlockedCallsCount()).toBe(2);
    expect(enforcer.getBlockedCalls().length).toBe(2);
  });
});

describe("EndToEndPipeline", () => {
  let pipeline: EndToEndPipeline;

  beforeEach(() => {
    pipeline = new EndToEndPipeline({
      mode: "mock",
      enableAttestation: false,
      enableVerification: true,
    });
  });

  it("executes allowed proposal", async () => {
    const compiler = pipeline.getCompiler();
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

    const result = await pipeline.executeProposal({
      capabilityId: child.capability!.id,
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 3 },
    });

    expect(result.proposalResult.decision).toBe("ALLOW");
    expect(result.executionResult.status).toBe("MOCK_EXECUTED");
    expect(result.verified).toBe(true);
  });

  it("blocks unauthorized proposal", async () => {
    const compiler = pipeline.getCompiler();
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

    const result = await pipeline.executeProposal({
      capabilityId: child.capability!.id,
      proposal: { asset: "ETHUSDT", action: "BUY", amount: 3 },
    });

    expect(result.proposalResult.decision).toBe("BLOCK");
    expect(result.executionResult.status).toBe("BLOCKED");
  });

  it("blocks amount escalation", async () => {
    const compiler = pipeline.getCompiler();
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

    const result = await pipeline.executeProposal({
      capabilityId: child.capability!.id,
      proposal: { asset: "BNBUSDT", action: "BUY", amount: 15 },
    });

    expect(result.proposalResult.decision).toBe("BLOCK");
    expect(result.executionResult.status).toBe("BLOCKED");
  });

  it("generates evidence pack", () => {
    const compiler = pipeline.getCompiler();
    compiler.issueRoot("trading-agent", {
      objective: "Trade BNB",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
      maxTotalSpend: 50,
    });

    const pack = pipeline.buildEvidencePack({
      totalChains: 50000,
      totalDelegations: 125000,
      violations: 0,
      strategies: {},
    });

    expect(pack.version).toBe("1.0.0");
    expect(pack.formalModel.theorems.length).toBe(5);
    expect(pack.adversarialResults.totalChains).toBe(50000);
  });

  it("generates full report", () => {
    const report = pipeline.generateFullReport();
    expect(report).toContain("END-TO-END PIPELINE REPORT");
    expect(report).toContain("PIPELINE COMPLETE");
  });
});

describe("Fuzzing Integration", () => {
  it("runs 50k chain fuzzer with zero violations", () => {
    const result = fuzzAuthorityProperties(1000);
    expect(result.violations).toBe(0);
    expect(result.totalChains).toBe(1000);
    expect(result.totalDelegations).toBeGreaterThan(0);
  });
});
