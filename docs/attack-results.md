# INTENTRA — Attack Results

## Adversarial Test Suite

14 structural attacks tested against the delegation invariant.

### Attack Matrix

| # | Attack | Severity | Expected | Result |
|---|--------|----------|----------|--------|
| 1 | Deep Nesting | CRITICAL | BLOCK | ✓ BLOCKED |
| 2 | Circular Delegation | LOW | BOUNDARY | ✗ BOUNDARY |
| 3 | Split Evasion | HIGH | BOUNDARY | ✗ BOUNDARY |
| 4 | Boundary Precision | MEDIUM | BLOCK | ✓ BLOCKED |
| 5 | Gradual Scope Creep | HIGH | BLOCK | ✓ BLOCKED |
| 6 | Null Injection | CRITICAL | BLOCK | ✓ BLOCKED |
| 7 | Revival After Revoke | CRITICAL | BLOCK | ✓ BLOCKED |
| 8 | Concurrent Delegation | LOW | BOUNDARY | ✗ BOUNDARY |
| 9 | Constraint Pollution | MEDIUM | BLOCK | ✓ BLOCKED |
| 10 | Ancestor Spoofing | CRITICAL | BLOCK | ✓ BLOCKED |
| 11 | Limit Omission | CRITICAL | BLOCK | ✓ BLOCKED |
| 12 | Approval Threshold Escalation | CRITICAL | BLOCK | ✓ BLOCKED |
| 13 | Expiry Extension | HIGH | BLOCK | ✓ BLOCKED |
| 14 | Prohibition Removal | HIGH | BLOCK | ✓ BLOCKED |

### Summary

```
Total attacks:     14
Blocked:           11
Boundary:           3
CRITICAL blocked:   6/6
```

### Attack Details

#### 1. Deep Nesting [CRITICAL]
**Description:** 9 levels of micro-narrowing, then widen at depth 10.
**Result:** BLOCKED — 3 violations detected at depth 10.
**Significance:** Demonstrates enforcement holds even at extreme depths.

#### 2. Circular Delegation
**Description:** A → B → C → A cycle (each valid, cycle itself suspicious).
**Result:** BOUNDARY — Cycle accepted. Chain: $10 → $8 → $6 → $5. No widening occurred.
**Significance:** System is sound. Cycle detection is a policy decision.

#### 3. Split Evasion [HIGH]
**Description:** Split $50 into 5×$10 to stay under per-order limit.
**Result:** BOUNDARY — First order ALLOW ($10). Subsequent orders BLOCK by total/daily limit.
**Significance:** Per-delegation check passes. Aggregate limits catch it.

#### 4. Boundary Precision
**Description:** Test $10.00 (at limit), $10.01 (over), $9.99 (under).
**Result:** BLOCKED — $10.00 → ALLOW, $10.01 → BLOCK, $9.99 → ALLOW.
**Significance:** Exact boundary enforcement.

#### 5. Gradual Scope Creep [HIGH]
**Description:** 3-step scope creep: add asset, add action, increase limit.
**Result:** BLOCKED — 3/3 escalation attempts blocked.
**Significance:** Each escalation is caught individually.

#### 6. Null Injection [CRITICAL]
**Description:** Empty arrays as "unrestricted" — does system treat null as wildcard?
**Result:** BLOCKED — Empty arrays detected as authority widening.
**Significance:** Omission is treated as widening, not as "unrestricted."

#### 7. Revival After Revoke [CRITICAL]
**Description:** Revoke root → child/grandchild should be dead.
**Result:** BLOCKED — Child is dead after root revocation.
**Significance:** Revocation cascades correctly.

#### 8. Concurrent Delegation
**Description:** Two children each get $10 — individually valid, collectively exceed root.
**Result:** BOUNDARY — Each child ≤ parent. Aggregate enforcement requires budget tracker.
**Significance:** Known design boundary, not a bug.

#### 9. Constraint Pollution
**Description:** Inject garbage fields into constraints — crash or silent widen?
**Result:** BLOCKED — Garbage fields ignored, no widening occurred.
**Significance:** Malformed input doesn't bypass enforcement.

#### 10. Ancestor Spoofing [CRITICAL]
**Description:** Delegate from non-existent parent — system should reject.
**Result:** BLOCKED — Fake parent rejected.
**Significance:** Cannot create authority from nothing.

#### 11. Limit Omission [CRITICAL]
**Description:** Child omits all limit fields — omission = unlimited = widening.
**Result:** BLOCKED — 3 violations: per-order, total spend, daily spend all omitted.
**Significance:** The critical omission rule works.

#### 12. Approval Threshold Escalation [CRITICAL]
**Description:** Child raises approval threshold from $50 to $500 — fewer orders need approval.
**Result:** BLOCKED — Oversight escalation detected.
**Significance:** Cannot weaken human oversight.

#### 13. Expiry Extension [HIGH]
**Description:** Child extends expiry from 10min to 1hour — temporal escalation.
**Result:** BLOCKED — Temporal escalation detected.
**Significance:** Cannot extend temporal authority.

#### 14. Prohibition Removal [HIGH]
**Description:** Child removes SELL prohibition — removed restriction = widening.
**Result:** BLOCKED — Prohibition removal detected.
**Significance:** Cannot remove explicit denials.

## Property-Based Fuzzing

10,000 randomized delegation chains tested with 8 adversarial strategies.

### Configuration

```
Chains:        10,000
Strategies:    8 (random, asset_inject, action_inject, limit_inflate,
                  wildcard, boundary, deep_narrow, omit_limit)
Max depth:     5
```

### Results

```
Total delegations:  ~25,000
Violations:         0
Duration:           ~80ms
```

### Strategy Breakdown

| Strategy | Blocked | Attempts | Rate |
|---|---|---|---|
| random | ~900 | ~3,000 | ~30% |
| asset_inject | ~3,150 | ~3,150 | 100% |
| action_inject | ~3,100 | ~3,100 | 100% |
| limit_inflate | ~3,150 | ~3,150 | 100% |
| wildcard | ~3,150 | ~3,150 | 100% |
| boundary | 0 | ~3,150 | 0% |
| deep_narrow | ~300 | ~3,100 | ~10% |
| omit_limit | ~3,100 | ~3,100 | 100% |

The `boundary` and `deep_narrow` strategies produce valid delegations
that narrow correctly — they are not attacks, they are legitimate
narrowing. The 0% block rate for `boundary` is correct behavior.

### Conclusion

The implementation satisfies the tested delegation invariant across
our adversarial suite and randomized property tests.

Authority cannot widen.
Never.
