import { describe, it, expect, beforeEach } from "vitest";
import { IntentraCompiler, IntentCheckResult } from "../intentra-compiler";

describe("Authority Model Correctness", () => {
  let compiler: IntentraCompiler;

  beforeEach(() => {
    compiler = new IntentraCompiler();
  });

  describe("Authority Mutations Must Be Rejected", () => {
    it("should BLOCK when agent tries to increase maxDailySpend", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { maxDailySpend: 500 }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to increase maxPerOrder", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { maxPerOrder: 500 }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to increase maxTotalSpend", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { maxTotalSpend: 5000 }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to add ETH to allowedAssets", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { allowedAssets: ["BTC", "ETH"] }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to add SELL to allowedActions", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { allowedActions: ["BUY", "SELL"] }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to increase approvalAbove", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { approvalAbove: 200 }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("AUTHORITY_WIDENING");
      expect(result.verdict).toBe("BLOCK");
    });

    it("should BLOCK when agent tries to extend session expiry", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = compiler.checkAuthorityMutation(
        authority.sessionId,
        { expiresAt: new Date(Date.now() + 86400000) }
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.verdict).toBe("BLOCK");
    });
  });

  describe("Approval Threshold Semantics", () => {
    it("should return APPROVAL_REQUIRED for $90 when maxPerOrder=$100 and approvalAbove=$75", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const checkResult: IntentCheckResult = {
        verdict: "ALLOW",
        violations: [],
        allowedActions: [
          {
            original: "Buy $90 BTC",
            action: { type: "BUY", asset: "BTC", amount: 90 },
            valid: true,
          },
        ],
        aggregateAmount: 90,
        dailySpend: 0,
        totalSpend: 0,
        estimatedFees: 0.9,
        notes: [],
      };

      const result = compiler.compile(
        authority.sessionId,
        "Buy $90 BTC",
        checkResult
      );

      expect(result.verdict).toBe("APPROVAL_REQUIRED");
      expect(result.needsApproval).toBe(true);
      expect(result.blockingReason).toBeUndefined();
    });

    it("should return ALLOW for $50 when approvalAbove=$75", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const checkResult: IntentCheckResult = {
        verdict: "ALLOW",
        violations: [],
        allowedActions: [
          {
            original: "Buy $50 BTC",
            action: { type: "BUY", asset: "BTC", amount: 50 },
            valid: true,
          },
        ],
        aggregateAmount: 50,
        dailySpend: 0,
        totalSpend: 0,
        estimatedFees: 0.5,
        notes: [],
      };

      const result = compiler.compile(
        authority.sessionId,
        "Buy $50 BTC",
        checkResult
      );

      expect(result.verdict).toBe("ALLOW");
      expect(result.needsApproval).toBe(false);
    });

    it("should return BLOCK for $150 when maxPerOrder=$100", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const checkResult: IntentCheckResult = {
        verdict: "BLOCK",
        violations: [
          {
            action: { type: "BUY", asset: "BTC", amount: 150 },
            type: "AMOUNT_EXCEEDS_LIMIT",
            reason: "Order amount $150 exceeds $100 per-order limit",
          },
        ],
        allowedActions: [],
        aggregateAmount: 150,
        dailySpend: 0,
        totalSpend: 0,
        estimatedFees: 1.5,
        notes: [],
      };

      const result = compiler.compile(
        authority.sessionId,
        "Buy $150 BTC",
        checkResult
      );

      expect(result.verdict).toBe("BLOCK");
      expect(result.blockingReason).toBeDefined();
    });

    it("should allow execution after human approves APPROVAL_REQUIRED", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const checkResult: IntentCheckResult = {
        verdict: "ALLOW",
        violations: [],
        allowedActions: [
          {
            original: "Buy $90 BTC",
            action: { type: "BUY", asset: "BTC", amount: 90 },
            valid: true,
          },
        ],
        aggregateAmount: 90,
        dailySpend: 0,
        totalSpend: 0,
        estimatedFees: 0.9,
        notes: [],
      };

      const result = compiler.compile(
        authority.sessionId,
        "Buy $90 BTC",
        checkResult
      );

      expect(result.verdict).toBe("APPROVAL_REQUIRED");
      expect(result.needsApproval).toBe(true);

      const approvedResult = compiler.handleApproval(result.transactionId, true);

      expect(approvedResult.verdict).toBe("ALLOW");
      expect(approvedResult.needsApproval).toBe(false);
      expect(approvedResult.approvalState).toBe("APPROVED");
    });

    it("should return BLOCK when human denies approval", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const checkResult: IntentCheckResult = {
        verdict: "ALLOW",
        violations: [],
        allowedActions: [
          {
            original: "Buy $90 BTC",
            action: { type: "BUY", asset: "BTC", amount: 90 },
            valid: true,
          },
        ],
        aggregateAmount: 90,
        dailySpend: 0,
        totalSpend: 0,
        estimatedFees: 0.9,
        notes: [],
      };

      const result = compiler.compile(
        authority.sessionId,
        "Buy $90 BTC",
        checkResult
      );

      expect(result.verdict).toBe("APPROVAL_REQUIRED");

      const deniedResult = compiler.handleApproval(result.transactionId, false);

      expect(deniedResult.verdict).toBe("BLOCK");
      expect(deniedResult.approvalState).toBe("DENIED");
      expect(deniedResult.blockingReason).toContain("Human denied approval");
    });
  });

  describe("Full Correct Sequence", () => {
    it("should enforce the correct sequence: ALLOW → APPROVAL_REQUIRED → BLOCK → BLOCK → BLOCK → BLOCK → REVOKE", () => {
      const authority = compiler.registerAuthority({
        agentId: "test-agent",
        humanName: "Trader",
        intent: "Buy BTC only. $100/order. $300/day. Approval above $75.",
        constraints: {
          allowedActions: ["BUY"],
          allowedAssets: ["BTC"],
          maxPerOrder: 100,
          maxTotalSpend: 300,
          maxDailySpend: 300,
          approvalAbove: 75,
        },
      });

      const sessionId = authority.sessionId;

      // $50 BTC → ALLOW
      const result1 = compiler.compile(
        sessionId,
        "Buy $50 BTC",
        {
          verdict: "ALLOW",
          violations: [],
          allowedActions: [{
            original: "Buy $50 BTC",
            action: { type: "BUY", asset: "BTC", amount: 50 },
            valid: true,
          }],
          aggregateAmount: 50,
          dailySpend: 0,
          totalSpend: 0,
          estimatedFees: 0.5,
          notes: [],
        }
      );
      expect(result1.verdict).toBe("ALLOW");
      expect(result1.needsApproval).toBe(false);
      compiler.recordExecution(result1.transactionId, 50);

      // $90 BTC → APPROVAL_REQUIRED
      const result2 = compiler.compile(
        sessionId,
        "Buy $90 BTC",
        {
          verdict: "ALLOW",
          violations: [],
          allowedActions: [{
            original: "Buy $90 BTC",
            action: { type: "BUY", asset: "BTC", amount: 90 },
            valid: true,
          }],
          aggregateAmount: 90,
          dailySpend: 50,
          totalSpend: 50,
          estimatedFees: 0.9,
          notes: [],
        }
      );
      expect(result2.verdict).toBe("APPROVAL_REQUIRED");
      expect(result2.needsApproval).toBe(true);

      // Human approves
      const approvedResult = compiler.handleApproval(result2.transactionId, true);
      expect(approvedResult.verdict).toBe("ALLOW");
      compiler.recordExecution(approvedResult.transactionId, 90);

      // $150 BTC → BLOCK (exceeds limit)
      const result3 = compiler.compile(
        sessionId,
        "Buy $150 BTC",
        {
          verdict: "BLOCK",
          violations: [{
            action: { type: "BUY", asset: "BTC", amount: 150 },
            type: "AMOUNT_EXCEEDS_LIMIT",
            reason: "Order amount $150 exceeds $100 per-order limit",
          }],
          allowedActions: [],
          aggregateAmount: 150,
          dailySpend: 140,
          totalSpend: 140,
          estimatedFees: 1.5,
          notes: [],
        }
      );
      expect(result3.verdict).toBe("BLOCK");

      // SELL $80 BTC → BLOCK (SELL not allowed)
      const result4 = compiler.compile(
        sessionId,
        "Sell $80 BTC",
        {
          verdict: "BLOCK",
          violations: [{
            action: { type: "SELL", asset: "BTC", amount: 80 },
            type: "ACTION_NOT_AUTHORIZED",
            reason: "SELL is not an authorized action. Allowed: BUY",
          }],
          allowedActions: [],
          aggregateAmount: 80,
          dailySpend: 140,
          totalSpend: 140,
          estimatedFees: 0.8,
          notes: [],
        }
      );
      expect(result4.verdict).toBe("BLOCK");

      // BUY $50 ETH → BLOCK (ETH not allowed)
      const result5 = compiler.compile(
        sessionId,
        "Buy $50 ETH",
        {
          verdict: "BLOCK",
          violations: [{
            action: { type: "BUY", asset: "ETH", amount: 50 },
            type: "ASSET_NOT_AUTHORIZED",
            reason: "ETH is not an authorized asset. Allowed: BTC",
          }],
          allowedActions: [],
          aggregateAmount: 50,
          dailySpend: 140,
          totalSpend: 140,
          estimatedFees: 0.5,
          notes: [],
        }
      );
      expect(result5.verdict).toBe("BLOCK");

      // INCREASE DAILY LIMIT TO $500 → BLOCK (authority mutation)
      const result6 = compiler.checkAuthorityMutation(
        sessionId,
        { maxDailySpend: 500 }
      );
      expect(result6.verdict).toBe("BLOCK");
      expect(result6.violations.length).toBeGreaterThan(0);

      // REVOKE → subsequent proposal BLOCKED
      compiler.revokeSession(sessionId, "Human revoked");

      const result7 = compiler.compile(
        sessionId,
        "Buy $50 BTC",
        {
          verdict: "ALLOW",
          violations: [],
          allowedActions: [{
            original: "Buy $50 BTC",
            action: { type: "BUY", asset: "BTC", amount: 50 },
            valid: true,
          }],
          aggregateAmount: 50,
          dailySpend: 140,
          totalSpend: 140,
          estimatedFees: 0.5,
          notes: [],
        }
      );
      expect(result7.verdict).toBe("BLOCK");
      expect(result7.blockingReason).toContain("revoked");
    });
  });
});
