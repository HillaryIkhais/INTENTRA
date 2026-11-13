//! INTENTRA settlement / sandbox-style tests.
//!
//! These tests drive the asynchronous settlement path (reserve → callback)
//! through the near-sdk unit-testing environment, including failed transfers,
//! replayed callbacks, unauthorized callbacks, and how vault accounting
//! behaves across root revocation while a transfer is in flight.
//!
//! Balance-sensitive tests pin the account balance/storage on *every*
//! `testing_env!` step, because the environment resets on each call.

use intentra_near::Contract;
use near_sdk::json_types::U128;
use near_sdk::test_utils::{testing_env_with_promise_results, VMContextBuilder};
use near_sdk::{testing_env, AccountId, NearToken, PromiseResult, VMContext};

const CONTRACT: &str = "intentra.testnet";
const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;

fn account(id: &str) -> AccountId {
    id.parse().unwrap()
}

fn ctx(predecessor: &str, timestamp: u64) -> VMContext {
    VMContextBuilder::new()
        .predecessor_account_id(account(predecessor))
        .current_account_id(account(CONTRACT))
        .block_timestamp(timestamp)
        .build()
}

fn ctx_balance(predecessor: &str, timestamp: u64, balance_yocto: u128) -> VMContext {
    VMContextBuilder::new()
        .predecessor_account_id(account(predecessor))
        .current_account_id(account(CONTRACT))
        .block_timestamp(timestamp)
        .account_balance(NearToken::from_yoctonear(balance_yocto))
        .storage_usage(0)
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

fn grant(contract: &mut Contract, agent: &str, max_total: u128, max_per: u128) -> u64 {
    contract.grant_root(
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

/// Settle an execution under an explicit environment context.
fn settle_with(
    contract: &mut Contract,
    context: VMContext,
    capability_id: u64,
    execution_id: u64,
    amount: u128,
    success: bool,
) {
    if success {
        testing_env_with_promise_results(context, PromiseResult::Successful(vec![]));
    } else {
        testing_env_with_promise_results(context, PromiseResult::Failed);
    }
    contract.on_transfer(capability_id, execution_id, U128(amount));
}

fn settle(
    contract: &mut Contract,
    capability_id: u64,
    execution_id: u64,
    amount: u128,
    success: bool,
    timestamp: u64,
) {
    settle_with(
        contract,
        ctx(CONTRACT, timestamp),
        capability_id,
        execution_id,
        amount,
        success,
    );
}

// ---------------------------------------------------------------------------
// Callback authorization and integrity
// ---------------------------------------------------------------------------

#[test]
fn unauthorized_account_cannot_settle() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400);
    testing_env!(ctx("a.testnet", 1_100));
    contract.execute_transfer(root, U128(50), account("x.testnet"), "req".into());

    testing_env!(ctx("attacker.testnet", 1_200));
    expect_panic(
        || contract.on_transfer(root, 1, U128(50)),
        "on_transfer is private",
    );
}

#[test]
fn callback_with_mismatched_amount_is_rejected() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400);
    testing_env!(ctx("a.testnet", 1_100));
    contract.execute_transfer(root, U128(50), account("x.testnet"), "req".into());

    let context = ctx(CONTRACT, 1_200);
    testing_env_with_promise_results(context, PromiseResult::Successful(vec![]));
    expect_panic(
        || contract.on_transfer(root, 1, U128(51)),
        "does not match execution",
    );
    // state untouched: still pending, reservation still held
    assert_eq!(contract.get_execution(1).unwrap().status, "PENDING");
    assert_eq!(contract.get_capability(root).unwrap().total_spent, "50");
}

// ---------------------------------------------------------------------------
// Failed transfers and retry semantics
// ---------------------------------------------------------------------------

#[test]
fn failed_callback_restores_budget_and_frees_request_id() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400);
    let vault_before = contract.get_vault();

    testing_env!(ctx("a.testnet", 1_100));
    contract.execute_transfer(root, U128(50), account("x.testnet"), "retry-me".into());
    assert_eq!(contract.get_capability(root).unwrap().total_spent, "50");

    settle(&mut contract, root, 1, 50, false, 1_200);
    let after_fail = contract.get_capability(root).unwrap();
    assert_eq!(after_fail.total_spent, "0");
    assert_eq!(contract.get_execution(1).unwrap().status, "FAILED");
    // vault authority restored to its pre-transfer value
    assert_eq!(contract.get_vault(), vault_before);

    // the request id was released: the agent can retry
    testing_env!(ctx("a.testnet", 1_300));
    contract.execute_transfer(root, U128(50), account("x.testnet"), "retry-me".into());
    assert_eq!(contract.get_capability(root).unwrap().total_spent, "50");

    settle(&mut contract, root, 2, 50, true, 1_400);
    assert_eq!(contract.get_execution(2).unwrap().status, "COMPLETED");
    // only one settlement consumed vault authority
    let expected_committed = vault_before.committed.parse::<u128>().unwrap() - 50;
    assert_eq!(
        contract.get_vault().committed,
        expected_committed.to_string()
    );
}

