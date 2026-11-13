//! INTENTRA security regression tests (integration-style, real contract code).
//!
//! These tests exercise the public contract API through the near-sdk
//! unit-testing environment. They encode the adversarial claims from
//! `near/ADVERSARIAL-TESTS.md` and the hardening directive.

use intentra_near::Contract;
use near_sdk::json_types::U128;
use near_sdk::test_utils::{testing_env_with_promise_results, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken, PromiseResult, VMContext};

const CONTRACT: &str = "intentra.testnet";
const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
/// A vault large enough that the global VAULT check never binds, so the
/// randomized property test only exercises per-tree conservation.
const LARGE_BALANCE: u128 = 1_000_000_000_000_000_000_000_000_000;

fn account(id: &str) -> AccountId {
    id.parse().unwrap()
}

fn ctx(predecessor: &str, timestamp: u64) -> VMContext {
    VMContextBuilder::new()
        .predecessor_account_id(account(predecessor))
        .current_account_id(account("intentra.testnet"))
        .block_timestamp(timestamp)
        .build()
}

fn ctx_with_balance(predecessor: &str, timestamp: u64, balance_yocto: u128) -> VMContext {
    VMContextBuilder::new()
        .predecessor_account_id(account(predecessor))
        .current_account_id(account("intentra.testnet"))
        .block_timestamp(timestamp)
        .account_balance(NearToken::from_yoctonear(balance_yocto))
        .storage_usage(0)
        .build()
}

/// Context for the stateful property test. Storage persists across
/// `testing_env!` calls in the mocked runtime while `current_storage_usage`
/// resets to the context value; a non-zero budget prevents an overwrite from
/// underflowing the mocked storage counter during the per-case flush.
fn ctx_prop(predecessor: &str, timestamp: u64) -> VMContext {
    VMContextBuilder::new()
        .predecessor_account_id(account(predecessor))
        .current_account_id(account("intentra.testnet"))
        .block_timestamp(timestamp)
        .account_balance(NearToken::from_yoctonear(LARGE_BALANCE))
        .storage_usage(10_000_000)
        .build()
}

fn expect_panic<F: FnOnce()>(f: F, needle: &str) {
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(f));
    let err = result.expect_err(&format!("expected panic containing '{}'", needle));
    let msg = err
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(
        msg.contains(needle),
        "panic '{}' did not contain '{}'",
        msg,
        needle
    );
}

fn grant(
    contract: &mut Contract,
    agent: &str,
    max_total: u128,
    max_per: u128,
    expires: Option<u64>,
) -> u64 {
    contract.grant_root(
        account(agent),
        U128(max_total),
        U128(max_per),
        vec!["transfer".to_string()],
        vec!["NEAR".to_string()],
        vec![],
        None,
        true,
        expires,
    )
}

fn delegate(
    contract: &mut Contract,
    parent: u64,
    agent: &str,
    max_total: u128,
    max_per: u128,
) -> u64 {
    contract.delegate(
        parent,
        account(agent),
        U128(max_total),
        U128(max_per),
        vec!["transfer".to_string()],
        vec!["NEAR".to_string()],
        vec![],
        None,
        true,
        None,
    )
}

// ---------------------------------------------------------------------------
// Claim: a parent can never spend authority it has already promised to its
// children. total_spent + total_allocated + amount <= max_total.
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "BUDGET_RESERVATION")]
fn parent_cannot_spend_budget_reserved_for_children() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400, None);

    testing_env!(ctx("a.testnet", 1_100));
    delegate(&mut contract, root, "b.testnet", 400, 100);
    delegate(&mut contract, root, "c.testnet", 400, 100);
    // 0 spent + 800 allocated + 201 > 1000: the 201 spend would consume
    // budget already promised to B and C.
    contract.execute_transfer(root, U128(201), account("x.testnet"), "overhead".into());
}

