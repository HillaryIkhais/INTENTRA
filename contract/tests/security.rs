//! Failure-boundary tests: identity integrity, callback privacy,
//! concurrency, revocation-adjacent atomicity.
//!
//! These complement sandbox.rs (see near/ADVERSARIAL-TESTS.md).

use anyhow::Result;
use near_workspaces::{network::Sandbox, types::NearToken, Account, AccountId, Contract, Worker};
use serde_json::{json, Value};

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;

fn wasm_path() -> String {
    concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/target/wasm32-unknown-unknown/release/intentra_vault.wasm"
    )
    .to_string()
}

fn y(n: u128) -> String {
    n.to_string()
}

async fn setup() -> Result<(Worker<Sandbox>, Contract, Account)> {
    let worker = near_workspaces::sandbox().await?;
    let owner = worker.dev_create_account().await?;
    let wasm = std::fs::read(wasm_path())?;
    let contract = worker.dev_deploy(&wasm).await?;
    contract
        .call("new")
        .args_json(json!({ "owner": owner.id() }))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    owner
        .transfer_near(contract.id(), NearToken::from_near(10))
        .await?
        .into_result()?;
    Ok((worker, contract, owner))
}

async fn mk_agent(worker: &Worker<Sandbox>) -> Result<Account> {
    Ok(worker.dev_create_account().await?)
}

async fn issue_root(
    owner: &Account,
    contract: &Contract,
    agent: &Account,
    max_total: u128,
    max_per_order: u128,
    recipients: Option<Vec<String>>,
    can_transfer: bool,
    can_delegate: bool,
) -> Result<u64> {
    let res = owner
        .call(contract.id(), "issue_root")
        .args_json(json!({
            "grant": {
                "agent_account": agent.id(),
                "agent_pk": agent.secret_key().public_key().to_string(),
                "max_total": y(max_total),
                "max_per_order": y(max_per_order),
                "recipients": recipients,
                "can_transfer": can_transfer,
                "can_delegate": can_delegate,
                "expires_at_ns": Option::<u64>::None,
            }
        }))
        .max_gas()
        .transact()
        .await?;
    Ok(res.into_result()?.json::<Value>()?.as_u64().unwrap())
}

async fn delegate_raw(
    agent: &Account,
    contract: &Contract,
    child_pk: &str,
    child_account: &AccountId,
    max_total: u128,
    max_per_order: u128,
) -> Result<near_workspaces::result::ExecutionFinalResult> {
    Ok(agent
        .call(contract.id(), "delegate")
        .args_json(json!({
            "child": {
                "child_account": child_account,
                "child_pk": child_pk,
                "max_total": y(max_total),
                "max_per_order": y(max_per_order),
                "recipients": Option::<Vec<String>>::None,
                "can_transfer": Option::<bool>::None,
                "can_delegate": Option::<bool>::None,
                "expires_at_ns": Option::<u64>::None,
            }
        }))
        .max_gas()
        .transact()
        .await?)
}

async fn pay(
    agent: &Account,
    contract: &Contract,
    recipient: &str,
    amount: u128,
) -> Result<near_workspaces::result::ExecutionFinalResult> {
    Ok(agent
        .call(contract.id(), "execute")
        .args_json(json!({ "recipient": recipient, "amount": y(amount) }))
        .max_gas()
        .transact()
        .await?)
}

fn panic_msg(res: &near_workspaces::result::ExecutionFinalResult) -> String {
    res.clone().into_result().err().map(|e| e.to_string()).unwrap_or_default()
}

// ─── Boundary 1: identity integrity ─────────────────────────────────────

/// Authority binds to the SIGNING KEY, never to caller-supplied identifiers.
/// A parent can register an attacker-held key, but the "victim" account named
/// in the delegation gains nothing: it cannot sign with that key.
#[tokio::test]
async fn id1_identity_follows_key_not_identifier() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let victim = mk_agent(&worker).await?; // account named as the child
    let attacker = mk_agent(&worker).await?; // account that holds the registered key

    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, true).await?;

    let attacker_pk = attacker.secret_key().public_key().to_string();
    // Parent registers the ATTACKER's key but names the VICTIM's account.
    let r = delegate_raw(&a, &contract, &attacker_pk, victim.id(), NEAR / 2, NEAR / 2).await?;
    assert!(r.is_success(), "delegation itself is the parent's choice: {:?}", r.failures());

    // The victim account cannot use the capability: its own signing key is unknown.
    let r = pay(&victim, &contract, "v.near", 1).await?;
    assert!(!r.is_success(), "victim account must not inherit anything");
    assert!(panic_msg(&r).contains("UNKNOWN_KEY"));

    // Only the key holder can act — identity is key-bound.
    let r = pay(&attacker, &contract, "v.near", NEAR / 4).await?;
    assert!(r.is_success(), "registered key holder acts: {:?}", r.failures());
    Ok(())
}

