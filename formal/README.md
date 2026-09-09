# INTENTRA Formal Model

This directory contains a TLA+ specification of INTENTRA's core invariant.

## What It Proves

The formal model proves five theorems about the capability lattice:

### THEOREM 1: Authority Cannot Widen
```
∀ child capabilities Cᵢ:
    Cᵢ ⊆ Cᵢ₋₁
```
Every delegation preserves the subset invariant. No child can acquire authority that its parent did not possess.

### THEOREM 2: Lineage Is Sound
```
If A → B → C, then C ⊆ A
```
Transitive closure holds across arbitrary delegation depths. The full lineage from root to leaf is sound.

### THEOREM 3: Revocation Is Total
```
If parent is revoked, all descendants are revoked
```
Revocation cascades through the entire delegation tree. No orphaned capabilities remain.

### THEOREM 4: Omission Equals Widening
```
Omitting a restriction = widening
```
If a parent defines a limit and the child omits it, the child has unlimited authority. This is detected as widening.

### THEOREM 5: Proposal Validation Is Sound
```
ALLOW ⟹ asset ∈ allowed ∧ action ∈ allowed ∧ amount ≤ limit
```
When INTENTRA allows a proposal, it respects the full capability lattice.

## Model Structure

The TLA+ specification defines:

- **Capabilities**: Constrained by assets, actions, limits, expiry, prohibitions
- **Subset ordering**: `C_child ⊆ C_parent` iff child is narrower in every dimension
- **Delegation**: Creates new capabilities with strict subset constraint
- **Revocation**: Cascades through the delegation tree
- **Proposal validation**: Checks against the capability lattice

## How to Check

### With TLC Model Checker

```bash
# Install TLA+ tools
# https://lamport.azureedge.net/tla/tools.html

# Run model checker
tla2tools.jar -config MC.cfg IntentraCapability.tla
```

### With Apalache

```bash
# Install Apalache
# https://apalache.informal.systems/

# Type check
apalache typecheck IntentraCapability.tla

# Check invariants
apalache check --inv=MonotonicNarrowing IntentraCapability.tla
```

## Mapping to Code

| TLA+ Concept | TypeScript Equivalent |
|---|---|
| `CapSet` | `IntentConstraint` interface |
| `IsSubset(child, parent)` | `validateSubset()` in `CapabilityCompiler` |
| `Delegate(parent, child)` | `compiler.delegate()` |
| `Revoke(capId)` | `compiler.revoke()` |
| `ValidateProposal(capId, proposal)` | `compiler.validateProposal()` |
| `OmissionWidening` | Omission detection in `validateSubset()` |

## Key Design Decisions

1. **Omission = Widening**: If a parent defines a limit and the child omits it, the child has unlimited authority. This is a critical security property.

2. **Prohibited Actions Are Additive**: A child must prohibit at least what the parent prohibits. Removing a prohibition is widening.

3. **Expiry Is Monotonic**: A child's expiry must be before or equal to the parent's expiry. Extending expiry is widening.

4. **Approval Threshold Is Inverted**: A higher approval threshold means fewer orders need approval. This is widening.

## References

- Lamport, L. "Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers" (2002)
- Apalache Manual: https://apalache.informal.systems/docs/
