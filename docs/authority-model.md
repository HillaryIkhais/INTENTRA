# INTENTRA — Authority Model

## Core Principle

Authority can only narrow.
Never widen.

A child agent can inherit authority from its parent.
It can never manufacture more.

## Capability

A capability is an explicit, machine-readable representation of authority.

```typescript
interface Capability {
  id: string;                    // unique identifier
  issuer: string;                // who issued this capability
  subject: string;               // who holds this capability
  depth: number;                 // 0 = root, 1+ = delegated
  parentCapabilityId?: string;   // source of authority (if delegated)
  constraints: {
    objective: string;           // human-readable purpose
    allowedActions: string[];    // permitted operations
    allowedAssets: string[];     // permitted assets
    maxPerOrder?: number;        // per-transaction limit
    maxTotalSpend?: number;      // cumulative limit
    maxDailySpend?: number;      // daily limit
    approvalThreshold?: number;  // requires human above this
    prohibitedActions?: string[];// explicit denials
    expiresAt?: string;          // temporal boundary
  };
  createdAt: string;
}
```

## Subset Relation

A child capability `C_child` is a subset of its parent `C_parent` if and only if:

```
C_child ⊆ C_parent ⟺
  C_child.allowedAssets ⊆ C_parent.allowedAssets
  ∧ C_child.allowedActions ⊆ C_parent.allowedActions
  ∧ C_child.maxPerOrder ≤ C_parent.maxPerOrder (if both exist)
  ∧ C_child.maxTotalSpend ≤ C_parent.maxTotalSpend (if both exist)
  ∧ C_child.maxDailySpend ≤ C_parent.maxDailySpend (if both exist)
  ∧ C_child.approvalThreshold ≥ C_parent.approvalThreshold (if both exist)
  ∧ C_child.expiresAt ≤ C_parent.expiresAt (if both exist)
  ∧ C_child.prohibitedActions ⊇ C_parent.prohibitedActions (if both exist)
```

## Omission Rule

If a parent has a restriction and the child omits it,
the omission is treated as unlimited — which is widening.

```
Parent: maxPerOrder = 10
Child:  maxPerOrder = undefined (omitted)

→ AMOUNT_ESCALATION: Child omits per-order limit (parent has $10) — omission = unlimited
```

This is the critical insight: omission must be detected as widening,
not silently accepted.

## Delegation Chain

A delegation chain is a sequence of capabilities:

```
C₀ → C₁ → C₂ → ... → Cₙ
```

where each `Cᵢ` is a child of `Cᵢ₋₁`.

The chain is valid if and only if:

```
∀ i ∈ {1, ..., n}: Cᵢ ⊆ Cᵢ₋₁
```

## Revocation

Revoking a capability cascades to all descendants:

```
C₀ (revoked)
  → C₁ (dead)
    → C₂ (dead)
```

A dead capability cannot execute proposals.

## Expiry

A capability expires at its `expiresAt` timestamp.
An expired capability cannot execute proposals.

A child cannot extend its expiry beyond its parent's:

```
Parent: expiresAt = 2026-09-07T15:55:00
Child:  expiresAt = 2026-09-07T16:45:00

→ TEMPORAL_ESCALATION: Child expires after parent
```

## Prohibitions

Prohibitions are explicit denials that cannot be removed:

```
Parent: prohibitedActions = ["SELL"]
Child:  prohibitedActions = [] (empty)

→ PROHIBITION_REMOVAL: Child has no prohibited actions but parent prohibits [SELL]
```

## Approval Threshold

The approval threshold specifies the amount above which human
approval is required. A child cannot raise this threshold:

```
Parent: approvalThreshold = 50
Child:  approvalThreshold = 500

→ OVERSIGHT_ESCALATION: Child approval threshold exceeds parent — fewer orders need approval
```
