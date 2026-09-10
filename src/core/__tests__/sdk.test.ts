import { describe, it, expect, beforeEach } from "vitest";
import { Intentra } from "../intentra-sdk";

describe("Intentra SDK", () => {
  let intentra: Intentra;

  beforeEach(() => {
    intentra = new Intentra({ mode: "mock" });
  });

  describe("complete lifecycle", () => {
    it("issues → delegates → validates → blocks escalation → revokes", async () => {
      // 1. ISSUE: What can this agent do?
      const root = intentra.issue({
        agentId: "trading-bot",
        assets: ["BNBUSDT"],
        actions: ["BUY"],
        maxPerOrder: 10,
        maxTotal: 50,
      });

      expect(root.success).toBe(true);
      expect(root.agentId).toBe("trading-bot");
      expect(root.constraints.maxPerOrder).toBe(10);
      expect(root.constraints.maxTotal).toBe(50);

      // 2. DELEGATE: Give sub-agent 20% of authority
      const child = intentra.delegate(root.capabilityId, {
        childAgentId: "research-bot",
        maxPerOrder: 5,
        maxTotal: 20,
        assets: ["BNBUSDT"],
        actions: ["BUY"],
      });

      expect(child.success).toBe(true);
      expect(child.agentId).toBe("research-bot");

      // 3. EXECUTE: Valid proposal should work
      const validResult = await intentra.execute({
        capabilityId: child.capabilityId!,
        asset: "BNBUSDT",
        action: "BUY",
        amount: 5,
      });

      // 4. EXECUTE: Invalid proposal should block
      const invalidResult = await intentra.execute({
        capabilityId: child.capabilityId!,
        asset: "ETHUSDT",
        action: "BUY",
        amount: 500,
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.status).toBe("BLOCKED");

      // 6. REVOKE: Parent revoked → entire tree unusable
      const revokeResult = intentra.revoke(root.capabilityId, "user requested");

      expect(revokeResult.success).toBe(true);

      // 7. EXECUTE AFTER REVOKE: Should fail
      const afterRevokeResult = await intentra.execute({
        capabilityId: child.capabilityId!,
        asset: "BNBUSDT",
        action: "BUY",
        amount: 3,
      });

      expect(afterRevokeResult.success).toBe(false);
      expect(afterRevokeResult.status).toBe("CAPABILITY_REVOKED");

      // 8. Complete lifecycle tested
      expect(afterRevokeResult.success).toBe(false);
    });
  });

  describe("delegate safety", () => {
    it("blocks delegation that widens authority", () => {
      const root = intentra.issue({
        agentId: "parent",
        assets: ["BNBUSDT"],
        actions: ["BUY"],
        maxPerOrder: 10,
        maxTotal: 50,
      });

      // Try to delegate MORE than parent has
      const badDelegate = intentra.delegate(root.capabilityId, {
        childAgentId: "child",
        maxPerOrder: 100, // Wider than parent's 10
        maxTotal: 1000, // Wider than parent's 50
      });

      expect(badDelegate.success).toBe(false);
      expect(badDelegate.violations).toBeDefined();
      expect(badDelegate.violations?.length).toBeGreaterThan(0);
    });

    it("allows delegation that narrows authority", () => {
      const root = intentra.issue({
        agentId: "parent",
        assets: ["BNBUSDT", "ETHUSDT"],
        actions: ["BUY", "SELL"],
        maxPerOrder: 10,
        maxTotal: 50,
      });

      // Narrow to just BNB and BUY
      const goodDelegate = intentra.delegate(root.capabilityId, {
        childAgentId: "child",
        maxPerOrder: 5, // Narrower
        maxTotal: 20, // Narrower
        assets: ["BNBUSDT"], // Narrower
        actions: ["BUY"], // Narrower
      });

      expect(goodDelegate.success).toBe(true);
      expect(goodDelegate.capabilityId).toBeDefined();
    });
  });

  describe("verification", () => {
    it("verifies a valid execution", async () => {
      const root = intentra.issue({
        agentId: "trader",
        assets: ["BNBUSDT"],
        actions: ["BUY"],
        maxPerOrder: 10,
        maxTotal: 50,
      });

      const result = await intentra.execute({
        capabilityId: root.capabilityId,
        asset: "BNBUSDT",
        action: "BUY",
        amount: 5,
      });

      if (result.receipt) {
        const verification = intentra.verify(result.receipt.id);
        expect(verification.success).toBe(true);
      }
    });
  });
});
