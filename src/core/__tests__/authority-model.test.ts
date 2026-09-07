import { describe, it, expect, beforeEach } from "vitest";
import { IntentraCompiler } from "../intentra-compiler";
import { IntentConstraint } from "../../types";

describe("Authority Model Correctness", () => {
  let compiler: IntentraCompiler;

  beforeEach(() => {
    compiler = new IntentraCompiler();
  });

  describe("Authority Mutations Must Be Rejected", () => {
    it("should BLOCK when agent tries to increase maxDailySpend", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        maxDailySpend: 500,
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to increase maxPerOrder", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        maxPerOrder: 500,
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to increase maxTotalSpend", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        maxTotalSpend: 5000,
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to add ETH to allowedAssets", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        allowedAssets: ["BTC", "ETH"],
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to add SELL to allowedActions", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        allowedActions: ["BUY", "SELL"],
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to increase approvalAbove", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        approvalThreshold: 200,
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });

    it("should BLOCK when agent tries to extend session expiry", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const result = compiler.checkAuthorityMutation("test-agent", {
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.allowed).toBe(false);
    });
  });

  describe("Approval Threshold Semantics", () => {
    it("should return APPROVAL_REQUIRED for $90 when maxPerOrder=$100 and approvalAbove=$75", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const plan = compiler.compile(
        "Buy BTC only. Max $100 per order. Max $300 per day. Approval required above $75.",
        "Buy $90 BTC",
        "test-agent",
        sessionId
      );

      expect(plan.result.decision).toBe("APPROVAL_REQUIRED");
      expect(plan.result.requiresApproval).toBe(true);
      expect(plan.result.approvalReason).toBeDefined();
    });

    it("should return ALLOW for $50 when approvalAbove=$75", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const plan = compiler.compile(
        "Buy BTC only. Max $100 per order. Max $300 per day. Approval required above $75.",
        "Buy $50 BTC",
        "test-agent",
        sessionId
      );

      expect(plan.result.decision).toBe("ALLOW");
      expect(plan.result.requiresApproval).toBe(false);
    });

    it("should return BLOCK for $150 when maxPerOrder=$100", () => {
      const { sessionId } = compiler.registerAuthority("test-agent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
        approvalThreshold: 75,
      });

      const plan = compiler.compile(
        "Buy BTC only. Max $100 per order. Max $300 per day. Approval required above $75.",
        "Buy $150 BTC",
        "test-agent",
        sessionId
      );

      expect(plan.result.decision).toBe("BLOCK");
      expect(plan.result.violations.length).toBeGreaterThan(0);
    });
  });

  describe("Sub-Authority Validation", () => {
    it("should ALLOW sub-agent with narrower limits", () => {
      const { sessionId: parentSessionId } = compiler.registerAuthority("parent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
      });

      const result = compiler.validateSubAuthority(
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        },
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 50,
          maxTotalSpend: 200,
          maxDailySpend: 200,
        }
      );

      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should BLOCK sub-agent with wider allowed assets", () => {
      const { sessionId: parentSessionId } = compiler.registerAuthority("parent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
      });

      const result = compiler.validateSubAuthority(
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        },
        {
          objective: "Buy BTC and ETH",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC", "ETH"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
    });

    it("should BLOCK sub-agent with wider allowed actions", () => {
      const { sessionId: parentSessionId } = compiler.registerAuthority("parent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
      });

      const result = compiler.validateSubAuthority(
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        },
        {
          objective: "Trade BTC and ETH",
          allowedActions: ["BUY", "SELL"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
    });

    it("should BLOCK sub-agent with wider spending limits", () => {
      const { sessionId: parentSessionId } = compiler.registerAuthority("parent", {
        objective: "Buy BTC only",
        allowedActions: ["BUY"],
        allowedAssets: ["BTC"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
        maxDailySpend: 300,
      });

      const result = compiler.validateSubAuthority(
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
        },
        {
          objective: "Buy BTC only",
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 200,
          maxTotalSpend: 600,
          maxDailySpend: 600,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
    });
  });
});