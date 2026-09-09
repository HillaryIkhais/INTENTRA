import { randomBytes } from "crypto";
import {
  Capability,
  DelegationChain,
  IntentConstraint,
  ProvenanceResult,
  Violation,
  ViolationType,
} from "../types/index.js";
import { BudgetTracker } from "./budget-tracker.js";

/**
 * INTENTRA — Capability Compiler
 *
 * The authority provenance layer for agent chains.
 *
 * Every authorization gets a lineage:
 *   Human Grant → Capability C₀ → Agent A → Delegation C₁ → Agent B → Proposal C₂
 *
 * INTENTRA computes:
 *   C₂ ⊆ C₁ ⊆ C₀
 *
 * If anything attempts:
 *   C₂ ⊃ C₁
 *   BLOCK.
 *
 * The invariant: Authority can only narrow. Never widen.
 * A child agent can inherit authority. It can never manufacture more.
 *
 * "AI agents can delegate. Authority cannot."
 */
export class CapabilityCompiler {
  private capabilities = new Map<string, Capability>();
  private chains = new Map<string, DelegationChain>();
  private budgetTracker = new BudgetTracker();

  /**
   * Issue a root capability (human grants authority to agent A).
   */
  issueRoot(
    agentId: string,
    constraints: IntentConstraint,
    options: { expiresAt?: string; durationMs?: number } = {}
  ): Capability {
    const id = `cap_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();
    const expiresAt = options.expiresAt ||
      (options.durationMs ? new Date(Date.now() + options.durationMs).toISOString() : undefined);

    const capability: Capability = {
      id,
      agentId,
      depth: 0,
      constraints: { ...constraints },
      grantedAt: now,
      expiresAt,
      chain: [id],
    };

    this.capabilities.set(id, capability);
    this.budgetTracker.registerRoot(capability);
    return capability;
  }

  /**
   * Delegate authority from parent to child agent.
   *
   * The child's constraints MUST be a subset of the parent's.
   * If child attempts to widen → BLOCK with violations.
   */
  delegate(
    parentCapabilityId: string,
    childAgentId: string,
    childConstraints: IntentConstraint,
    options: { expiresAt?: string } = {}
  ): { capability?: Capability; violations: Violation[] } {
    const parent = this.capabilities.get(parentCapabilityId);
    if (!parent) {
      return {
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Parent capability ${parentCapabilityId} not found`,
        }],
      };
    }

    if (parent.revokedAt) {
      return {
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Parent capability ${parentCapabilityId} has been revoked`,
        }],
      };
    }

    if (parent.expiresAt && new Date(parent.expiresAt) < new Date()) {
      return {
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "EXPIRED" as ViolationType,
          reason: `Parent capability ${parentCapabilityId} has expired`,
        }],
      };
    }

    // Validate child ⊆ parent
    const violations = this.validateSubset(parent.constraints, childConstraints);
    if (violations.length > 0) {
      return { violations };
    }

    const id = `cap_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const capability: Capability = {
      id,
      parentId: parentCapabilityId,
      agentId: childAgentId,
      depth: parent.depth + 1,
      constraints: { ...childConstraints },
      grantedAt: now,
      expiresAt: options.expiresAt || parent.expiresAt,
      chain: [...parent.chain, id],
    };

    this.capabilities.set(id, capability);
    const budgetCheck = this.budgetTracker.registerDelegation(parentCapabilityId, capability);
    if (!budgetCheck.valid) {
      this.capabilities.delete(id);
      return {
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: budgetCheck.reason!,
        }],
      };
    }
    return { capability, violations: [] };
  }

  /**
   * Validate a proposal against a capability.
   *
   * Returns ALLOW / BLOCK / APPROVAL_REQUIRED.
   */
  validateProposal(
    capabilityId: string,
    proposal: {
      asset?: string;
      action?: string;
      amount?: number;
    }
  ): { decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED"; violations: Violation[] } {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) {
      return {
        decision: "BLOCK",
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Capability ${capabilityId} not found`,
        }],
      };
    }

    if (cap.revokedAt) {
      return {
        decision: "BLOCK",
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Capability ${capabilityId} has been revoked`,
        }],
      };
    }

    if (cap.expiresAt && new Date(cap.expiresAt) < new Date()) {
      return {
        decision: "BLOCK",
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "EXPIRED" as ViolationType,
          reason: `Capability ${capabilityId} has expired`,
        }],
      };
    }

    const violations: Violation[] = [];
    const c = cap.constraints;

    // Check asset
    if (proposal.asset && c.allowedAssets?.length && !c.allowedAssets.includes(proposal.asset)) {
      violations.push({
        action: { type: (proposal.action || "BUY") as any, asset: proposal.asset },
        type: "ASSET_RESTRICTED" as ViolationType,
        reason: `Asset ${proposal.asset} is not in allowed assets: ${c.allowedAssets.join(", ")}`,
      });
    }

    // Check action
    if (proposal.action && c.allowedActions?.length && !c.allowedActions.includes(proposal.action as any)) {
      violations.push({
        action: { type: proposal.action as any, asset: proposal.asset || "" },
        type: "ACTION_DISALLOWED" as ViolationType,
        reason: `Action ${proposal.action} is not in allowed actions: ${c.allowedActions.join(", ")}`,
      });
    }

    // Check amount
    if (proposal.amount !== undefined) {
      if (c.maxPerOrder && proposal.amount > c.maxPerOrder) {
        violations.push({
          action: { type: (proposal.action || "BUY") as any, asset: proposal.asset || "" },
          type: "AMOUNT_EXCEEDS" as ViolationType,
          reason: `Amount $${proposal.amount} exceeds per-order limit of $${c.maxPerOrder}`,
        });
      }
      if (c.maxTotalSpend && proposal.amount > c.maxTotalSpend) {
        violations.push({
          action: { type: (proposal.action || "BUY") as any, asset: proposal.asset || "" },
          type: "AMOUNT_EXCEEDS" as ViolationType,
          reason: `Amount $${proposal.amount} exceeds total limit of $${c.maxTotalSpend}`,
        });
      }
    }

    // Check approval threshold
    let needsApproval = false;
    if (proposal.amount !== undefined && c.approvalThreshold && proposal.amount > c.approvalThreshold) {
      needsApproval = true;
    }
    if (proposal.amount !== undefined && c.requireApprovalAbove && proposal.amount > c.requireApprovalAbove) {
      needsApproval = true;
    }

    // Aggregate budget check: does this proposal exceed root's total budget?
    if (proposal.amount !== undefined) {
      const rootId = cap.chain[0];
      const aggregateCheck = this.budgetTracker.validateSplitEvasion(rootId, proposal.amount, "execute");
      if (!aggregateCheck.valid) {
        violations.push({
          action: { type: (proposal.action || "BUY") as any, asset: proposal.asset || "" },
          type: "AMOUNT_EXCEEDS" as ViolationType,
          reason: aggregateCheck.reason!,
        });
      }
    }

    if (violations.length > 0) {
      return { decision: "BLOCK", violations };
    }
    if (needsApproval) {
      return { decision: "APPROVAL_REQUIRED", violations: [] };
    }
    return { decision: "ALLOW", violations: [] };
  }

  /**
   * Validate an entire delegation chain.
   *
   * Walks from root to leaf, asserting Cᵢ ⊆ Cᵢ₋₁ at every step.
   */
  validateChain(chainId: string): ProvenanceResult {
    const chain = this.chains.get(chainId);
    if (!chain) {
      return {
        valid: false,
        chain: {
          id: chainId,
          capabilities: [],
          rootCapabilityId: "",
          leafCapabilityId: "",
          depth: 0,
        },
        violations: [{
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING" as ViolationType,
          reason: `Chain ${chainId} not found`,
        }],
      };
    }

    const violations: Violation[] = [];

    for (let i = 1; i < chain.capabilities.length; i++) {
      const parent = chain.capabilities[i - 1];
      const child = chain.capabilities[i];
      const stepViolations = this.validateSubset(parent.constraints, child.constraints);
      stepViolations.forEach(v => {
        v.reason = `[Step ${i}: ${parent.agentId} → ${child.agentId}] ${v.reason}`;
      });
      violations.push(...stepViolations);
    }

    return {
      valid: violations.length === 0,
      chain,
      violations,
    };
  }

  /**
   * Build a delegation chain from a root capability.
   */
  buildChain(rootCapabilityId: string): DelegationChain | undefined {
    const root = this.capabilities.get(rootCapabilityId);
    if (!root) return undefined;

    const capabilities: Capability[] = [root];
    let current = root;

    while (current.parentId) {
      const parent = this.capabilities.get(current.parentId);
      if (!parent) break;
      capabilities.unshift(parent);
      current = parent;
    }

    const chain: DelegationChain = {
      id: `chain_${rootCapabilityId}`,
      capabilities,
      rootCapabilityId: capabilities[0].id,
      leafCapabilityId: capabilities[capabilities.length - 1].id,
      depth: capabilities.length - 1,
    };

    this.chains.set(chain.id, chain);
    return chain;
  }

  /**
   * Revoke a capability and all its descendants.
   */
  revoke(capabilityId: string, reason: string): { revoked: string[] } {
    const revoked: string[] = [];
    const cap = this.capabilities.get(capabilityId);
    if (!cap) return { revoked };

    const now = new Date().toISOString();
    cap.revokedAt = now;
    cap.revocationReason = reason;
    revoked.push(capabilityId);

    // Revoke all descendants
    for (const [id, c] of this.capabilities) {
      if (c.chain.includes(capabilityId) && c.id !== capabilityId) {
        c.revokedAt = now;
        c.revocationReason = `Ancestor ${capabilityId} revoked: ${reason}`;
        revoked.push(id);
      }
    }

    // Cascade revoke in budget tracker
    this.budgetTracker.revoke(capabilityId);

    return { revoked };
  }

  /**
   * Get a capability by ID.
   */
  getCapability(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get all capabilities for an agent.
   */
  getCapabilitiesForAgent(agentId: string): Capability[] {
    return Array.from(this.capabilities.values()).filter(c => c.agentId === agentId);
  }

  /**
   * Get the budget tracker for aggregate budget enforcement.
   */
  getBudgetTracker(): BudgetTracker {
    return this.budgetTracker;
  }

  /**
   * Record an execution against the budget tracker.
   */
  recordExecution(capabilityId: string, amount: number) {
    return this.budgetTracker.recordExecution(capabilityId, amount);
  }

  // ─── Private ──────────────────────────────────────────────────

  /**
   * Validate that child constraints are a subset of parent constraints.
   *
   * C_child ⊆ C_parent iff:
   *   - allowedAssets(child) ⊆ allowedAssets(parent)
   *   - allowedActions(child) ⊆ allowedActions(parent)
   *   - maxPerOrder(child) ≤ maxPerOrder(parent) (omission = widening)
   *   - maxTotalSpend(child) ≤ maxTotalSpend(parent) (omission = widening)
   *   - maxDailySpend(child) ≤ maxDailySpend(parent) (omission = widening)
   *   - approvalThreshold(child) ≥ approvalThreshold(parent) (omission = widening)
   *   - requireApprovalAbove(child) ≥ requireApprovalAbove(parent) (omission = widening)
   *   - expiresAt(child) ≤ expiresAt(parent) (omission = widening if parent has one)
   *   - prohibitedActions(child) ⊇ prohibitedActions(parent) (removal = widening)
   */
  private validateSubset(
    parent: IntentConstraint,
    child: IntentConstraint
  ): Violation[] {
    const violations: Violation[] = [];

    // ─── ASSET ESCALATION ─────────────────────────────────────
    if (child.allowedAssets?.length && parent.allowedAssets?.length) {
      const newAssets = child.allowedAssets.filter(a => !parent.allowedAssets!.includes(a));
      for (const asset of newAssets) {
        violations.push({
          action: { type: "BUY", asset },
          type: "AUTHORITY_WIDENING",
          reason: `ASSET_ESCALATION: Child granted asset ${asset} not in parent authority [${parent.allowedAssets!.join(", ")}]`,
        });
      }
    }

    // Wildcard: child has no asset restriction but parent does
    if ((!child.allowedAssets || child.allowedAssets.length === 0) && parent.allowedAssets?.length) {
      violations.push({
        action: { type: "BUY", asset: "*" },
        type: "AUTHORITY_WIDENING",
        reason: `ASSET_ESCALATION: Child has unrestricted assets but parent is limited to [${parent.allowedAssets!.join(", ")}]`,
      });
    }

    // ─── ACTION ESCALATION ────────────────────────────────────
    if (child.allowedActions?.length && parent.allowedActions?.length) {
      const newActions = child.allowedActions.filter(a => !parent.allowedActions!.includes(a as any));
      for (const action of newActions) {
        violations.push({
          action: { type: action as any, asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `ACTION_ESCALATION: Child granted action ${action} not in parent authority [${parent.allowedActions!.join(", ")}]`,
        });
      }
    }

    // Wildcard: child has no action restriction but parent does
    if ((!child.allowedActions || child.allowedActions.length === 0) && parent.allowedActions?.length) {
      violations.push({
        action: { type: "BUY", asset: "" },
        type: "AUTHORITY_WIDENING",
        reason: `ACTION_ESCALATION: Child has unrestricted actions but parent is limited to [${parent.allowedActions!.join(", ")}]`,
      });
    }

    // ─── AMOUNT ESCALATION (including omission detection) ─────
    // If parent defines a limit and child omits it, child has no limit = unlimited = widening
    if (parent.maxPerOrder !== undefined) {
      if (child.maxPerOrder === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child omits per-order limit (parent has $${parent.maxPerOrder}) — omission = unlimited`,
        });
      } else if (child.maxPerOrder > parent.maxPerOrder) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child per-order limit $${child.maxPerOrder} exceeds parent limit $${parent.maxPerOrder}`,
        });
      }
    }

    if (parent.maxTotalSpend !== undefined) {
      if (child.maxTotalSpend === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child omits total spend limit (parent has $${parent.maxTotalSpend}) — omission = unlimited`,
        });
      } else if (child.maxTotalSpend > parent.maxTotalSpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child total limit $${child.maxTotalSpend} exceeds parent limit $${parent.maxTotalSpend}`,
        });
      }
    }

    if (parent.maxDailySpend !== undefined) {
      if (child.maxDailySpend === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child omits daily spend limit (parent has $${parent.maxDailySpend}) — omission = unlimited`,
        });
      } else if (child.maxDailySpend > parent.maxDailySpend) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `AMOUNT_ESCALATION: Child daily limit $${child.maxDailySpend} exceeds parent limit $${parent.maxDailySpend}`,
        });
      }
    }

    // ─── APPROVAL THRESHOLD ESCALATION ────────────────────────
    // Higher threshold = fewer orders need approval = widening
    if (parent.approvalThreshold !== undefined) {
      if (child.approvalThreshold === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `OVERSIGHT_ESCALATION: Child omits approval threshold (parent has $${parent.approvalThreshold}) — removal of human oversight`,
        });
      } else if (child.approvalThreshold > parent.approvalThreshold) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `OVERSIGHT_ESCALATION: Child approval threshold $${child.approvalThreshold} exceeds parent $${parent.approvalThreshold} — fewer orders need approval`,
        });
      }
    }

    if (parent.requireApprovalAbove !== undefined) {
      if (child.requireApprovalAbove === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `OVERSIGHT_ESCALATION: Child omits requireApprovalAbove (parent has $${parent.requireApprovalAbove}) — removal of human oversight`,
        });
      } else if (child.requireApprovalAbove > parent.requireApprovalAbove) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `OVERSIGHT_ESCALATION: Child requireApprovalAbove $${child.requireApprovalAbove} exceeds parent $${parent.requireApprovalAbove}`,
        });
      }
    }

    // ─── TEMPORAL ESCALATION ──────────────────────────────────
    if (parent.expiresAt !== undefined) {
      if (child.expiresAt === undefined) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `TEMPORAL_ESCALATION: Child omits expiry (parent expires ${parent.expiresAt}) — indefinite authority`,
        });
      } else {
        const parentExpiry = new Date(parent.expiresAt).getTime();
        const childExpiry = new Date(child.expiresAt).getTime();
        if (childExpiry > parentExpiry) {
          violations.push({
            action: { type: "BUY", asset: "" },
            type: "AUTHORITY_WIDENING",
            reason: `TEMPORAL_ESCALATION: Child expires ${child.expiresAt} after parent ${parent.expiresAt}`,
          });
        }
      }
    }

    // ─── PROHIBITED ACTIONS REMOVAL ───────────────────────────
    if (parent.prohibitedActions?.length) {
      if (!child.prohibitedActions || child.prohibitedActions.length === 0) {
        violations.push({
          action: { type: "BUY", asset: "" },
          type: "AUTHORITY_WIDENING",
          reason: `PROHIBITION_REMOVAL: Child has no prohibited actions but parent prohibits [${parent.prohibitedActions.join(", ")}]`,
        });
      } else {
        const removed = parent.prohibitedActions.filter(a => !child.prohibitedActions!.includes(a));
        for (const action of removed) {
          violations.push({
            action: { type: action as any, asset: "" },
            type: "AUTHORITY_WIDENING",
            reason: `PROHIBITION_REMOVAL: Child removed prohibition on ${action} (parent prohibits [${parent.prohibitedActions.join(", ")}])`,
          });
        }
      }
    }

    return violations;
  }
}