#[test]
fn parent_can_spend_within_unallocated_headroom() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400, None);

    testing_env!(ctx("a.testnet", 1_100));
    delegate(&mut contract, root, "b.testnet", 400, 100);
    delegate(&mut contract, root, "c.testnet", 400, 100);

    // headroom = 1000 - 0 spent - 800 allocated = 200
    let headroom = contract.get_capability(root).unwrap().remaining;
    assert_eq!(headroom, "200");

    // spending exactly the unallocated headroom is allowed
    contract.execute_transfer(root, U128(200), account("x.testnet"), "headroom".into());
    let after = contract.get_capability(root).unwrap();
    assert_eq!(after.total_spent, "200");
    assert_eq!(after.remaining, "0");

    // and one yocto more is not
    expect_panic(
        || {
            contract.execute_transfer(root, U128(1), account("x.testnet"), "one-more".into());
        },
        "BUDGET_RESERVATION",
    );
}

// ---------------------------------------------------------------------------
// Claim: the vault can never be overcommitted by multiple roots. Aggregate
// root authority is checked against the vault's usable balance.
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "VAULT")]
fn two_roots_cannot_collectively_overcommit_vault() {
    // usable vault balance = exactly 1 NEAR
    testing_env!(ctx_with_balance(
        "owner.testnet",
        1_000,
        1_000_000_000_000_000_000_000_000
    ));
    let mut contract = Contract::new();
    grant(
        &mut contract,
        "a.testnet",
        700_000_000_000_000_000_000_000,
        100,
        None,
    );
    // 0.7 + 0.7 > 1.0: individually valid, collectively over the vault
    grant(
        &mut contract,
        "d.testnet",
        700_000_000_000_000_000_000_000,
        100,
        None,
    );
}

#[test]
fn multiple_roots_are_issued_sequentially_up_to_vault_balance() {
    testing_env!(ctx_with_balance(
        "owner.testnet",
        1_000,
        1_000_000_000_000_000_000_000_000
    ));
    let mut contract = Contract::new();
    let r1 = grant(
        &mut contract,
        "a.testnet",
        400_000_000_000_000_000_000_000,
        100,
        None,
    );
    let r2 = grant(
        &mut contract,
        "d.testnet",
        400_000_000_000_000_000_000_000,
        100,
        None,
    );
    let r3 = grant(
        &mut contract,
        "e.testnet",
        200_000_000_000_000_000_000_000,
        100,
        None,
    );
    assert!(r1 < r2 && r2 < r3);

    let vault = contract.get_vault();
    assert_eq!(vault.committed, "1000000000000000000000000");
    assert_eq!(vault.available, "0");

    expect_panic(
        || {
            grant(&mut contract, "f.testnet", 1, 1, None);
        },
        "VAULT",
    );
}

// ---------------------------------------------------------------------------
// Claim (defining invariant): at every node in a delegation tree,
// `total_spent + total_allocated <= max_total`. A parent can obey its own
// spending limit and still be rejected when it tries to spend authority it has
// already promised to a child.
// ---------------------------------------------------------------------------

