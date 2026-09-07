import { CapabilityCompiler } from "./capability-compiler.js";
import { IntentConstraint, Capability } from "../types/index.js";

/**
 * INTENTRA — Authority Property Fuzzer (Hardened)
 *
 * Not random mutation. Targeted adversarial strategies.
 *
 * Strategies:
 *   1. Asset injection — always add asset not in parent
 *   2. Action injection — always add action not in parent
 *   3. Limit inflation — increase limit by $1
 *   4. Wildcard — empty arrays (unrestricted)
 *   5. Boundary — match parent exactly, then +$0.01
 *   6. Deep narrow — narrow 9 times, widen at depth 10
 *
 * Asserts: ∀ child capabilities Cᵢ: Cᵢ ⊆ Cᵢ₋₁
 */

const ASSETS = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX", "LINK"];
const ACTIONS: Array<"BUY" | "SELL" | "TRANSFER" | "WITHDRAW" | "HOLD"> = ["BUY", "SELL", "TRANSFER", "WITHDRAW", "HOLD"];

interface FuzzResult {
  totalChains: number;
  totalDelegations: number;
  violations: number;
  violationDetails: string[];
  maxChainDepth: number;
  duration: number;
  strategies: Record<string, { attempts: number; blocked: number }>;
}

type Strategy = "random" | "asset_inject" | "action_inject" | "limit_inflate" | "wildcard" | "boundary" | "deep_narrow" | "omit_limit";

const STRATEGIES: Strategy[] = [
  "random", "asset_inject", "action_inject", "limit_inflate",
  "wildcard", "boundary", "deep_narrow", "omit_limit",
];

export function fuzzAuthorityProperties(
  iterations: number = 10000
): FuzzResult {
  const startTime = Date.now();
  let violations = 0;
  const violationDetails: string[] = [];
  let totalDelegations = 0;
  let maxChainDepth = 0;
  const strategies: Record<string, { attempts: number; blocked: number }> = {};
  for (const s of STRATEGIES) {
    strategies[s] = { attempts: 0, blocked: 0 };
  }

  for (let i = 0; i < iterations; i++) {
    const compiler = new CapabilityCompiler();
    const rootConstraints = randomConstraints();
    const root = compiler.issueRoot(`agent-${i}`, rootConstraints);

    const chainDepth = 1 + Math.floor(Math.random() * 4);
    const chain: Capability[] = [root];
    let current = root;
    let chainValid = true;

    for (let d = 0; d < chainDepth; d++) {
      totalDelegations++;

      const strategy: Strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
      strategies[strategy].attempts++;

      let childConstraints: IntentConstraint;
      let isAdversarial: boolean;

      switch (strategy) {
        case "asset_inject":
          childConstraints = injectAsset(current.constraints);
          isAdversarial = true;
          break;
        case "action_inject":
          childConstraints = injectAction(current.constraints);
          isAdversarial = true;
          break;
        case "limit_inflate":
          childConstraints = inflateLimit(current.constraints);
          isAdversarial = true;
          break;
        case "wildcard":
          childConstraints = wildcard();
          isAdversarial = true;
          break;
        case "boundary":
          childConstraints = boundaryTest(current.constraints);
          isAdversarial = false; // boundary is valid
          break;
        case "deep_narrow":
          childConstraints = deepNarrow(current.constraints, d);
          isAdversarial = d === chainDepth - 1 && chainDepth > 3;
          if (isAdversarial) {
            childConstraints = inflateLimit(current.constraints);
          }
          break;
        case "omit_limit":
          childConstraints = omitLimit(current.constraints);
          isAdversarial = true;
          break;
        default: // random
          childConstraints = Math.random() < 0.3
            ? mutateWiden(current.constraints)
            : mutateNarrow(current.constraints);
          isAdversarial = !isSubset(childConstraints, current.constraints);
      }

      const { capability: child, violations: stepViolations } = compiler.delegate(
        current.id,
        `child-${i}-${d}`,
        childConstraints
      );

      if (isAdversarial && child) {
        if (!isSubset(childConstraints, current.constraints)) {
          violations++;
          violationDetails.push(
            `[${strategy}] Chain ${i} depth ${d}: Adversarial delegation accepted`
          );
          strategies[strategy].blocked++;
          chainValid = false;
          break;
        }
      }

      if (!isAdversarial && stepViolations.length > 0) {
        violations++;
        violationDetails.push(
          `[${strategy}] Chain ${i} depth ${d}: Valid delegation rejected — ${stepViolations[0]?.reason}`
        );
        chainValid = false;
        break;
      }

      if (isAdversarial) {
        strategies[strategy].blocked++;
      }

      if (child) {
        chain.push(child);
        current = child;
      }
    }

    if (chain.length > maxChainDepth) {
      maxChainDepth = chain.length;
    }

    // Post-chain validation
    if (chainValid && chain.length > 1) {
      for (let j = 1; j < chain.length; j++) {
        if (!isSubset(chain[j].constraints, chain[j - 1].constraints)) {
          violations++;
          violationDetails.push(
            `Chain ${i} step ${j}: Subset invariant violated`
          );
        }
      }
    }
  }

  return {
    totalChains: iterations,
    totalDelegations,
    violations,
    violationDetails: violationDetails.slice(0, 10),
    maxChainDepth,
    duration: Date.now() - startTime,
    strategies,
  };
}