#[test]
fn double_failure_does_not_double_refund() {
    testing_env!(ctx("owner.testnet", 1_000));
    let mut contract = Contract::new();
    let root = grant(&mut contract, "a.testnet", 1_000, 400);
    testing_env!(ctx("a.testnet", 1_100));
    contract.execute_transfer(root, U128(50), account("x.testnet"), "req".into());

    settle(&mut contract, root, 1, 50, false, 1_200);
    let committed_after_first = contract.get_vault().committed;

    // second callback for the same execution must be rejected, and must not
    // refund a second time
    let context = ctx(CONTRACT, 1_300);
    testing_env_with_promise_results(context, PromiseResult::Failed);
    expect_panic(|| contract.on_transfer(root, 1, U128(50)), "REPLAY");
    assert_eq!(contract.get_capability(root).unwrap().total_spent, "0");
    assert_eq!(contract.get_vault().committed, committed_after_first);
}

// ---------------------------------------------------------------------------
// Vault accounting across settlement and revocation
// ---------------------------------------------------------------------------

#[test]
fn successful_settlement_consumes_vault_authority() {
    testing_env!(ctx_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    grant(
        &mut contract,
        "a.testnet",
        600_000_000_000_000_000_000_000,
        600_000_000_000_000_000_000_000,
    );

    // in-flight transfer keeps the full reservation (committed unchanged)
    testing_env!(ctx_balance("a.testnet", 1_100, ONE_NEAR));
    contract.execute_transfer(
        1,
        U128(100_000_000_000_000_000_000_000),
        account("x.testnet"),
        "s".into(),
    );
    assert_eq!(
        contract.get_vault().committed,
        "600000000000000000000000",
        "in-flight transfer must stay reserved"
    );

    // The mocked runtime does not execute Promise::transfer, so the test
    // models the chain-side fund movement: by callback time the 0.1 NEAR
    // has already left the contract account.
    settle_with(
        &mut contract,
        ctx_balance(CONTRACT, 1_200, ONE_NEAR - 100_000_000_000_000_000_000_000),
        1,
        1,
        100_000_000_000_000_000_000_000,
        true,
    );
    assert_eq!(
        contract.get_vault().committed,
        "500000000000000000000000",
        "settled transfer must consume authority"
    );
    let vault = contract.get_vault();
    assert_eq!(vault.liquid, "900000000000000000000000");
    assert_eq!(vault.available, "400000000000000000000000");
}

#[test]
fn revocation_releases_only_unspent_authority() {
    // Vault holds exactly 1 NEAR. Root gets 0.6, spends 0.3.
    testing_env!(ctx_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    let root = grant(
        &mut contract,
        "a.testnet",
        600_000_000_000_000_000_000_000,
        600_000_000_000_000_000_000_000,
    );

    testing_env!(ctx_balance("a.testnet", 1_100, ONE_NEAR));
    contract.execute_transfer(
        root,
        U128(300_000_000_000_000_000_000_000),
        account("x.testnet"),
        "s".into(),
    );
    // mocked runtime: the 0.3 NEAR left the account when the transfer
    // promise executed — model that balance at callback time
    let after_transfer = ONE_NEAR - 300_000_000_000_000_000_000_000;
    settle_with(
        &mut contract,
        ctx_balance(CONTRACT, 1_200, after_transfer),
        root,
        1,
        300_000_000_000_000_000_000_000,
        true,
    );
    assert_eq!(contract.get_vault().committed, "300000000000000000000000");

    // revoke the root: only the unspent 0.3 is released, the spent 0.3
    // stays consumed
    testing_env!(ctx_balance("owner.testnet", 1_300, after_transfer));
    contract.revoke(root, "stop".into());
    let vault = contract.get_vault();
    assert_eq!(vault.committed, "0");
    assert_eq!(vault.liquid, "700000000000000000000000");
    assert_eq!(vault.available, "700000000000000000000000");

    // 0.701 NEAR is not available: the spent 0.3 must not come back
    expect_panic(
        || {
            grant(
                &mut contract,
                "d.testnet",
                701_000_000_000_000_000_000_000,
                1,
            );
        },
        "VAULT",
    );
    // exactly the unspent remainder is available
    grant(
        &mut contract,
        "d.testnet",
        700_000_000_000_000_000_000_000,
        700_000_000_000_000_000_000_000,
    );
}

#[test]
fn revocation_during_inflight_transfer_settles_safely() {
    testing_env!(ctx_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    let root = grant(
        &mut contract,
        "a.testnet",
        600_000_000_000_000_000_000_000,
        600_000_000_000_000_000_000_000,
    );
    testing_env!(ctx_balance("a.testnet", 1_100, ONE_NEAR));
    contract.execute_transfer(
        root,
        U128(100_000_000_000_000_000_000_000),
        account("x.testnet"),
        "inflight".into(),
    );

    // mocked runtime: the in-flight transfer already left the account
    let after_transfer = ONE_NEAR - 100_000_000_000_000_000_000_000;

    // revoke while in flight: released = outstanding (0.5), pending (0.1)
    // stays reserved
    testing_env!(ctx_balance("owner.testnet", 1_200, after_transfer));
    contract.revoke(root, "stop".into());
    assert_eq!(contract.get_vault().committed, "100000000000000000000000");

    // transfer succeeds: money leaves, pending bucket consumed
    settle_with(
        &mut contract,
        ctx_balance(CONTRACT, 1_300, after_transfer),
        root,
        1,
        100_000_000_000_000_000_000_000,
        true,
    );
    let vault = contract.get_vault();
    assert_eq!(vault.committed, "0");
    assert_eq!(vault.liquid, "900000000000000000000000");

    // descendants of the revoked root are dead
    testing_env!(ctx_balance("a.testnet", 1_400, ONE_NEAR));
    expect_panic(
        || {
            contract.execute_transfer(root, U128(1), account("x.testnet"), "after".into());
        },
        "REVOKED",
    );
}

#[test]
fn failed_inflight_after_revocation_returns_funds_to_free_pool() {
    testing_env!(ctx_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    let root = grant(
        &mut contract,
        "a.testnet",
        600_000_000_000_000_000_000_000,
        600_000_000_000_000_000_000_000,
    );
    testing_env!(ctx_balance("a.testnet", 1_100, ONE_NEAR));
    contract.execute_transfer(
        root,
        U128(100_000_000_000_000_000_000_000),
        account("x.testnet"),
        "inflight".into(),
    );
    testing_env!(ctx_balance("owner.testnet", 1_200, ONE_NEAR));
    contract.revoke(root, "stop".into());
    assert_eq!(contract.get_vault().committed, "100000000000000000000000");

    // transfer fails: money never left; the root is dead, so the funds
    // return to the free pool — not to any capability
    settle_with(
        &mut contract,
        ctx_balance(CONTRACT, 1_300, ONE_NEAR),
        root,
        1,
        100_000_000_000_000_000_000_000,
        false,
    );
    let vault = contract.get_vault();
    assert_eq!(vault.committed, "0");
    assert_eq!(vault.liquid, "1000000000000000000000000");
    assert_eq!(vault.available, "1000000000000000000000000");
    assert_eq!(contract.get_execution(1).unwrap().status, "FAILED");
}

#[test]
fn expired_root_reservation_is_released_on_next_grant() {
    testing_env!(ctx_balance("owner.testnet", 1_000, ONE_NEAR));
    let mut contract = Contract::new();
    contract.grant_root(
        account("a.testnet"),
        U128(800_000_000_000_000_000_000_000),
        U128(100),
        vec!["transfer".to_string()],
        vec!["NEAR".to_string()],
        vec![],
        None,
        true,
        Some(2_000),
    );
    assert_eq!(contract.get_vault().committed, "800000000000000000000000");

    // only 0.2 NEAR is available: a 0.3 NEAR root must be rejected
    expect_panic(
        || {
            grant(
                &mut contract,
                "d.testnet",
                300_000_000_000_000_000_000_000,
                1,
            );
        },
        "VAULT",
    );

    // after expiry the reservation is swept on the next grant
    testing_env!(ctx_balance("owner.testnet", 3_000, ONE_NEAR));
    grant(
        &mut contract,
        "d.testnet",
        900_000_000_000_000_000_000_000,
        900_000_000_000_000_000_000_000,
    );
    let vault = contract.get_vault();
    assert_eq!(vault.committed, "900000000000000000000000");
    assert_eq!(vault.live_roots, 1);

    // the expired root's capability is still unusable
    assert!(!contract.is_usable(1));
}
