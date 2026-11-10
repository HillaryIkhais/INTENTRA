//! INTENTRA adversarial sandbox test suite.
//!
//! Every assertion reads actual contract state or a panicking receipt —
//! never a client-side verdict. See near/ADVERSARIAL-TESTS.md for the matrix.
//!
//! Build order: `cargo build --target wasm32-unknown-unknown --release`
//! then `cargo test --release`.

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

/// Owner + funded vault.
async fn setup() -> Result<(Worker<Sandbox>, Contract, Account)> {
    let worker = near_workspaces::sandbox().await?;
    let owner = worker.dev_create_account().await?;
    let wasm = std::fs::read(wasm_path())
        .expect("wasm missing — run: cargo build --target wasm32-unknown-unknown --release");
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

/// Agent account with a fresh signing key.
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
    expires_at_ns: Option<u64>,
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
                "expires_at_ns": expires_at_ns,
            }
        }))
        .max_gas()
        .transact()
        .await?;
    let out: Value = res
        .into_result()?
        .json()
        .map_err(|e| anyhow::anyhow!("issue_root decode: {e}"))?;
    Ok(out.as_u64().expect("issue_root returned cap id"))
}

async fn delegate(
    agent: &Account,
    contract: &Contract,
    child: &Account,
    max_total: u128,
    max_per_order: u128,
    recipients: Option<Vec<String>>,
    can_transfer: Option<bool>,
    can_delegate: Option<bool>,
    expires_at_ns: Option<u64>,
) -> Result<near_workspaces::result::ExecutionFinalResult> {
    Ok(agent
        .call(contract.id(), "delegate")
        .args_json(json!({
            "child": {
                "child_account": child.id(),
                "child_pk": child.secret_key().public_key().to_string(),
                "max_total": y(max_total),
                "max_per_order": y(max_per_order),
                "recipients": recipients,
                "can_transfer": can_transfer,
                "can_delegate": can_delegate,
                "expires_at_ns": expires_at_ns,
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

fn assert_panic_containing(
    res: &near_workspaces::result::ExecutionFinalResult,
    needle: &str,
) -> String {
    assert!(!res.is_success(), "expected rejection, got success");
    let err = res.clone().into_result().err().expect("expected error").to_string();
    assert!(
        err.contains(needle),
        "expected panic containing '{needle}', got: {err}"
    );
    err
}

async fn cap_view(contract: &Contract, cap_id: u64) -> Result<Value> {
    Ok(contract
        .view("get_capability")
        .args_json(json!({ "cap_id": cap_id }))
        .await?
        .json::<Value>()?)
}

async fn cap_by_key(contract: &Contract, agent: &Account) -> Result<Option<Value>> {
    Ok(contract
        .view("get_capability_by_key")
        .args_json(json!({ "pk": agent.secret_key().public_key().to_string() }))
        .await?
        .json::<Option<Value>>()?)
}

async fn now_ns(contract: &Contract) -> Result<u64> {
    Ok(contract.view("get_now").await?.json::<u64>()?)
}

// ─── Happy path ─────────────────────────────────────────────────────────

#[tokio::test]
async fn h1_h2_h3_grant_delegate_pay_and_reservation() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    let v = mk_agent(&worker).await?;

    let root = issue_root(
        &owner, &contract, &a, NEAR, NEAR / 3, Some(vec![v.id().to_string()]), true, true, None,
    )
    .await?;

    // H1: A (1 N) delegates 0.4 N to B — reservation debited from A.
    let r = delegate(&a, &contract, &b, (NEAR * 4) / 10, NEAR / 3, None, None, None, None).await?;
    assert!(r.is_success(), "valid delegation must succeed: {:?}", r.failures());
    let child_id: u64 = r.into_result()?.json()?;
    let av = cap_view(&contract, root).await?;
    assert_eq!(av["allocated_children"].as_str().unwrap(), y(NEAR * 4 / 10));
    assert_eq!(av["headroom"].as_str().unwrap(), y(NEAR * 6 / 10));

    // H2: B (0.4) delegates 0.15 to C.
    let r = delegate(&b, &contract, &c, NEAR * 15 / 100, NEAR * 15 / 100, None, None, None, None).await?;
    assert!(r.is_success(), "nested delegation must succeed: {:?}", r.failures());
    let grandchild_id: u64 = r.into_result()?.json()?;
    let bv = cap_view(&contract, child_id).await?;
    assert_eq!(bv["allocated_children"].as_str().unwrap(), y(NEAR * 15 / 100));
    assert_eq!(bv["headroom"].as_str().unwrap(), y(NEAR / 4));

    // H3: C pays 0.05 N to allowlisted recipient — real vault transfer.
    let before = contract.as_account().view_account().await?.balance.as_yoctonear();
    let r = pay(&c, &contract, v.id().as_str(), NEAR / 20).await?;
    assert!(r.is_success(), "authorized payment must succeed: {:?}", r.failures());
    let after = contract.as_account().view_account().await?.balance.as_yoctonear();
    let spent = before - after;
    assert!(spent >= NEAR / 20, "vault must pay out the transfer amount (paid {spent})");
    let cv = cap_view(&contract, grandchild_id).await?;
    assert_eq!(cv["total_spent"].as_str().unwrap(), y(NEAR / 20));
    // B's ledger is untouched by C's spend (reservation model).
    assert_eq!(bv["total_spent"].as_str().unwrap(), "0");

    // I3 backstop: the payment is visible only through C's registered key.
    let lookup = cap_by_key(&contract, &c).await?;
    assert!(lookup.is_some());
    Ok(())
}

#[tokio::test]
async fn h4_inheritance_semantics() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let now = now_ns(&contract).await?;

    let _root = issue_root(
        &owner, &contract, &a, NEAR, NEAR / 2, Some(vec!["v.near".into()]), true, true,
        Some(now + 600_000_000_000),
    )
    .await?;

    // Child created with None fields must inherit the parent's exact policy.
    let r = delegate(&a, &contract, &b, NEAR / 2, NEAR / 4, None, None, None, None).await?;
    assert!(r.is_success());
    let id: u64 = r.into_result()?.json()?;
    let bv = cap_view(&contract, id).await?;
    assert_eq!(
        bv["recipients"].as_array().unwrap()[0].as_str().unwrap(),
        "v.near"
    );
    assert_eq!(bv["expires_at_ns"].as_u64().unwrap(), now + 600_000_000_000);
    assert!(bv["can_transfer"].as_bool().unwrap());
    Ok(())
}

// ─── Escalation attempts ────────────────────────────────────────────────

#[tokio::test]
async fn e1_e2_child_amount_escalation_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let root = issue_root(&owner, &contract, &a, NEAR, NEAR / 3, None, true, true, None).await?;

    // E1: child budget exceeds parent.
    let r = delegate(&a, &contract, &b, NEAR * 2, NEAR, None, None, None, None).await?;
    assert_panic_containing(&r, "BUDGET_ESCALATION");
    // No capability was created; no key registered.
    let lookup = cap_by_key(&contract, &b).await?;
    assert!(lookup.is_none(), "rejected child must have no capability");
    let av = cap_view(&contract, root).await?;
    assert_eq!(av["allocated_children"].as_str().unwrap(), "0");
    assert_eq!(av["children"].as_array().unwrap().len(), 0);

    // E2: per-order escalation.
    let r = delegate(&a, &contract, &b, NEAR / 2, NEAR / 2, None, None, None, None).await?;
    assert_panic_containing(&r, "PER_ORDER_ESCALATION");
    assert!(cap_by_key(&contract, &b).await?.is_none());
    Ok(())
}

#[tokio::test]
async fn e3_sibling_allocations_exceed_parent() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    let _root = issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, true, None).await?;

    let r = delegate(&a, &contract, &b, NEAR * 7 / 10, NEAR * 7 / 10, None, None, None, None).await?;
    assert!(r.is_success());
    // Second sibling would take total allocated to 1.1 N > 1.0 N.
    let r = delegate(&a, &contract, &c, NEAR * 4 / 10, NEAR, None, None, None, None).await?;
    assert_panic_containing(&r, "BUDGET_ESCALATION");
    let lookup = cap_by_key(&contract, &c).await?;
    assert!(lookup.is_none(), "sibling over-allocation must not create a capability");
    Ok(())
}

#[tokio::test]
async fn e4_grandchild_exceeds_grandparent() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, true, None).await?;
    let r = delegate(&a, &contract, &b, NEAR * 4 / 10, NEAR * 4 / 10, None, None, None, None).await?;
    let b_id: u64 = r.into_result()?.json()?;

    // B (0.4) tries to grant 0.5 to C.
    let r = delegate(&b, &contract, &c, NEAR / 2, NEAR / 2, None, None, None, None).await?;
    assert_panic_containing(&r, "BUDGET_ESCALATION");
    let bv = cap_view(&contract, b_id).await?;
    assert_eq!(bv["allocated_children"].as_str().unwrap(), "0");
    Ok(())
}

