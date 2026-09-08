import { describe, it, expect, beforeEach } from "vitest";
import { CapabilityCompiler } from "../capability-compiler";
import { IntentConstraint } from "../../types";

/**
 * Authority Model Correctness — CapabilityCompiler
 *
 * These tests validate the ACTUAL engine used by the live API, demo, and fuzzer.
 * The invariant: ∀ child capabilities Cᵢ: Cᵢ ⊆ Cᵢ₋₁
 * Authority can only narrow. Never widen.
 */

describe("Authority Monotonicity Invariant", () => {
  let compiler: CapabilityCompiler;

  beforeEach(() => {
    compiler = new CapabilityCompiler();
  });

  // ── DELEGATION SUBSET ENFORCEMENT ──────────────────────────────

  describe("Delegation — child ⊆ parent", () => {
    it("should ALLOW child with narrower limits", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
      });

      const { capability, violations } = compiler.delegate(root.id, "agent-a", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 50,
        maxTotalSpend: 200,
      });

      expect(capability).toBeDefined();
      expect(violations.length).toBe(0);
      expect(capability!.constraints.maxPerOrder).toBe(50);
    });

    it("should BLOCK child with wider per-order limit", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "attacker", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 15,
        maxTotalSpend: 15,
      });

      expect(capability).toBeUndefined();
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("AUTHORITY_WIDENING");
    });

    it("should BLOCK child with wider total spend", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "attacker", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 50,
      });

      expect(capability).toBeUndefined();
      expect(violations.length).toBeGreaterThan(0);
    });

    it("should BLOCK child that adds a new asset", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade BNB",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "attacker", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT", "ETHUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("ASSET_ESCALATION"))).toBe(true);
    });

    it("should BLOCK child that adds a new action", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "attacker", {
        objective: "Trade",
        allowedActions: ["BUY", "SELL"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("ACTION_ESCALATION"))).toBe(true);
    });
  });

  // ── LIMIT OMISSION = WIDENING ─────────────────────────────────

  describe("Limit Omission Detection", () => {
    it("should BLOCK child that omits maxPerOrder (omission = unlimited)", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        // maxPerOrder omitted — should be caught
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("omits per-order limit"))).toBe(true);
    });

    it("should BLOCK child that omits maxTotalSpend", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        // maxTotalSpend omitted
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("omits total spend limit"))).toBe(true);
    });

    it("should BLOCK child with empty asset list when parent has assets", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: [],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("ASSET_ESCALATION"))).toBe(true);
    });
  });

  // ── APPROVAL THRESHOLD ESCALATION ─────────────────────────────

  describe("Approval Threshold Escalation", () => {
    it("should BLOCK child that raises approval threshold", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 100,
        maxTotalSpend: 100,
        approvalThreshold: 50,
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 50,
        maxTotalSpend: 50,
        approvalThreshold: 500,
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("OVERSIGHT_ESCALATION"))).toBe(true);
    });

    it("should BLOCK child that omits approval threshold", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 100,
        maxTotalSpend: 100,
        approvalThreshold: 50,
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 50,
        maxTotalSpend: 50,
        // approvalThreshold omitted
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("OVERSIGHT_ESCALATION"))).toBe(true);
    });
  });

  // ── TEMPORAL ESCALATION ───────────────────────────────────────

  describe("Temporal Escalation", () => {
    it("should BLOCK child that extends expiry", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 8,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("TEMPORAL_ESCALATION"))).toBe(true);
    });

    it("should BLOCK child that omits expiry when parent has one", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 8,
        // expiresAt omitted — indefinite authority
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("TEMPORAL_ESCALATION"))).toBe(true);
    });
  });

  // ── PROHIBITION REMOVAL ───────────────────────────────────────

  describe("Prohibition Removal", () => {
    it("should BLOCK child that removes a prohibition", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY", "SELL"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
        prohibitedActions: ["SELL"],
      });

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY", "SELL"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 8,
        prohibitedActions: [],
      });

      expect(capability).toBeUndefined();
      expect(violations.some(v => v.reason.includes("PROHIBITION_REMOVAL"))).toBe(true);
    });
  });

  // ── REVOCATION CASCADE ────────────────────────────────────────

  describe("Revocation Cascade", () => {
    it("should BLOCK child after parent is revoked", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability: child } = compiler.delegate(root.id, "agent-a", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 8,
      });

      expect(child).toBeDefined();

      compiler.revoke(root.id, "Compromised");

      const result = compiler.validateProposal(child!.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 5,
      });

      expect(result.decision).toBe("BLOCK");
    });

    it("should BLOCK delegation from revoked parent", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      compiler.revoke(root.id, "Compromised");

      const { capability, violations } = compiler.delegate(root.id, "child", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 5,
        maxTotalSpend: 5,
      });

      expect(capability).toBeUndefined();
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  // ── CHAIN VALIDATION ──────────────────────────────────────────

  describe("Chain Validation", () => {
    it("should validate a 3-level chain", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 100,
        maxTotalSpend: 300,
      });

      const { capability: a } = compiler.delegate(root.id, "agent-a", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 50,
        maxTotalSpend: 200,
      });

      expect(a).toBeDefined();

      const { capability: b } = compiler.delegate(a!.id, "agent-b", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 25,
        maxTotalSpend: 100,
      });

      expect(b).toBeDefined();

      const chain = compiler.buildChain(b!.id);
      expect(chain).toBeDefined();
      expect(chain!.depth).toBe(2);

      const result = compiler.validateChain(chain!.id);
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should detect widening in a chain", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const { capability: a } = compiler.delegate(root.id, "agent-a", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 8,
        maxTotalSpend: 8,
      });

      expect(a).toBeDefined();

      // Build chain from root — should be valid
      const chain = compiler.buildChain(root.id);
      expect(chain).toBeDefined();

      const result = compiler.validateChain(chain!.id);
      expect(result.valid).toBe(true);
    });
  });

  // ── PROPOSAL VALIDATION ───────────────────────────────────────

  describe("Proposal Validation", () => {
    it("should ALLOW proposal within capability", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const result = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 8,
      });

      expect(result.decision).toBe("ALLOW");
      expect(result.violations.length).toBe(0);
    });

    it("should BLOCK proposal exceeding limit", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const result = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 15,
      });

      expect(result.decision).toBe("BLOCK");
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("should BLOCK proposal for wrong asset", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      const result = compiler.validateProposal(root.id, {
        asset: "ETHUSDT",
        action: "BUY",
        amount: 5,
      });

      expect(result.decision).toBe("BLOCK");
    });

    it("should return APPROVAL_REQUIRED when amount exceeds threshold", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 100,
        maxTotalSpend: 100,
        approvalThreshold: 50,
      });

      const result = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 75,
      });

      expect(result.decision).toBe("APPROVAL_REQUIRED");
    });
  });

  // ── DEEP DELEGATION ───────────────────────────────────────────

  describe("Deep Delegation", () => {
    it("should maintain subset enforcement across 9 levels", () => {
      const root = compiler.issueRoot("human", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      let current = root;
      for (let i = 1; i <= 9; i++) {
        const { capability, violations } = compiler.delegate(current.id, `agent-${i}`, {
          objective: "Trade",
          allowedActions: ["BUY"],
          allowedAssets: ["BNBUSDT"],
          maxPerOrder: 10 - i * 0.01,
          maxTotalSpend: 10 - i * 0.01,
        });
        expect(capability).toBeDefined();
        expect(violations.length).toBe(0);
        current = capability!;
      }

      // Level 10: try to widen back
      const { capability: attacker, violations } = compiler.delegate(current.id, "attacker", {
        objective: "Trade",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10.01,
        maxTotalSpend: 10.01,
      });

      expect(attacker).toBeUndefined();
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  // ── MODEL INDEPENDENCE ────────────────────────────────────────

  describe("Model Independence", () => {
    it("should produce same decision regardless of proposal framing", () => {
      const root = compiler.issueRoot("model-test", {
        objective: "Buy BNBUSDT",
        allowedActions: ["BUY"],
        allowedAssets: ["BNBUSDT"],
        maxPerOrder: 10,
        maxTotalSpend: 10,
      });

      // Over-limit proposal → BLOCK
      const r1 = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 15,
      });
      expect(r1.decision).toBe("BLOCK");

      // Wrong asset → BLOCK
      const r2 = compiler.validateProposal(root.id, {
        asset: "ETHUSDT",
        action: "BUY",
        amount: 5,
      });
      expect(r2.decision).toBe("BLOCK");

      // Wrong action → BLOCK
      const r3 = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "TRANSFER",
        amount: 5,
      });
      expect(r3.decision).toBe("BLOCK");

      // Valid proposal → ALLOW
      const r4 = compiler.validateProposal(root.id, {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 8,
      });
      expect(r4.decision).toBe("ALLOW");
    });
  });
});