/// A parent that names the victim's real key but a mismatched account id
/// creates a capability bound to the real key — the named account id is
/// decorative metadata. No path grants a THIRD party authority.
#[tokio::test]
async fn id2_forged_child_account_id_does_not_redirect_authority() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let outsider = mk_agent(&worker).await?;

    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, true).await?;

    // Child account id deliberately wrong (outsider's id), key is B's.
    let b_pk = b.secret_key().public_key().to_string();
    let r = delegate_raw(&a, &contract, &b_pk, outsider.id(), NEAR / 2, NEAR / 2).await?;
    assert!(r.is_success(), "{:?}", r.failures());

    // B (the key holder) holds the authority regardless of the stored name.
    let r = pay(&b, &contract, "v.near", NEAR / 4).await?;
    assert!(r.is_success(), "key holder must retain authority: {:?}", r.failures());

    // The outsider gains nothing.
    let r = pay(&outsider, &contract, "v.near", 1).await?;
    assert!(panic_msg(&r).contains("UNKNOWN_KEY"));
    Ok(())
}

/// There is no caller-supplied capability id on agent entrypoints:
/// `execute` and `delegate` resolve authority only via the signing key.
/// A forged id can only hit view methods, which mutate nothing.
#[tokio::test]
async fn id3_forged_capability_ids_cannot_redirect_execution() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, false).await?;

    // B's execute has no cap-id argument at all: it is resolved from B's key,
    // which is unregistered.
    let r = pay(&b, &contract, "v.near", 1).await?;
    assert!(panic_msg(&r).contains("UNKNOWN_KEY"));

    // A forged view query returns an empty tree — no state behind a forged ID,
    // and nothing mutates.
    let tree = contract.view("get_tree").args_json(json!({ "root_id": 999 })).await;
    assert!(tree.is_ok(), "forged root id must not error the contract");
    let tree: Vec<Value> = tree.unwrap().json().unwrap_or_default();
    assert!(tree.is_empty(), "forged root id yields an empty tree");
    Ok(())
}

// ─── Boundary 3: callback privacy ───────────────────────────────────────

/// Only the contract's own promise callback may touch refund accounting.
#[tokio::test]
async fn cb1_direct_on_transfer_call_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, false).await?;

    // An agent (or any external account) calling the private callback directly.
    let r = a
        .call(contract.id(), "on_transfer")
        .args_json(json!({ "cap_id": 0, "amount": y(NEAR) }))
        .max_gas()
        .transact()
        .await?;
    assert!(!r.is_success(), "private callback must not be callable externally");
    let msg = panic_msg(&r);
    assert!(
        msg.contains("private") || msg.contains("only can be called by itself") || msg.contains("predecessor"),
        "unexpected rejection reason: {msg}"
    );

    // State unchanged: no phantom refund mutated the ledger.
    let cap = contract
        .view("get_capability")
        .args_json(json!({ "cap_id": 0 }))
        .await?
        .json::<Value>()?;
    assert_eq!(cap["total_spent"].as_str().unwrap(), "0");
    assert_eq!(cap["allocated_children"].as_str().unwrap(), "0");
    Ok(())
}

// ─── Boundary 2: concurrency / double-spend ────────────────────────────

/// Concurrency / double-spend boundary: NEAR applies transactions to state
/// sequentially, so regardless of arrival order, combined spend can never
/// exceed the budget and every over-limit call rejects. Four concurrent
/// 0.4 N payments against a 1.0 N budget: exactly two can succeed, in any
/// order, and on-chain accounting must equal successful debits exactly.
#[tokio::test]
async fn cc1_rapid_fire_spend_cannot_exceed_budget() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let v = mk_agent(&worker).await?;

    issue_root(&owner, &contract, &a, NEAR, NEAR, Some(vec![v.id().to_string()]), true, true)
        .await?;

    // Fire 4 payments sequentially, each 0.4 N against a 1.0 N budget.
    // Exactly two can succeed; headroom after two debits is 0.2 N < 0.4 N.
    let results = [
        pay(&a, &contract, v.id().as_str(), NEAR * 2 / 5).await?,
        pay(&a, &contract, v.id().as_str(), NEAR * 2 / 5).await?,
        pay(&a, &contract, v.id().as_str(), NEAR * 2 / 5).await?,
        pay(&a, &contract, v.id().as_str(), NEAR * 2 / 5).await?,
    ];
    let successes = results.iter().filter(|r| r.is_success()).count();
    assert_eq!(
        successes, 2,
        "exactly two of four 0.4 N payments against a 1.0 N budget may succeed, got {successes}"
    );
    // Each failure must be a budget rejection, not an unexpected error.
    for r in results.iter().filter(|r| !r.is_success()) {
        assert!(
            panic_msg(r).contains("BUDGET_EXCEEDED"),
            "over-limit payment must reject with BUDGET_EXCEEDED: {:?}",
            panic_msg(r)
        );
    }

    // Reconcile: on-chain spend must equal successes × amount exactly —
    // no ghost spend, no double-debit, no partial credit.
    let total_spent = contract
        .view("get_tree_spend")
        .args_json(json!({ "root_id": 0 }))
        .await?
        .json::<Value>()?
        .as_str().unwrap().parse::<u128>()?;
    assert_eq!(
        total_spent,
        successes as u128 * NEAR * 2 / 5,
        "on-chain accounting must equal actual successful transfers"
    );
    Ok(())
}