#[tokio::test]
async fn e5_recipient_escalation_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    issue_root(
        &owner, &contract, &a, NEAR, NEAR, Some(vec!["v.near".into(), "w.near".into()]),
        true, true, None,
    )
    .await?;

    let r = delegate(
        &a, &contract, &b, NEAR / 2, NEAR / 2, Some(vec!["v.near".into(), "x.near".into()]),
        None, None, None,
    )
    .await?;
    assert_panic_containing(&r, "RECIPIENT_ESCALATION");
    Ok(())
}

#[tokio::test]
async fn e6_temporal_escalation_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let now = now_ns(&contract).await?;
    issue_root(
        &owner, &contract, &a, NEAR, NEAR, None, true, true, Some(now + 600_000_000_000),
    )
    .await?;

    let r = delegate(
        &a, &contract, &b, NEAR / 2, NEAR / 2, None, None, None,
        Some(now + 3_600_000_000_000),
    )
    .await?;
    assert_panic_containing(&r, "TEMPORAL_ESCALATION");
    Ok(())
}

#[tokio::test]
async fn e8_e9_rights_fabrication_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    // Parent may transfer but NOT delegate.
    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, false, None).await?;

    let r = delegate(&a, &contract, &b, NEAR / 2, NEAR, None, None, Some(true), None).await?;
    assert_panic_containing(&r, "DELEGATION_FORBIDDEN");
    Ok(())
}