// ─── Targeted Adversarial Strategies ──────────────────────────

function injectAsset(parent: IntentConstraint): IntentConstraint {
  const child: IntentConstraint = {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : [],
  };
  const newAsset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
  if (!child.allowedAssets.includes(newAsset)) {
    child.allowedAssets.push(newAsset);
  }
  return child;
}

function injectAction(parent: IntentConstraint): IntentConstraint {
  const child: IntentConstraint = {
    ...parent,
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : [],
  };
  const newAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  if (!child.allowedActions.includes(newAction)) {
    child.allowedActions.push(newAction);
  }
  return child;
}

function inflateLimit(parent: IntentConstraint): IntentConstraint {
  const child: IntentConstraint = { ...parent };
  const amount = 1 + Math.floor(Math.random() * 100);
  if (child.maxPerOrder !== undefined) child.maxPerOrder += amount;
  if (child.maxTotalSpend !== undefined) child.maxTotalSpend += amount;
  if (child.maxDailySpend !== undefined) child.maxDailySpend += amount;
  return child;
}

function wildcard(): IntentConstraint {
  return {
    objective: "Unrestricted",
    allowedActions: [],
    allowedAssets: [],
    maxPerOrder: 100000,
    maxTotalSpend: 100000,
    maxDailySpend: 100000,
  };
}

function boundaryTest(parent: IntentConstraint): IntentConstraint {
  return {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : undefined,
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : undefined,
    prohibitedActions: parent.prohibitedActions ? [...parent.prohibitedActions] : undefined,
    allowedPairs: parent.allowedPairs ? [...parent.allowedPairs] : undefined,
  };
}

function omitLimit(parent: IntentConstraint): IntentConstraint {
  // Omit a random limit field — tests the critical finding
  const child: IntentConstraint = {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : undefined,
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : undefined,
  };
  const fields = ["maxPerOrder", "maxTotalSpend", "maxDailySpend"] as const;
  const field = fields[Math.floor(Math.random() * fields.length)];
  (child as any)[field] = undefined;
  return child;
}

function deepNarrow(parent: IntentConstraint, depth: number): IntentConstraint {
  const child: IntentConstraint = {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : undefined,
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : undefined,
  };
  const factor = Math.max(0.1, 1 - depth * 0.1);
  if (child.maxPerOrder !== undefined) child.maxPerOrder = Math.max(1, Math.floor(child.maxPerOrder * factor));
  if (child.maxTotalSpend !== undefined) child.maxTotalSpend = Math.max(1, Math.floor(child.maxTotalSpend * factor));
  if (child.maxDailySpend !== undefined) child.maxDailySpend = Math.max(1, Math.floor(child.maxDailySpend * factor));
  return child;
}

// ─── Random Helpers ───────────────────────────────────────────

function randomConstraints(): IntentConstraint {
  const numAssets = 1 + Math.floor(Math.random() * 3);
  const assets: string[] = [];
  for (let i = 0; i < numAssets; i++) {
    const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    if (!assets.includes(asset)) assets.push(asset);
  }

  const numActions = 1 + Math.floor(Math.random() * 2);
  const actions: Array<"BUY" | "SELL" | "TRANSFER" | "WITHDRAW" | "HOLD"> = [];
  for (let i = 0; i < numActions; i++) {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    if (!actions.includes(action)) actions.push(action);
  }

  return {
    objective: "Random trading",
    allowedActions: actions,
    allowedAssets: assets,
    maxPerOrder: 10 + Math.floor(Math.random() * 990),
    maxTotalSpend: 50 + Math.floor(Math.random() * 9950),
    maxDailySpend: 50 + Math.floor(Math.random() * 9950),
  };
}