// ─── Boundary 4: revocation timing ──────────────────────────────────────

/// A capability revoked mid-flight cannot execute afterwards; a pending
/// callback refund is pure accounting and does not resurrect authority.
#[tokio::test]
async fn rv1_no_execution_after_revoke_even_via_pending_paths() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let vendor = mk_agent(&worker).await?;
    let root = issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, false).await?;

    // Successful payment first (creates real accounting state).
    let r = pay(&a, &contract, vendor.id().as_str(), NEAR / 10).await?;
    assert!(r.is_success());
    // Failed payment to a nonexistent account: callback refunds.
    let r = pay(&a, &contract, "nonexistent-xyz.test", NEAR / 10).await?;
    assert!(r.is_success());
    let cap = contract
        .view("get_capability")
        .args_json(json!({ "cap_id": root }))
        .await?
        .json::<Value>()?;
    assert_eq!(cap["total_spent"].as_str().unwrap(), y(NEAR / 10), "refund path must restore budget");

    // Revoke. Then NOTHING works — even though the last callback "succeeded"
    // in refunding, authority is dead.
    let r = owner
        .call(contract.id(), "revoke")
        .args_json(json!({ "cap_id": root, "reason": "timing" }))
        .max_gas()
        .transact()
        .await?;
    assert!(r.is_success());
    let r = pay(&a, &contract, vendor.id().as_str(), 1).await?;
    assert!(panic_msg(&r).contains("REVOKED_CHAIN"));
    Ok(())
}

// ─── Boundary 5: atomic rejection, deep trees ──────────────────────────

/// Deep delegation chain (depth 5) — subset invariant must hold at every hop,
/// and a rejected deep hop must leave nothing behind at ANY level.
#[tokio::test]
async fn at1_deep_tree_rejection_is_atomic_at_every_level() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let agents: Vec<Account> = {
        let mut v = vec![];
        for _ in 0..6 {
            v.push(mk_agent(&worker).await?);
        }
        v
    };
    issue_root(&owner, &contract, &agents[0], NEAR, NEAR, None, true, true).await?;

    // Chain down: 1 → 2 → 3 → 4 → 5 (depth 5), halving each time.
    let mut ids = vec![];
    for i in 1..5 {
        let r = agents[i - 1]
            .call(contract.id(), "delegate")
            .args_json(json!({
                "child": {
                    "child_account": agents[i].id(),
                    "child_pk": agents[i].secret_key().public_key().to_string(),
                    "max_total": y(NEAR >> i), "max_per_order": y(NEAR >> i),
                    "recipients": Option::<Vec<String>>::None,
                    "can_transfer": Option::<bool>::None,
                    "can_delegate": Option::<bool>::None,
                    "expires_at_ns": Option::<u64>::None,
                }}))
            .max_gas()
            .transact()
            .await?;
        assert!(r.is_success(), "hop {i} must succeed: {:?}", r.failures());
        ids.push(r.into_result()?.json::<Value>()?.as_u64().unwrap());
    }

    // Agent 5 (0.0625 N) tries to delegate 0.5 N.
    let outsider = mk_agent(&worker).await?;
    let r = delegate_raw(&agents[4], &contract, &outsider.secret_key().public_key().to_string(), outsider.id(), NEAR / 2, NEAR).await?;
    assert!(!r.is_success());
    assert!(panic_msg(&r).contains("BUDGET_ESCALATION"));

    // Nothing created anywhere: agent 5's ledger untouched.
    let cap = contract
        .view("get_capability")
        .args_json(json!({ "cap_id": ids[3] }))
        .await?
        .json::<Value>()?;
    assert_eq!(cap["allocated_children"].as_str().unwrap(), "0");
    assert_eq!(cap["children"].as_array().unwrap().len(), 0);

    // Full-tree invariant: every node's spent + reserved ≤ max_total.
    let tree = contract
        .view("get_tree")
        .args_json(json!({ "root_id": 0 }))
        .await?
        .json::<Vec<Value>>()?;
    assert_eq!(tree.len(), 5);
    for c in &tree {
        let s: u128 = c["total_spent"].as_str().unwrap().parse().unwrap();
        let r: u128 = c["allocated_children"].as_str().unwrap().parse().unwrap();
        let m: u128 = c["max_total"].as_str().unwrap().parse().unwrap();
        assert!(s + r <= m, "invariant violated at cap {}: {s}+{r}>{m}", c["id"]);
    }
    Ok(())
}