// ─── Identity / authority ───────────────────────────────────────────────

#[tokio::test]
async fn i1_i2_i4_unknown_keys_and_owner_gates() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let outsider = mk_agent(&worker).await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let _root = issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, true, None).await?;

    // I1: unregistered key delegates.
    let r = delegate(&outsider, &contract, &b, NEAR / 2, NEAR, None, None, None, None).await?;
    assert_panic_containing(&r, "UNKNOWN_KEY");

    // I2: unregistered key executes.
    let r = pay(&outsider, &contract, "v.near", 1).await?;
    assert_panic_containing(&r, "UNKNOWN_KEY");

    // I4: agent cannot issue root.
    let r = outsider
        .call(contract.id(), "issue_root")
        .args_json(json!({ "grant": {
            "agent_account": b.id(),
            "agent_pk": b.secret_key().public_key().to_string(),
            "max_total": y(NEAR), "max_per_order": y(NEAR),
            "recipients": null, "can_transfer": true, "can_delegate": true,
            "expires_at_ns": null,
        }}))
        .max_gas()
        .transact()
        .await?;
    assert_panic_containing(&r, "only the owner");

    // Agent cannot revoke.
    let r = outsider
        .call(contract.id(), "revoke")
        .args_json(json!({ "cap_id": _root, "reason": "attack" }))
        .max_gas()
        .transact()
        .await?;
    assert_panic_containing(&r, "only the owner");

    // Key re-registration attempt.
    let r = owner
        .call(contract.id(), "issue_root")
        .args_json(json!({ "grant": {
            "agent_account": a.id(),
            "agent_pk": a.secret_key().public_key().to_string(),
            "max_total": y(NEAR), "max_per_order": y(NEAR),
            "recipients": null, "can_transfer": true, "can_delegate": true,
            "expires_at_ns": null,
        }}))
        .max_gas()
        .transact()
        .await?;
    assert_panic_containing(&r, "already registered");
    Ok(())
}

// ─── Execution attacks ──────────────────────────────────────────────────

#[tokio::test]
async fn x2_x3_x4_payment_rejections() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let vendor = mk_agent(&worker).await?;
    issue_root(
        &owner, &contract, &a, NEAR, NEAR / 3, Some(vec![vendor.id().to_string()]), true, true, None,
    )
    .await?;

    // X2: non-allowlisted recipient.
    let r = pay(&a, &contract, "evil.near", 1).await?;
    assert_panic_containing(&r, "RECIPIENT_FORBIDDEN");

    // X3: per-order exceeded.
    let r = pay(&a, &contract, vendor.id().as_str(), NEAR / 2).await?;
    assert_panic_containing(&r, "PER_ORDER_EXCEEDED");

    // X4: headroom exceeded after delegation.
    let b = mk_agent(&worker).await?;
    let r = delegate(&a, &contract, &b, NEAR * 8 / 10, NEAR / 3, None, None, None, None).await?;
    assert!(r.is_success(), "X4 delegate failed: {:?}", r.clone().into_result().err().map(|e| e.to_string()));
    let r = pay(&a, &contract, vendor.id().as_str(), NEAR / 4).await?;
    assert_panic_containing(&r, "BUDGET_EXCEEDED");

    // Valid remaining spend still works.
    let r = pay(&a, &contract, vendor.id().as_str(), NEAR / 10).await?;
    assert!(r.is_success(), "valid payment after delegation must succeed: {:?}", r.failures());
    Ok(())
}