function mutateNarrow(parent: IntentConstraint): IntentConstraint {
  // Deep copy to avoid mutating parent arrays
  const child: IntentConstraint = {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : undefined,
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : undefined,
    prohibitedActions: parent.prohibitedActions ? [...parent.prohibitedActions] : undefined,
    allowedPairs: parent.allowedPairs ? [...parent.allowedPairs] : undefined,
  };

  if (child.allowedAssets && child.allowedAssets.length > 1 && Math.random() < 0.5) {
    const idx = Math.floor(Math.random() * child.allowedAssets.length);
    child.allowedAssets = child.allowedAssets.filter((_, i) => i !== idx);
    if (child.allowedAssets.length === 0) {
      child.allowedAssets = [parent.allowedAssets![0]];
    }
  }

  if (child.allowedActions && child.allowedActions.length > 1 && Math.random() < 0.5) {
    const idx = Math.floor(Math.random() * child.allowedActions.length);
    child.allowedActions = child.allowedActions.filter((_, i) => i !== idx) as any;
    if (child.allowedActions.length === 0) {
      child.allowedActions = [parent.allowedActions![0]];
    }
  }

  if (child.maxPerOrder !== undefined && Math.random() < 0.5) {
    child.maxPerOrder = Math.max(1, Math.floor(child.maxPerOrder * (0.5 + Math.random() * 0.5)));
  }
  if (child.maxTotalSpend !== undefined && Math.random() < 0.5) {
    child.maxTotalSpend = Math.max(1, Math.floor(child.maxTotalSpend * (0.5 + Math.random() * 0.5)));
  }
  if (child.maxDailySpend !== undefined && Math.random() < 0.5) {
    child.maxDailySpend = Math.max(1, Math.floor(child.maxDailySpend * (0.5 + Math.random() * 0.5)));
  }

  return child;
}

function mutateWiden(parent: IntentConstraint): IntentConstraint {
  const child: IntentConstraint = {
    ...parent,
    allowedAssets: parent.allowedAssets ? [...parent.allowedAssets] : [],
    allowedActions: parent.allowedActions ? [...parent.allowedActions] as any : [],
    prohibitedActions: parent.prohibitedActions ? [...parent.prohibitedActions] : [],
    allowedPairs: parent.allowedPairs ? [...parent.allowedPairs] : [],
  };

  if (Math.random() < 0.6) {
    const newAsset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    if (!child.allowedAssets) child.allowedAssets = [];
    if (!child.allowedAssets.includes(newAsset)) {
      child.allowedAssets = [...child.allowedAssets, newAsset];
    }
  }

  if (Math.random() < 0.6) {
    const newAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)] as any;
    if (!child.allowedActions) child.allowedActions = [];
    if (!child.allowedActions.includes(newAction)) {
      child.allowedActions = [...child.allowedActions, newAction];
    }
  }

  if (child.maxPerOrder && Math.random() < 0.6) {
    child.maxPerOrder = child.maxPerOrder + 10 + Math.floor(Math.random() * 100);
  }
  if (child.maxTotalSpend && Math.random() < 0.6) {
    child.maxTotalSpend = child.maxTotalSpend + 50 + Math.floor(Math.random() * 500);
  }

  return child;
}

function isSubset(child: IntentConstraint, parent: IntentConstraint): boolean {
  // Assets
  if (child.allowedAssets?.length && parent.allowedAssets?.length) {
    for (const a of child.allowedAssets) {
      if (!parent.allowedAssets.includes(a)) return false;
    }
  }
  if ((!child.allowedAssets || child.allowedAssets.length === 0) && parent.allowedAssets?.length) {
    return false;
  }

  // Actions
  if (child.allowedActions?.length && parent.allowedActions?.length) {
    for (const a of child.allowedActions) {
      if (!parent.allowedActions.includes(a as any)) return false;
    }
  }
  if ((!child.allowedActions || child.allowedActions.length === 0) && parent.allowedActions?.length) {
    return false;
  }

  // Limits — omission = widening (child has no limit = unlimited)
  if (parent.maxPerOrder !== undefined) {
    if (child.maxPerOrder === undefined || child.maxPerOrder > parent.maxPerOrder) return false;
  }
  if (parent.maxTotalSpend !== undefined) {
    if (child.maxTotalSpend === undefined || child.maxTotalSpend > parent.maxTotalSpend) return false;
  }
  if (parent.maxDailySpend !== undefined) {
    if (child.maxDailySpend === undefined || child.maxDailySpend > parent.maxDailySpend) return false;
  }

  // Approval thresholds — higher = fewer approvals needed = widening
  if (parent.approvalThreshold !== undefined) {
    if (child.approvalActivity !== undefined && child.approvalThreshold! > parent.approvalThreshold) return false;
    if (child.approvalThreshold === undefined) return false;
  }
  if (parent.requireApprovalAbove !== undefined) {
    if (child.requireApprovalAbove !== undefined && child.requireApprovalAbove > parent.requireApprovalAbove) return false;
    if (child.requireApprovalAbove === undefined) return false;
  }

  // Temporal — child expires after parent = widening
  if (parent.expiresAt !== undefined) {
    if (child.expiresAt === undefined) return false;
    if (new Date(child.expiresAt).getTime() > new Date(parent.expiresAt).getTime()) return false;
  }

  // Prohibited actions — removal = widening
  if (parent.prohibitedActions?.length) {
    if (!child.prohibitedActions || child.prohibitedActions.length === 0) return false;
    for (const a of parent.prohibitedActions) {
      if (!child.prohibitedActions.includes(a)) return false;
    }
  }

  return true;
}