#[test]
fn exact_double_commitment_attack_is_rejected() {
    testing_env!(ctx_with_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    let a = grant(&mut contract, "a.testnet", ONE_NEAR, ONE_NEAR, None);

    testing_env!(ctx("a.testnet", 1_100));
    delegate(
        &mut contract,
        a,
        "b.testnet",
        400_000_000_000_000_000_000_000,
        400_000_000_000_000_000_000_000,
    );

    // A's own 1.00 limit looks sufficient for 0.61, but 0.40 is already
    // promised to B. Remaining headroom is exactly 0.60.
    assert_eq!(
        contract.get_capability(a).unwrap().remaining,
        "600000000000000000000000"
    );

    expect_panic(
        || {
            contract.execute_transfer(
                a,
                U128(610_000_000_000_000_000_000_000),
                account("x.testnet"),
                "double-commit".into(),
            );
        },
        "BUDGET_RESERVATION",
    );

    // Spending exactly the uncommitted headroom is allowed.
    contract.execute_transfer(
        a,
        U128(600_000_000_000_000_000_000_000),
        account("x.testnet"),
        "headroom".into(),
    );
    let view = contract.get_capability(a).unwrap();
    assert_eq!(view.total_spent, "600000000000000000000000");
    assert_eq!(view.remaining, "0");
}

#[test]
fn multilevel_delegation_conserves_authority() {
    testing_env!(ctx_with_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    let a = grant(&mut contract, "a.testnet", ONE_NEAR, ONE_NEAR, None);

    testing_env!(ctx("a.testnet", 1_100));
    let b = delegate(
        &mut contract,
        a,
        "b.testnet",
        400_000_000_000_000_000_000_000,
        400_000_000_000_000_000_000_000,
    );
    let c = delegate(
        &mut contract,
        a,
        "c.testnet",
        200_000_000_000_000_000_000_000,
        200_000_000_000_000_000_000_000,
    );
    assert_eq!(
        contract.get_capability(a).unwrap().remaining,
        "400000000000000000000000"
    );

    // B reserves 0.15 for D, leaving itself 0.25 of spendable headroom.
    testing_env!(ctx("b.testnet", 1_200));
    let d = delegate(
        &mut contract,
        b,
        "d.testnet",
        150_000_000_000_000_000_000_000,
        150_000_000_000_000_000_000_000,
    );
    assert_eq!(
        contract.get_capability(b).unwrap().remaining,
        "250000000000000000000000"
    );

    // B cannot spend 0.26: 0.15 of its authority is promised to D.
    expect_panic(
        || {
            contract.execute_transfer(
                b,
                U128(260_000_000_000_000_000_000_000),
                account("x.testnet"),
                "b-over".into(),
            );
        },
        "BUDGET_RESERVATION",
    );

    // Every legitimate spend fits exactly inside its own headroom.
    testing_env!(ctx("a.testnet", 1_300));
    contract.execute_transfer(
        a,
        U128(400_000_000_000_000_000_000_000),
        account("x.testnet"),
        "a-ok".into(),
    );
    testing_env!(ctx("b.testnet", 1_400));
    contract.execute_transfer(
        b,
        U128(250_000_000_000_000_000_000_000),
        account("x.testnet"),
        "b-ok".into(),
    );
    testing_env!(ctx("c.testnet", 1_500));
    contract.execute_transfer(
        c,
        U128(200_000_000_000_000_000_000_000),
        account("x.testnet"),
        "c-ok".into(),
    );
    testing_env!(ctx("d.testnet", 1_600));
    contract.execute_transfer(
        d,
        U128(150_000_000_000_000_000_000_000),
        account("x.testnet"),
        "d-ok".into(),
    );

    // 0.40 + 0.25 + 0.20 + 0.15 = exactly 1.00 NEAR of authority consumed.
    let spent = |id: u64| -> u128 {
        contract
            .get_capability(id)
            .unwrap()
            .total_spent
            .parse()
            .unwrap()
    };
    assert_eq!(spent(a) + spent(b) + spent(c) + spent(d), ONE_NEAR);

    // A's headroom is zero: 0.40 spent plus 0.60 allocated to B and C.
    let a_view = contract.get_capability(a).unwrap();
    assert_eq!(a_view.total_allocated, "600000000000000000000000");
    assert_eq!(a_view.remaining, "0");
}

// ---------------------------------------------------------------------------
// Claim: depth is bounded at creation, not only when walking a lineage. A
// capability that the contract accepts must always be usable on depth alone.
// ---------------------------------------------------------------------------

#[test]
fn depth_limit_is_enforced_at_delegation() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let mut parent = grant(&mut contract, "agent0.testnet", 1_000, 1_000, None);

    // Build the deepest valid chain: depths 0..=63 (64 levels, 63 delegations).
    for level in 1..=63u32 {
        let signer = format!("agent{}.testnet", level - 1);
        testing_env!(ctx(&signer, 1_000 + level as u64));
        parent = delegate(
            &mut contract,
            parent,
            &format!("agent{}.testnet", level),
            1_000,
            1_000,
        );
    }
    assert!(
        contract.is_usable(parent),
        "deepest valid capability must be usable"
    );

    // The first invalid delegation is rejected at creation time.
    testing_env!(ctx("agent63.testnet", 2_000));
    expect_panic(
        || {
            delegate(&mut contract, parent, "agent64.testnet", 1_000, 1_000);
        },
        "DEPTH",
    );
}

// ---------------------------------------------------------------------------
// Stateful property test: drive random grant/delegate/spend/fail/revoke
// sequences across multi-level trees and re-check the conservation invariants
// after every operation.
// ---------------------------------------------------------------------------

struct TreeNode {
    id: u64,
    agent: usize,
    parent: Option<usize>,
    max_total: u128,
    max_per: u128,
    can_delegate: bool,
}

fn check_tree_invariants(contract: &Contract, nodes: &[TreeNode], roots: &[u64]) {
    for (index, node) in nodes.iter().enumerate() {
        let view = contract
            .get_capability(node.id)
            .expect("capability vanished");
        let spent: u128 = view.total_spent.parse().unwrap();
        let allocated: u128 = view.total_allocated.parse().unwrap();

        // Defining invariant: no node can spend or promise more than it holds.
        assert!(
            spent + allocated <= node.max_total,
            "node {} spent {} + allocated {} exceeds max_total {}",
            node.id,
            spent,
            allocated,
            node.max_total
        );

        // A node's allocation is exactly the sum of its children's authority.
        let child_sum: u128 = nodes
            .iter()
            .filter(|candidate| candidate.parent == Some(index))
            .map(|candidate| candidate.max_total)
            .sum();
        assert_eq!(
            allocated, child_sum,
            "node {} allocation drifted from its children",
            node.id
        );

        match node.parent {
            Some(parent_index) => {
                let parent_view = contract.get_capability(nodes[parent_index].id).unwrap();
                assert_eq!(view.root_id, parent_view.root_id, "root id not inherited");
                assert!(
                    node.max_total <= nodes[parent_index].max_total,
                    "attenuation broken on max_total"
                );
                assert!(
                    node.max_per <= nodes[parent_index].max_per,
                    "attenuation broken on max_per_action"
                );
            }
            None => assert_eq!(view.root_id, node.id),
        }
    }

    // Vault conservation: committed authority is exactly the unspent buckets
    // plus the in-flight buckets, across every root ever issued.
    let mut outstanding = 0u128;
    let mut pending = 0u128;
    let mut live = 0u64;
    for root in roots {
        if let Some(value) = contract.root_outstanding.get(root) {
            outstanding += *value;
            live += 1;
        }
        pending += contract.root_pending.get(root).copied().unwrap_or(0);
    }
    assert_eq!(
        contract.vault_committed,
        outstanding + pending,
        "vault committed not conserved"
    );
    assert_eq!(
        contract.live_root_count, live,
        "live root count drifted from outstanding buckets"
    );
}

#[test]
fn randomized_delegation_tree_conserves_authority() {
    let agents = [
        "a.testnet",
        "b.testnet",
        "c.testnet",
        "d.testnet",
        "e.testnet",
        "f.testnet",
        "g.testnet",
        "h.testnet",
    ];
    let mut seed: u64 = 0x5eed_2026_11ac;
    let mut rng = || {
        seed = seed
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        seed >> 33
    };

    for case in 0..40u64 {
        testing_env!(ctx_prop("owner.testnet", 1_000));
        let mut contract = Contract::new();

        let root_total = 5_000 + (rng() % 5_000) as u128;
        let root_per = 1 + (rng() % root_total as u64) as u128;
        let root_id = grant(&mut contract, agents[0], root_total, root_per, None);

        let mut nodes = vec![TreeNode {
            id: root_id,
            agent: 0,
            parent: None,
            max_total: root_total,
            max_per: root_per,
            can_delegate: true,
        }];
        let roots = vec![root_id];
        let mut requests = 0u64;
        let mut timestamp = 1_000u64;

        for _ in 0..30 {
            timestamp += 1;
            match rng() % 3 {
                0 => {
                    let parent_index = (rng() as usize) % nodes.len();
                    let (parent_id, parent_agent, parent_total, parent_per, parent_can) = {
                        let parent = &nodes[parent_index];
                        (
                            parent.id,
                            parent.agent,
                            parent.max_total,
                            parent.max_per,
                            parent.can_delegate,
                        )
                    };
                    if !parent_can {
                        continue;
                    }

                    let view = contract.get_capability(parent_id).unwrap();
                    let spent: u128 = view.total_spent.parse().unwrap();
                    let allocated: u128 = view.total_allocated.parse().unwrap();
                    let headroom = parent_total - spent - allocated;

                    let child_agent = (rng() as usize) % agents.len();
                    let child_total = if headroom > 0 && rng() % 4 != 0 {
                        1 + (rng() % headroom as u64) as u128
                    } else {
                        1 + (rng() % parent_total as u64) as u128
                    };
                    let child_per = 1 + (rng() % child_total as u64) as u128;
                    let child_can = rng() % 2 == 0;

                    testing_env!(ctx_prop(agents[parent_agent], timestamp));
                    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        contract.delegate(
                            parent_id,
                            account(agents[child_agent]),
                            U128(child_total),
                            U128(child_per),
                            vec!["transfer".to_string()],
                            vec!["NEAR".to_string()],
                            vec![],
                            None,
                            child_can,
                            None,
                        )
                    }));
                    if let Ok(child_id) = outcome {
                        assert!(child_total <= parent_total);
                        assert!(child_per <= parent_per);
                        nodes.push(TreeNode {
                            id: child_id,
                            agent: child_agent,
                            parent: Some(parent_index),
                            max_total: child_total,
                            max_per: child_per,
                            can_delegate: child_can,
                        });
                        let after: u128 = contract
                            .get_capability(parent_id)
                            .unwrap()
                            .total_allocated
                            .parse()
                            .unwrap();
                        assert_eq!(after, allocated + child_total);
                    }
                }
                1 => {
                    let node_index = (rng() as usize) % nodes.len();
                    let (node_id, node_agent, node_per) = {
                        let node = &nodes[node_index];
                        (node.id, node.agent, node.max_per)
                    };
                    let amount = if rng() % 5 == 0 {
                        node_per + 1 + (rng() % 10) as u128
                    } else {
                        1 + (rng() % node_per as u64) as u128
                    };
                    let spent_before: u128 = contract
                        .get_capability(node_id)
                        .unwrap()
                        .total_spent
                        .parse()
                        .unwrap();
                    requests += 1;
                    let request = format!("case{}-req{}", case, requests);

                    testing_env!(ctx_prop(agents[node_agent], timestamp));
                    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        contract.execute_transfer(
                            node_id,
                            U128(amount),
                            account("recipient.testnet"),
                            request,
                        )
                    }));
                    if outcome.is_ok() {
                        let execution_id = contract.next_execution_id - 1;
                        let spent_after: u128 = contract
                            .get_capability(node_id)
                            .unwrap()
                            .total_spent
                            .parse()
                            .unwrap();
                        assert_eq!(spent_after, spent_before + amount);

                        // Fail the transfer: funds never leave, authority must
                        // return to exactly the pre-spend state, once.
                        testing_env_with_promise_results(
                            ctx_prop(CONTRACT, timestamp),
                            PromiseResult::Failed,
                        );
                        contract.on_transfer(node_id, execution_id, U128(amount));
                        let spent_refunded: u128 = contract
                            .get_capability(node_id)
                            .unwrap()
                            .total_spent
                            .parse()
                            .unwrap();
                        assert_eq!(spent_refunded, spent_before);
                    }
                }
                _ => {
                    let node_index = (rng() as usize) % nodes.len();
                    let node_id = nodes[node_index].id;
                    testing_env!(ctx_prop("owner.testnet", timestamp));
                    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        contract.revoke(node_id, "random revoke".to_string())
                    }));
                    if outcome.is_ok() {
                        assert!(!contract.is_usable(node_id));
                        for descendant in &nodes {
                            let mut cursor = Some(descendant.id);
                            while let Some(id) = cursor {
                                if id == node_id {
                                    assert!(
                                        !contract.is_usable(descendant.id),
                                        "descendant {} survived ancestor revocation",
                                        descendant.id
                                    );
                                    break;
                                }
                                cursor = contract.get_capability(id).unwrap().parent_id;
                            }
                        }
                    }
                }
            }
            check_tree_invariants(&contract, &nodes, &roots);
        }
    }
}