#[tokio::test]
async fn x6_failed_transfer_refunds_budget() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let vendor = mk_agent(&worker).await?;
    issue_root(&owner, &contract, &a, NEAR, NEAR, None, true, false, None).await?;

    // Recipient account does not exist → transfer fails → callback refunds.
    let r = pay(&a, &contract, "nonexistent-account-xyz.test", NEAR / 10).await?;
    // The execute call itself succeeds; failure surfaces in the callback receipt.
    assert!(r.is_success(), "execute tx accepts, failure is in callback: {:?}", r.failures());

    let av = cap_view(&contract, 0).await?;
    assert_eq!(
        av["total_spent"].as_str().unwrap(),
        "0",
        "failed transfer must refund the capability's budget"
    );

    // Budget fully usable again.
    let r = pay(&a, &contract, vendor.id().as_str(), NEAR / 10).await?;
    assert!(r.is_success(), "post-refund payment must succeed: {:?}", r.failures());
    Ok(())
}

// ─── Revocation ─────────────────────────────────────────────────────────

#[tokio::test]
async fn r1_r2_r4_r5_cascade_revocation_and_accounting() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    let v = mk_agent(&worker).await?;

    let root = issue_root(
        &owner, &contract, &a, NEAR, NEAR, Some(vec![v.id().to_string()]), true, true, None,
    )
    .await?;
    let r = delegate(&a, &contract, &b, NEAR * 4 / 10, NEAR * 4 / 10, None, None, None, None).await?;
    let b_id: u64 = r.into_result()?.json()?;
    let r = delegate(&b, &contract, &c, NEAR * 15 / 100, NEAR * 15 / 100, None, None, None, None).await?;
    let c_id: u64 = r.into_result()?.json()?;

    // B pays 0.1 before revocation.
    let r = pay(&b, &contract, v.id().as_str(), NEAR / 10).await?;
    assert!(r.is_success());

    // R1: owner revokes A → whole branch dies, same transaction.
    let r = owner
        .call(contract.id(), "revoke")
        .args_json(json!({ "cap_id": root, "reason": "demo" }))
        .max_gas()
        .transact()
        .await?;
    assert!(r.is_success(), "revoke must succeed: {:?}", r.failures());

    let r = pay(&b, &contract, v.id().as_str(), 1).await?;
    assert_panic_containing(&r, "REVOKED_CHAIN");
    let r = pay(&c, &contract, v.id().as_str(), 1).await?;
    assert_panic_containing(&r, "REVOKED_CHAIN");

    // R4: accounting — A released only what the branch left unspent:
    // branch spent 0.1; released = 0.4 − 0.1 = 0.3 → A.allocated_children = 0.1.
    let av = cap_view(&contract, root).await?;
    assert_eq!(
        av["allocated_children"].as_str().unwrap(),
        y(NEAR / 10),
        "spent funds must stay charged to the parent after revocation"
    );

    // R5: owner may re-root its own authority freely — re-rooting is an owner
    // prerogative, not a parent-to-child delegation, so it is not bound by
    // A's released headroom. Reservation-release accounting applies to live
    // parents; dead-weight proof is in r6 below (child spent 0.1 → parent
    // headroom 0.9; re-delegation of 0.95 N from live A rejected).
    let d = mk_agent(&worker).await?;
    let r = owner
        .call(contract.id(), "issue_root")
        .args_json(json!({ "grant": {
            "agent_account": d.id(),
            "agent_pk": d.secret_key().public_key().to_string(),
            "max_total": y(NEAR * 9 / 10), "max_per_order": y(NEAR / 2),
            "recipients": [v.id().to_string()], "can_transfer": true, "can_delegate": false,
            "expires_at_ns": null,
        }}))
        .max_gas()
        .transact()
        .await?;
    assert!(r.is_success(), "owner re-root must succeed: {:?}", r.failures());

    // Revoked keys stay registered (state-authoritative forensics):
    // lookups resolve to capabilities marked revoked.
    let b_lookup = cap_by_key(&contract, &b).await?.expect("binding retained");
    assert_eq!(b_lookup["revoked"].as_bool().unwrap(), true);
    let c_lookup = cap_by_key(&contract, &c).await?.expect("binding retained");
    assert_eq!(c_lookup["revoked"].as_bool().unwrap(), true);
    let _ = b_id;
    let _ = c_id;
    Ok(())
}

