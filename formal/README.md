# INTENTRA Formal Model

This directory contains a TLA+ **structural abstraction** of INTENTRA's
delegation lattice. It models the shape of authority (what a capability allows)
and the revocation/lineage rules. It is a design aid, not a machine-checked
proof of the deployed contract.

> **Scope note.** The budget and vault accounting that fixes the
> double-commitment failure — `spent + allocated <= max_total`,
> `committed == Σ live-root outstanding + Σ pending`, and the depth limit — is
> enforced in Rust (`near/contract/src/lib.rs`) and exercised by
> `near/contract/tests/security.rs`. Those invariants are not encoded in this
> TLA module. See `near/SPEC.md` for the authoritative rules.

## What the model covers

- **Monotonic narrowing.** Every delegation keeps the child a subset of the
  parent in assets, actions, per-action and total limits, expiry and
  prohibitions.
- **Transitive closure.** If `A → B → C`, then `C` is a subset of `A`.
- **Revocation cascade.** Revoking a capability marks all descendants revoked.
- **No orphaned capabilities.** Every non-root capability has a valid parent.
- **Proposal validation.** `ValidateProposal` allows only actions, assets and
  amounts inside the capability.

## What the model does not cover

- Aggregate budget reservation across siblings (`total_allocated`).
- Parent spending versus child reservations (the P0 double-commitment bug).
- Vault-level commitment across multiple roots.
- Checked-arithmetic overflow behaviour.
- Depth cap enforcement at delegation.
- Settlement callbacks and failure refunds.

These are covered by the Rust tests (41 total) and the independent testnet
verifier (25/25 checks), not by TLA+.

## How to check

```bash
# With TLC (https://lamport.azureedge.net/tla/tools.html)
java -jar tla2tools.jar -config MC.cfg IntentraCapability.tla

# With Apalache (https://apalache.informal.systems/)
apalache typecheck IntentraCapability.tla
apalache check --inv=MonotonicNarrowing IntentraCapability.tla
```

TLC/Apalache are not run in CI; the model is provided for reviewers who want to
inspect the delegation lattice independently.

## Mapping to the implementation

| TLA+ concept | Rust contract |
|---|---|
| `CapSet` | `Capability` (`allowed_actions`, `allowed_assets`, `max_total`, `max_per_action`, `expires_at_ns`, `prohibited_actions`) |
| `IsSubset(child, parent)` | attenuation checks in `delegate` |
| `Delegate(parent, child)` | `delegate(...)` |
| `Revoke(capId)` | `revoke(...)` (descendants invalidated at execution time) |
| `ValidateProposal(capId, proposal)` | policy checks in `execute_transfer` |
| `OmissionWidening` | omitted child restrictions are treated as widening |
| `RevocationCascade` | lineage walk in `usable_capability` |

## Design decisions reflected in the contract

1. **Omission is widening.** A child cannot drop a parent restriction.
2. **Prohibitions are additive.** A child must prohibit at least what the parent
   prohibits.
3. **Expiry is monotonic.** A child cannot outlive its parent.
4. **Delegation rights cannot be invented.** A child cannot gain `can_delegate`
   if the parent lacks it.
5. **Revocation is lazy but total.** Descendants are not rewritten; every
   execution walks the lineage and rejects if any ancestor is revoked.

## References

- Lamport, L. *Specifying Systems* (2002)
- Apalache manual: <https://apalache.informal.systems/docs/>