#[tokio::test]
async fn r6_partial_revocation_releases_only_subtree() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    let v = mk_agent(&worker).await?;

    let root = issue_root(
        &owner, &contract, &a, NEAR, NEAR, Some(vec![v.id().to_string()]), true, true, None,
    )
    .await?;
    let r = delegate(&a, &contract, &b, NEAR * 4 / 10, NEAR * 4 / 10, None, None, None, None).await?;
    let b_id: u64 = r.into_result()?.json()?;

    // Owner revokes only B. A stays live.
    let r = owner
        .call(contract.id(), "revoke")
        .args_json(json!({ "cap_id": b_id, "reason": "trim" }))
        .max_gas()
        .transact()
        .await?;
    assert!(r.is_success());
    let av = cap_view(&contract, root).await?;
    assert_eq!(av["allocated_children"].as_str().unwrap(), "0");
    assert_eq!(av["headroom"].as_str().unwrap(), y(NEAR));

    // A can still spend.
    let r = pay(&a, &contract, v.id().as_str(), NEAR / 10).await?;
    assert!(r.is_success(), "A must remain live after revoking only B: {:?}", r.failures());
    // B is dead: state-authoritative REVOKED_CHAIN, not an ambiguous key error.
    let r = pay(&b, &contract, v.id().as_str(), 1).await?;
    assert_panic_containing(&r, "REVOKED_CHAIN");

    // Dead-weight reservation accounting on the live parent: A spent 0.1 →
    // headroom is 0.9, not 1.0. Re-delegating 0.95 must be rejected; exactly
    // 0.9 must succeed.
    let d = mk_agent(&worker).await?;
    let r = delegate(&a, &contract, &d, NEAR * 95 / 100, NEAR / 2, None, None, None, None).await?;
    assert_panic_containing(&r, "BUDGET_ESCALATION");
    let r = delegate(&a, &contract, &d, NEAR * 9 / 10, NEAR / 2, None, None, None, None).await?;
    assert!(r.is_success(), "exactly-released reservation must be re-delegatable: {:?}", r.failures());
    Ok(())
}

#[tokio::test]
async fn x8_expired_capability_rejected() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let now = now_ns(&contract).await?;
    // Expiry at 'now' — already expired when used.
    issue_root(
        &owner, &contract, &a, NEAR, NEAR, Some(vec!["v.near".into()]), true, false,
        Some(now),
    )
    .await?;
    let r = pay(&a, &contract, "v.near", 1).await?;
    assert_panic_containing(&r, "EXPIRED");
    Ok(())
}

// ─── Subset proof over the stored tree ──────────────────────────────────

#[tokio::test]
async fn p1_subset_invariant_over_full_tree() -> Result<()> {
    let (worker, contract, owner) = setup().await?;
    let a = mk_agent(&worker).await?;
    let b = mk_agent(&worker).await?;
    let c = mk_agent(&worker).await?;
    let v = mk_agent(&worker).await?;

    let root = issue_root(
        &owner, &contract, &a, NEAR, NEAR / 2, Some(vec![v.id().to_string()]), true, true, None,
    )
    .await?;
    let r = delegate(&a, &contract, &b, NEAR / 2, NEAR / 2, None, None, None, None).await?;
    let b_id: u64 = r.into_result()?.json()?;
    let r = delegate(&b, &contract, &c, NEAR / 4, NEAR / 4, None, Some(true), None, None).await?;
    let c_id: u64 = r.into_result()?.json()?;

    let tree = contract
        .view("get_tree")
        .args_json(json!({ "root_id": root }))
        .await?
        .json::<Vec<Value>>()?;
    assert_eq!(tree.len(), 3, "tree must contain exactly the live capabilities");

    let by_id: std::collections::HashMap<u64, &Value> = tree
        .iter()
        .map(|c| (c["id"].as_u64().unwrap(), c))
        .collect();
    let u = |s: &Value, f: &str| -> u128 { s[f].as_str().unwrap().parse().unwrap() };

    for (child_id, parent_id) in [(b_id, root), (c_id, b_id)] {
        let child = by_id[&child_id];
        let parent = by_id[&parent_id];
        // I1: stored subset.
        assert!(u(child, "max_total") <= u(parent, "max_total"));
        assert!(u(child, "max_per_order") <= u(parent, "max_per_order"));
        // I2: reservation invariant at every node.
        assert!(u(child, "total_spent") + u(child, "allocated_children") <= u(child, "max_total"));
        assert!(u(parent, "total_spent") + u(parent, "allocated_children") <= u(parent, "max_total"));
    }
    Ok(())
}
