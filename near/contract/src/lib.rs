//! INTENTRA — non-escalating authority for autonomous financial agents.
//!
//! Core invariant: a child capability is always a subset of its parent, and the
//! sum of all direct child allocations plus the parent's own spending can never
//! exceed the parent's maximum authority.
//!
//! All financial actions are executed by this contract out of its own balance.
//! An agent never receives a key to the treasury; it only receives a capability.

use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};

const MAX_DEPTH: u32 = 64;
const CALLBACK_GAS: u64 = 25_000_000_000_000;

#[derive(BorshStorageKey, near_sdk::borsh::BorshSerialize)]
enum StorageKey {
    Capabilities,
    Executions,
    ExecutionIds,
    Requests,
    Children,
    RootOutstanding,
    RootPending,
    RootIds,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub enum ExecutionStatus {
    Pending,
    Completed,
    Failed,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Capability {
    pub id: u64,
    pub parent_id: Option<u64>,
    /// The root capability this capability's authority descends from.
    /// Equal to `id` for root capabilities. Used for vault accounting.
    pub root_id: u64,
    pub agent_id: AccountId,
    pub depth: u32,
    pub max_total: u128,
    pub max_per_action: u128,
    pub total_spent: u128,
    pub total_allocated: u128,
    pub allowed_actions: Vec<String>,
    pub allowed_assets: Vec<String>,
    pub prohibited_actions: Vec<String>,
    pub allowed_recipients: Option<Vec<AccountId>>,
    pub can_delegate: bool,
    pub expires_at_ns: Option<u64>,
    pub revoked: bool,
    pub revocation_reason: Option<String>,
    pub created_at_ns: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Execution {
    pub id: u64,
    pub capability_id: u64,
    pub agent_id: AccountId,
    pub recipient: AccountId,
    pub amount: u128,
    pub request_id: String,
    pub status: ExecutionStatus,
    pub created_at_ns: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct CapabilityView {
    pub id: u64,
    pub parent_id: Option<u64>,
    pub root_id: u64,
    pub agent_id: AccountId,
    pub depth: u32,
    pub max_total: String,
    pub max_per_action: String,
    pub total_spent: String,
    pub total_allocated: String,
    /// Unallocated headroom: budget this capability may still spend or
    /// delegate, i.e. `max_total - total_spent - total_allocated`.
    pub remaining: String,
    pub allowed_actions: Vec<String>,
    pub allowed_assets: Vec<String>,
    pub prohibited_actions: Vec<String>,
    pub allowed_recipients: Option<Vec<AccountId>>,
    pub can_delegate: bool,
    pub expires_at_ns: Option<u64>,
    pub revoked: bool,
    pub revocation_reason: Option<String>,
    pub created_at_ns: u64,
}

impl From<&Capability> for CapabilityView {
    fn from(c: &Capability) -> Self {
        Self {
            id: c.id,
            parent_id: c.parent_id,
            root_id: c.root_id,
            agent_id: c.agent_id.clone(),
            depth: c.depth,
            max_total: c.max_total.to_string(),
            max_per_action: c.max_per_action.to_string(),
            total_spent: c.total_spent.to_string(),
            total_allocated: c.total_allocated.to_string(),
            remaining: c
                .max_total
                .saturating_sub(c.total_spent)
                .saturating_sub(c.total_allocated)
                .to_string(),
            allowed_actions: c.allowed_actions.clone(),
            allowed_assets: c.allowed_assets.clone(),
            prohibited_actions: c.prohibited_actions.clone(),
            allowed_recipients: c.allowed_recipients.clone(),
            can_delegate: c.can_delegate,
            expires_at_ns: c.expires_at_ns,
            revoked: c.revoked,
            revocation_reason: c.revocation_reason.clone(),
            created_at_ns: c.created_at_ns,
        }
    }
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionView {
    pub id: u64,
    pub capability_id: u64,
    pub agent_id: AccountId,
    pub recipient: AccountId,
    pub amount: String,
    pub request_id: String,
    pub status: String,
    pub created_at_ns: u64,
}

impl From<&Execution> for ExecutionView {
    fn from(e: &Execution) -> Self {
        Self {
            id: e.id,
            capability_id: e.capability_id,
            agent_id: e.agent_id.clone(),
            recipient: e.recipient.clone(),
            amount: e.amount.to_string(),
            request_id: e.request_id.clone(),
            status: match e.status {
                ExecutionStatus::Pending => "PENDING".to_string(),
                ExecutionStatus::Completed => "COMPLETED".to_string(),
                ExecutionStatus::Failed => "FAILED".to_string(),
            },
            created_at_ns: e.created_at_ns,
        }
    }
}

#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct StatsView {
    pub owner: AccountId,
    pub capability_count: u64,
    pub execution_count: u64,
    pub treasury_balance: String,
    /// Aggregate unspent authority reserved by live roots (yoctoNEAR).
    pub vault_committed: String,
    /// Vault balance usable for transfers (balance minus storage stake).
    pub vault_liquid: String,
    /// `vault_liquid - vault_committed`, saturating at zero.
    pub vault_available: String,
    pub live_roots: u64,
    pub total_roots: u64,
}

/// Global vault accounting view: how much authority is reserved against the
/// vault and how much remains available for new root grants.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct VaultView {
    pub committed: String,
    pub liquid: String,
    pub available: String,
    pub live_roots: u64,
    pub total_roots: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner: AccountId,
    pub next_capability_id: u64,
    pub next_execution_id: u64,
    pub capabilities: LookupMap<u64, Capability>,
    pub executions: LookupMap<u64, Execution>,
    pub execution_ids: LookupMap<u64, Vec<u64>>,
    pub executed_requests: LookupMap<String, u64>,
    /// Direct children of each capability, for inspection.
    pub children: LookupMap<u64, Vec<u64>>,
    /// Per-root unspent authority (max_total minus settled and in-flight
    /// spends). Entry is removed when the root's reservation is released.
    pub root_outstanding: LookupMap<u64, u128>,
    /// Per-root in-flight (reserved, not yet settled) transfer amounts.
    /// Entries outlive root release until the transfer settles.
    pub root_pending: LookupMap<u64, u128>,
    /// Every root ever issued, for expiry sweeping.
    pub root_ids: Vector<u64>,
    /// Sum of `root_outstanding` over live roots plus all `root_pending`.
    /// Invariant: `vault_committed == Σ outstanding(live) + Σ pending(all)`.
    pub vault_committed: u128,
    pub live_root_count: u64,
}

#[near]
impl Contract {
    /// The deployer becomes the owner. The owner is the only account that can
    /// create root authority.
    #[init]
    pub fn new() -> Self {
        Self {
            owner: env::predecessor_account_id(),
            next_capability_id: 1,
            next_execution_id: 1,
            capabilities: LookupMap::new(StorageKey::Capabilities),
            executions: LookupMap::new(StorageKey::Executions),
            execution_ids: LookupMap::new(StorageKey::ExecutionIds),
            executed_requests: LookupMap::new(StorageKey::Requests),
            children: LookupMap::new(StorageKey::Children),
            root_outstanding: LookupMap::new(StorageKey::RootOutstanding),
            root_pending: LookupMap::new(StorageKey::RootPending),
            root_ids: Vector::new(StorageKey::RootIds),
            vault_committed: 0,
            live_root_count: 0,
        }
    }

    /// Fund the treasury that backs authorized financial actions.
    #[payable]
    pub fn deposit(&mut self) {
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"intentra\",\"version\":\"1.0.0\",\"event\":\"deposit\",\"data\":{{\"from\":\"{}\",\"amount\":\"{}\"}}}}",
            env::predecessor_account_id(),
            env::attached_deposit().as_yoctonear()
        ));
    }

    /// Owner grants the root capability. This is the only non-attenuated grant
    /// in the system.
    #[allow(clippy::too_many_arguments)]
    pub fn grant_root(
        &mut self,
        agent_id: AccountId,
        max_total: U128,
        max_per_action: U128,
        allowed_actions: Vec<String>,
        allowed_assets: Vec<String>,
        prohibited_actions: Vec<String>,
        allowed_recipients: Option<Vec<AccountId>>,
        can_delegate: bool,
        expires_at_ns: Option<u64>,
    ) -> u64 {
        require!(
            env::predecessor_account_id() == self.owner,
            "UNAUTHORIZED: only the owner can grant a root capability"
        );
        require!(
            max_total.0 > 0,
            "INVALID: max_total must be greater than zero"
        );
        require!(
            max_per_action.0 > 0 && max_per_action.0 <= max_total.0,
            "INVALID: max_per_action must be > 0 and <= max_total"
        );
        require!(
            !allowed_actions.is_empty(),
            "INVALID: allowed_actions is empty"
        );
        require!(
            !allowed_assets.is_empty(),
            "INVALID: allowed_assets is empty"
        );
        require!(
            !allowed_actions
                .iter()
                .any(|a| prohibited_actions.contains(a)),
            "INVALID: an action cannot be both allowed and prohibited"
        );
        if let Some(exp) = expires_at_ns {
            require!(
                exp > env::block_timestamp(),
                "INVALID: expiry is in the past"
            );
        }

        // Release reservations of roots that expired since the last grant.
        self.sweep_expired_roots();

        // Global vault accounting: the aggregate authority of all live roots
        // can never exceed the vault's usable balance. This is what stops
        // multiple individually-valid roots from collectively overcommitting
        // the treasury.
        let liquid = Self::liquid_balance();
        let available = liquid.saturating_sub(self.vault_committed);
        if max_total.0 > available {
            near_sdk::env::panic_str(&format!(
                "VAULT: root max_total {} exceeds available vault authority {} (committed {}, liquid {})",
                max_total.0, available, self.vault_committed, liquid
            ));
        }

        let id = self.next_capability_id;
        self.next_capability_id += 1;
        let capability = Capability {
            id,
            parent_id: None,
            root_id: id,
            agent_id: agent_id.clone(),
            depth: 0,
            max_total: max_total.0,
            max_per_action: max_per_action.0,
            total_spent: 0,
            total_allocated: 0,
            allowed_actions,
            allowed_assets,
            prohibited_actions,
            allowed_recipients,
            can_delegate,
            expires_at_ns,
            revoked: false,
            revocation_reason: None,
            created_at_ns: env::block_timestamp(),
        };
        self.capabilities.insert(id, capability);
        self.root_outstanding.insert(id, max_total.0);
        self.root_ids.push(id);
        self.vault_committed = self
            .vault_committed
            .checked_add(max_total.0)
            .expect("VAULT: committed overflow");
        self.live_root_count += 1;
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({
                "standard": "intentra",
                "version": "1.0.0",
                "event": "grant",
                "data": {
                    "capability_id": id,
                    "agent_id": agent_id.to_string(),
                    "max_total": max_total.0.to_string(),
                }
            })
        ));
        id
    }

    /// Delegate a strictly narrower capability. The caller must be the agent
    /// that owns the parent capability.
    #[allow(clippy::too_many_arguments)]
    pub fn delegate(
        &mut self,
        parent_id: u64,
        child_agent_id: AccountId,
        max_total: U128,
        max_per_action: U128,
        allowed_actions: Vec<String>,
        allowed_assets: Vec<String>,
        prohibited_actions: Vec<String>,
        allowed_recipients: Option<Vec<AccountId>>,
        can_delegate: bool,
        expires_at_ns: Option<u64>,
    ) -> u64 {
        let parent = self.usable_capability(parent_id);
        require!(
            env::predecessor_account_id() == parent.agent_id,
            "UNAUTHORIZED: only the parent agent can delegate"
        );
        require!(
            parent.can_delegate,
            "UNAUTHORIZED: parent capability cannot delegate"
        );
        // Bound depth at creation, not only when walking a lineage. The
        // deepest usable capability has depth `MAX_DEPTH - 1`; creating one
        // level below that would be accepted but permanently unusable.
        require!(
            parent.depth < MAX_DEPTH - 1,
            "DEPTH: capability tree exceeds maximum depth"
        );

        self.validate_attenuation(
            &parent,
            max_total.0,
            max_per_action.0,
            &allowed_actions,
            &allowed_assets,
            &prohibited_actions,
            &allowed_recipients,
            can_delegate,
            expires_at_ns,
        );

        // Aggregate reservation: a parent can never allocate more than it holds,
        // and cannot allocate budget it has already spent.
        let new_allocated = parent
            .total_allocated
            .checked_add(max_total.0)
            .expect("INVALID: allocation overflow");
        let committed = parent
            .total_spent
            .checked_add(new_allocated)
            .expect("INVALID: allocation overflow");
        if committed > parent.max_total {
            near_sdk::env::panic_str(&format!(
                "BUDGET_RESERVATION: {} already spent + {} allocated would exceed parent max_total {}",
                parent.total_spent, new_allocated, parent.max_total
            ));
        }

        let id = self.next_capability_id;
        self.next_capability_id += 1;
        let child = Capability {
            id,
            parent_id: Some(parent_id),
            root_id: parent.root_id,
            agent_id: child_agent_id.clone(),
            depth: parent.depth + 1,
            max_total: max_total.0,
            max_per_action: max_per_action.0,
            total_spent: 0,
            total_allocated: 0,
            allowed_actions,
            allowed_assets,
            prohibited_actions,
            allowed_recipients,
            can_delegate,
            expires_at_ns,
            revoked: false,
            revocation_reason: None,
            created_at_ns: env::block_timestamp(),
        };

        let mut updated_parent = parent;
        updated_parent.total_allocated = new_allocated;
        self.capabilities.insert(parent_id, updated_parent);
        self.capabilities.insert(id, child);
        let mut siblings = self.children.get(&parent_id).cloned().unwrap_or_default();
        siblings.push(id);
        self.children.insert(parent_id, siblings);
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({
                "standard": "intentra",
                "version": "1.0.0",
                "event": "delegate",
                "data": {
                    "capability_id": id,
                    "parent_id": parent_id,
                    "agent_id": child_agent_id.to_string(),
                    "max_total": max_total.0.to_string(),
                }
            })
        ));
        id
    }

    /// Execute a real NEAR transfer through the capability boundary.
    ///
    /// State is reserved before the external promise is created. A private
    /// callback marks the execution completed or refunds the reservation when
    /// the transfer fails.
    pub fn execute_transfer(
        &mut self,
        capability_id: u64,
        amount: U128,
        recipient: AccountId,
        request_id: String,
    ) -> Promise {
        let capability = self.usable_capability(capability_id);
        require!(
            env::predecessor_account_id() == capability.agent_id,
            "UNAUTHORIZED: signer is not the capability agent"
        );
        require!(amount.0 > 0, "INVALID: amount must be greater than zero");
        require!(
            !self.executed_requests.contains_key(&request_id),
            "REPLAY: request_id already used"
        );

        self.authorize_action(&capability, "transfer", "NEAR", amount.0, &recipient);

        // Reserve spend before any external effect.
        let mut updated = capability.clone();
        updated.total_spent = updated
            .total_spent
            .checked_add(amount.0)
            .expect("INVALID: spend overflow");
        self.capabilities.insert(capability_id, updated);

        // Vault accounting: move the amount from the root's unspent bucket
        // to its in-flight bucket. `vault_committed` does not change here —
        // the authority stays claimed until the transfer settles (success
        // consumes it, failure returns it).
        let root_id = capability.root_id;
        let Some(outstanding) = self.root_outstanding.get(&root_id) else {
            near_sdk::env::panic_str("VAULT: root authority already released");
        };
        self.root_outstanding.insert(
            root_id,
            outstanding
                .checked_sub(amount.0)
                .expect("VAULT: root outstanding underflow"),
        );
        let pending = self.root_pending.get(&root_id).copied().unwrap_or(0);
        self.root_pending.insert(
            root_id,
            pending
                .checked_add(amount.0)
                .expect("VAULT: root pending overflow"),
        );

        let execution_id = self.next_execution_id;
        self.next_execution_id += 1;
        let execution = Execution {
            id: execution_id,
            capability_id,
            agent_id: capability.agent_id.clone(),
            recipient: recipient.clone(),
            amount: amount.0,
            request_id: request_id.clone(),
            status: ExecutionStatus::Pending,
            created_at_ns: env::block_timestamp(),
        };
        self.executions.insert(execution_id, execution);
        let mut ids = self
            .execution_ids
            .get(&capability_id)
            .cloned()
            .unwrap_or_default();
        ids.push(execution_id);
        self.execution_ids.insert(capability_id, ids);
        self.executed_requests
            .insert(request_id.clone(), execution_id);

        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({
                "standard": "intentra",
                "version": "1.0.0",
                "event": "execute",
                "data": {
                    "execution_id": execution_id,
                    "capability_id": capability_id,
                    "agent_id": capability.agent_id.to_string(),
                    "recipient": recipient.to_string(),
                    "amount": amount.0.to_string(),
                    "request_id": request_id,
                }
            })
        ));

        Promise::new(recipient)
            .transfer(NearToken::from_yoctonear(amount.0))
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_transfer".to_string(),
                    near_sdk::serde_json::to_vec(&near_sdk::serde_json::json!({
                        "capability_id": capability_id,
                        "execution_id": execution_id,
                        "amount": U128(amount.0),
                    }))
                    .expect("serialize callback"),
                    NearToken::from_yoctonear(0),
                    near_sdk::Gas::from_gas(CALLBACK_GAS),
                ),
            )
            .as_return()
    }

    /// Private callback. Only the contract itself can call this.
    #[private]
    pub fn on_transfer(&mut self, capability_id: u64, execution_id: u64, amount: U128) {
        // Defense in depth: the generated wasm entry point already enforces
        // `#[private]`; this body-level check makes the guarantee explicit
        // and unit-testable.
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "UNAUTHORIZED: on_transfer is private"
        );
        let mut execution = self
            .executions
            .get(&execution_id)
            .cloned()
            .expect("UNKNOWN: execution not found");
        require!(
            execution.status == ExecutionStatus::Pending,
            "REPLAY: callback already processed"
        );
        require!(
            execution.capability_id == capability_id && execution.amount == amount.0,
            "INVALID: callback does not match execution"
        );

        let capability = self
            .capabilities
            .get(&capability_id)
            .cloned()
            .expect("UNKNOWN: capability not found");
        let root_id = capability.root_id;

        let succeeded =
            env::promise_results_count() == 1 && env::promise_result_checked(0, 1024).is_ok();

        // Settle this root's in-flight vault bucket.
        let pending = self.root_pending.get(&root_id).copied().unwrap_or(0);
        let pending = pending
            .checked_sub(amount.0)
            .expect("VAULT: root pending underflow");
        if pending == 0 {
            self.root_pending.remove(&root_id);
        } else {
            self.root_pending.insert(root_id, pending);
        }

        if succeeded {
            execution.status = ExecutionStatus::Completed;
            // The transfer settled: the authority is consumed. Remove it
            // from `vault_committed` (it was held in the pending bucket).
            self.vault_committed = self
                .vault_committed
                .checked_sub(amount.0)
                .expect("VAULT: committed underflow");
        } else {
            execution.status = ExecutionStatus::Failed;
            if let Some(mut capability) = self.capabilities.get(&capability_id).cloned() {
                capability.total_spent = capability.total_spent.saturating_sub(amount.0);
                self.capabilities.insert(capability_id, capability);
            }
            self.executed_requests.remove(&execution.request_id);
            if let Some(outstanding) = self.root_outstanding.get(&root_id) {
                // Root still live: the authority returns to its unspent
                // bucket. `vault_committed` is unchanged (pending →
                // outstanding), so no budget is created or destroyed.
                self.root_outstanding.insert(
                    root_id,
                    outstanding
                        .checked_add(amount.0)
                        .expect("VAULT: root outstanding overflow"),
                );
            } else {
                // Root already released: the refunded funds return to the
                // free pool — they belong to no capability.
                self.vault_committed = self
                    .vault_committed
                    .checked_sub(amount.0)
                    .expect("VAULT: committed underflow");
            }
        }
        self.executions.insert(execution_id, execution);
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"intentra\",\"version\":\"1.0.0\",\"event\":\"settle\",\"data\":{{\"execution_id\":{},\"success\":{}}}}}",
            execution_id, succeeded
        ));
    }

    /// Revoke a capability. The owner, the capability's agent, or any agent in
    /// its ancestry (a delegating parent) may revoke.
    ///
    /// Descendants are invalidated transitively at execution time by walking the
    /// lineage, so no recursive write is required.
    pub fn revoke(&mut self, capability_id: u64, reason: String) {
        let capability = self
            .capabilities
            .get(&capability_id)
            .cloned()
            .expect("UNKNOWN: capability not found");
        require!(!capability.revoked, "INVALID: capability already revoked");

        let signer = env::predecessor_account_id();
        let mut authorized = signer == self.owner;
        let mut cursor = Some(capability_id);
        let mut hops = 0u32;
        while let Some(id) = cursor {
            let current = self
                .capabilities
                .get(&id)
                .cloned()
                .expect("UNKNOWN: lineage broken");
            if signer == current.agent_id {
                authorized = true;
                break;
            }
            hops += 1;
            require!(hops <= MAX_DEPTH, "LINEAGE: cycle or depth limit");
            cursor = current.parent_id;
        }
        require!(
            authorized,
            "UNAUTHORIZED: signer is not the owner or an ancestor agent"
        );

        let mut updated = capability;
        updated.revoked = true;
        updated.revocation_reason = Some(reason.clone());
        let was_root = updated.parent_id.is_none();
        self.capabilities.insert(capability_id, updated);
        if was_root {
            // Retiring a root releases exactly its unspent authority. Funds
            // already spent (by the root or any descendant) stay consumed —
            // they were subtracted from `root_outstanding` when the spends
            // were reserved. In-flight transfers remain reserved in
            // `root_pending` until they settle.
            self.release_root(capability_id);
        }
        env::log_str(&format!(
            "EVENT_JSON:{}",
            near_sdk::serde_json::json!({
                "standard": "intentra",
                "version": "1.0.0",
                "event": "revoke",
                "data": {
                    "capability_id": capability_id,
                    "reason": reason,
                }
            })
        ));
    }

    // ----------------------------------------------------------------- views

    pub fn get_capability(&self, capability_id: u64) -> Option<CapabilityView> {
        self.capabilities
            .get(&capability_id)
            .map(CapabilityView::from)
    }

    pub fn get_lineage(&self, capability_id: u64) -> Vec<CapabilityView> {
        let mut lineage = Vec::new();
        let mut cursor = Some(capability_id);
        let mut hops = 0u32;
        while let Some(id) = cursor {
            let Some(current) = self.capabilities.get(&id) else {
                break;
            };
            lineage.push(CapabilityView::from(current));
            hops += 1;
            if hops > MAX_DEPTH {
                break;
            }
            cursor = current.parent_id;
        }
        lineage
    }

    pub fn is_usable(&self, capability_id: u64) -> bool {
        self.check_usable(capability_id).is_ok()
    }

    pub fn get_execution(&self, execution_id: u64) -> Option<ExecutionView> {
        self.executions.get(&execution_id).map(ExecutionView::from)
    }

    pub fn get_executions(&self, capability_id: u64) -> Vec<ExecutionView> {
        self.execution_ids
            .get(&capability_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|id| self.executions.get(&id).map(ExecutionView::from))
            .collect()
    }

    pub fn get_children(&self, parent_id: u64) -> Vec<CapabilityView> {
        self.children
            .get(&parent_id)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|id| self.capabilities.get(&id).map(CapabilityView::from))
            .collect()
    }

    pub fn get_stats(&self) -> StatsView {
        let liquid = Self::liquid_balance();
        StatsView {
            owner: self.owner.clone(),
            capability_count: self.next_capability_id.saturating_sub(1),
            execution_count: self.next_execution_id.saturating_sub(1),
            treasury_balance: env::account_balance().as_yoctonear().to_string(),
            vault_committed: self.vault_committed.to_string(),
            vault_liquid: liquid.to_string(),
            vault_available: liquid.saturating_sub(self.vault_committed).to_string(),
            live_roots: self.live_root_count,
            total_roots: self.root_ids.len() as u64,
        }
    }

    /// Global vault accounting: aggregate root authority reserved against
    /// the vault versus the vault's usable balance.
    pub fn get_vault(&self) -> VaultView {
        let liquid = Self::liquid_balance();
        VaultView {
            committed: self.vault_committed.to_string(),
            liquid: liquid.to_string(),
            available: liquid.saturating_sub(self.vault_committed).to_string(),
            live_roots: self.live_root_count,
            total_roots: self.root_ids.len() as u64,
        }
    }

    // -------------------------------------------------------------- internal

    /// Balance usable to back transfers: account balance minus the stake
    /// locked for the contract's own storage.
    fn liquid_balance() -> u128 {
        env::account_balance().as_yoctonear().saturating_sub(
            u128::from(env::storage_usage()) * env::storage_byte_cost().as_yoctonear(),
        )
    }

    /// Release a root's unspent reservation back to the free pool. In-flight
    /// transfers stay reserved in `root_pending` until they settle.
    fn release_root(&mut self, root_id: u64) {
        if let Some(outstanding) = self.root_outstanding.remove(&root_id) {
            self.vault_committed = self.vault_committed.saturating_sub(outstanding);
            self.live_root_count = self.live_root_count.saturating_sub(1);
        }
        if self.root_pending.get(&root_id).copied().unwrap_or(0) == 0 {
            self.root_pending.remove(&root_id);
        }
    }

    /// Release reservations of roots whose expiry has passed, so expired
    /// authority stops occupying vault capacity.
    fn sweep_expired_roots(&mut self) {
        let now = env::block_timestamp();
        let ids: Vec<u64> = self.root_ids.iter().copied().collect();
        for id in ids {
            if !self.root_outstanding.contains_key(&id) {
                continue;
            }
            let Some(capability) = self.capabilities.get(&id) else {
                continue;
            };
            if let Some(expiry) = capability.expires_at_ns {
                if now >= expiry {
                    self.release_root(id);
                }
            }
        }
    }

    fn usable_capability(&self, capability_id: u64) -> Capability {
        self.check_usable(capability_id)
            .unwrap_or_else(|reason| near_sdk::env::panic_str(&reason))
    }

    fn check_usable(&self, capability_id: u64) -> Result<Capability, String> {
        let capability = self
            .capabilities
            .get(&capability_id)
            .cloned()
            .ok_or_else(|| format!("UNKNOWN: capability {} not found", capability_id))?;
        let now = env::block_timestamp();
        let mut cursor = Some(capability_id);
        let mut hops = 0u32;
        while let Some(id) = cursor {
            let current = self
                .capabilities
                .get(&id)
                .cloned()
                .ok_or_else(|| format!("LINEAGE: capability {} missing", id))?;
            if current.revoked {
                return Err(format!("REVOKED: capability {} has been revoked", id));
            }
            if let Some(expires) = current.expires_at_ns {
                if now >= expires {
                    return Err(format!("EXPIRED: capability {} has expired", id));
                }
            }
            hops += 1;
            if hops > MAX_DEPTH {
                return Err("LINEAGE: cycle or depth limit".to_string());
            }
            cursor = current.parent_id;
        }
        Ok(capability)
    }

    #[allow(clippy::too_many_arguments)]
    fn validate_attenuation(
        &self,
        parent: &Capability,
        child_max_total: u128,
        child_max_per_action: u128,
        child_actions: &[String],
        child_assets: &[String],
        child_prohibited: &[String],
        child_recipients: &Option<Vec<AccountId>>,
        child_can_delegate: bool,
        child_expires_at_ns: Option<u64>,
    ) {
        require!(
            child_max_total > 0,
            "INVALID: max_total must be greater than zero"
        );
        require!(
            child_max_per_action > 0 && child_max_per_action <= child_max_total,
            "INVALID: max_per_action must be > 0 and <= max_total"
        );
        if child_max_total > parent.max_total {
            near_sdk::env::panic_str(&format!(
                "ATTENUATION: child max_total {} exceeds parent max_total {}",
                child_max_total, parent.max_total
            ));
        }
        if child_max_per_action > parent.max_per_action {
            near_sdk::env::panic_str(&format!(
                "ATTENUATION: child max_per_action {} exceeds parent max_per_action {}",
                child_max_per_action, parent.max_per_action
            ));
        }

        require!(
            !child_actions.is_empty(),
            "ATTENUATION: allowed_actions is empty"
        );
        require!(
            !child_assets.is_empty(),
            "ATTENUATION: allowed_assets is empty"
        );
        require!(
            !child_actions
                .iter()
                .any(|action| child_prohibited.contains(action)),
            "INVALID: an action cannot be both allowed and prohibited"
        );

        require!(
            is_subset(child_actions, &parent.allowed_actions),
            "ATTENUATION: child allowed_actions are not a subset of parent"
        );
        require!(
            is_subset(child_assets, &parent.allowed_assets),
            "ATTENUATION: child allowed_assets are not a subset of parent"
        );
        require!(
            is_subset(&parent.prohibited_actions, child_prohibited),
            "ATTENUATION: child removed a parent prohibition"
        );

        match (&parent.allowed_recipients, child_recipients) {
            (Some(parent_recipients), Some(child_recipients)) => {
                require!(
                    child_recipients
                        .iter()
                        .all(|recipient| parent_recipients.contains(recipient)),
                    "ATTENUATION: child recipients are not a subset of parent"
                );
            }
            (Some(_), None) => {
                near_sdk::env::panic_str(
                    "ATTENUATION: child removed the parent recipient restriction",
                );
            }
            (None, _) => {}
        }

        if let Some(parent_expires) = parent.expires_at_ns {
            match child_expires_at_ns {
                Some(child_expires) => require!(
                    child_expires <= parent_expires,
                    "ATTENUATION: child expiry extends beyond the parent"
                ),
                None => near_sdk::env::panic_str(
                    "ATTENUATION: child removed the parent expiry restriction",
                ),
            }
        }

        if !parent.can_delegate {
            require!(
                !child_can_delegate,
                "ATTENUATION: child gained delegation rights the parent did not have"
            );
        }
    }

    fn authorize_action(
        &self,
        capability: &Capability,
        action: &str,
        asset: &str,
        amount: u128,
        recipient: &AccountId,
    ) {
        if capability.prohibited_actions.iter().any(|a| a == action) {
            near_sdk::env::panic_str(&format!("POLICY: action {} is prohibited", action));
        }
        if !capability
            .allowed_actions
            .iter()
            .any(|a| a == "*" || a == action)
        {
            near_sdk::env::panic_str(&format!("POLICY: action {} is not allowed", action));
        }
        if !capability
            .allowed_assets
            .iter()
            .any(|a| a == "*" || a == asset)
        {
            near_sdk::env::panic_str(&format!("POLICY: asset {} is not allowed", asset));
        }
        if let Some(recipients) = &capability.allowed_recipients {
            if !recipients.contains(recipient) {
                near_sdk::env::panic_str(&format!(
                    "POLICY: recipient {} is not allowed",
                    recipient
                ));
            }
        }
        if amount > capability.max_per_action {
            near_sdk::env::panic_str(&format!(
                "LIMIT: amount {} exceeds max_per_action {}",
                amount, capability.max_per_action
            ));
        }
        let spent_plus_amount = capability
            .total_spent
            .checked_add(amount)
            .unwrap_or_else(|| near_sdk::env::panic_str("INVALID: spend overflow"));
        if spent_plus_amount > capability.max_total {
            near_sdk::env::panic_str(&format!(
                "LIMIT: amount {} would exceed remaining budget {}",
                amount,
                capability.max_total.saturating_sub(capability.total_spent)
            ));
        }
        // A parent can never consume budget it has already promised to its
        // children: total_spent + total_allocated + amount <= max_total.
        let headroom = capability
            .max_total
            .saturating_sub(capability.total_spent)
            .saturating_sub(capability.total_allocated);
        if amount > headroom {
            near_sdk::env::panic_str(&format!(
                "BUDGET_RESERVATION: amount {} would consume budget reserved for child capabilities ({} allocated, unallocated headroom {})",
                amount, capability.total_allocated, headroom
            ));
        }
    }
}

fn is_subset(child: &[String], parent: &[String]) -> bool {
    if parent.iter().any(|value| value == "*") {
        return true;
    }
    child
        .iter()
        .all(|value| value != "*" && parent.iter().any(|allowed| allowed == value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{testing_env_with_promise_results, VMContextBuilder};
    use near_sdk::testing_env;
    use near_sdk::{PromiseResult, VMContext};

    fn account(id: &str) -> AccountId {
        id.parse().unwrap()
    }

    fn context(predecessor: &str, timestamp: u64) -> VMContext {
        VMContextBuilder::new()
            .predecessor_account_id(account(predecessor))
            .block_timestamp(timestamp)
            .build()
    }

    fn setup() -> (Contract, u64) {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        let root = contract.grant_root(
            account("a.testnet"),
            U128(1_000),
            U128(400),
            vec!["transfer".to_string()],
            vec!["NEAR".to_string()],
            vec![],
            None,
            true,
            None,
        );
        (contract, root)
    }

    fn delegate(
        contract: &mut Contract,
        parent: u64,
        agent: &str,
        max_total: u128,
        max_per: u128,
        actions: Vec<&str>,
        expires: Option<u64>,
        can_delegate: bool,
    ) -> u64 {
        contract.delegate(
            parent,
            account(agent),
            U128(max_total),
            U128(max_per),
            actions.iter().map(|a| a.to_string()).collect(),
            vec!["NEAR".to_string()],
            vec![],
            None,
            can_delegate,
            expires,
        )
    }

    fn expect_panic<F: FnOnce()>(f: F, needle: &str) {
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(f));
        let err = result.expect_err("expected panic");
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

    #[test]
    fn root_grant_is_owner_only() {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        testing_env!(context("attacker.testnet", 1_000));
        expect_panic(
            || {
                contract.grant_root(
                    account("a.testnet"),
                    U128(1_000),
                    U128(100),
                    vec!["transfer".into()],
                    vec!["NEAR".into()],
                    vec![],
                    None,
                    true,
                    None,
                );
            },
            "UNAUTHORIZED",
        );
    }

    #[test]
    fn child_cannot_expand_amount() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    root,
                    "b.testnet",
                    1_001,
                    100,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "ATTENUATION",
        );
    }

    #[test]
    fn child_cannot_expand_actions_or_assets() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                contract.delegate(
                    root,
                    account("b.testnet"),
                    U128(100),
                    U128(10),
                    vec!["transfer".into(), "sell".into()],
                    vec!["NEAR".into()],
                    vec![],
                    None,
                    true,
                    None,
                );
            },
            "ATTENUATION",
        );
        expect_panic(
            || {
                contract.delegate(
                    root,
                    account("b.testnet"),
                    U128(100),
                    U128(10),
                    vec!["transfer".into()],
                    vec!["NEAR".into(), "USDC".into()],
                    vec![],
                    None,
                    true,
                    None,
                );
            },
            "ATTENUATION",
        );
    }

    #[test]
    fn wildcard_cannot_be_introduced() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    root,
                    "b.testnet",
                    100,
                    10,
                    vec!["*"],
                    None,
                    true,
                );
            },
            "ATTENUATION",
        );
    }

    #[test]
    fn child_cannot_extend_expiry_or_drop_it() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let child = delegate(
            &mut contract,
            root,
            "b.testnet",
            100,
            10,
            vec!["transfer"],
            Some(5_000),
            true,
        );
        testing_env!(context("b.testnet", 1_200));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    child,
                    "c.testnet",
                    50,
                    5,
                    vec!["transfer"],
                    Some(6_000),
                    false,
                );
            },
            "ATTENUATION",
        );
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    child,
                    "c.testnet",
                    50,
                    5,
                    vec!["transfer"],
                    None,
                    false,
                );
            },
            "ATTENUATION",
        );
    }

    #[test]
    fn child_without_delegation_rights_cannot_delegate() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let child = delegate(
            &mut contract,
            root,
            "b.testnet",
            100,
            10,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    child,
                    "c.testnet",
                    50,
                    5,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "UNAUTHORIZED",
        );
    }

    #[test]
    fn child_cannot_drop_prohibition() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let child = contract.delegate(
            root,
            account("b.testnet"),
            U128(100),
            U128(10),
            vec!["transfer".into()],
            vec!["NEAR".into()],
            vec!["sell".into()],
            None,
            true,
            None,
        );
        testing_env!(context("b.testnet", 1_200));
        expect_panic(
            || {
                contract.delegate(
                    child,
                    account("c.testnet"),
                    U128(50),
                    U128(5),
                    vec!["transfer".into()],
                    vec!["NEAR".into()],
                    vec![],
                    None,
                    false,
                    None,
                );
            },
            "ATTENUATION",
        );
    }

    #[test]
    fn child_cannot_drop_recipient_restriction() {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        let root = contract.grant_root(
            account("a.testnet"),
            U128(1_000),
            U128(100),
            vec!["transfer".into()],
            vec!["NEAR".into()],
            vec![],
            Some(vec![account("allowed.testnet")]),
            true,
            None,
        );
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                contract.delegate(
                    root,
                    account("b.testnet"),
                    U128(100),
                    U128(10),
                    vec!["transfer".into()],
                    vec!["NEAR".into()],
                    vec![],
                    None,
                    false,
                    None,
                );
            },
            "recipient restriction",
        );
    }

    #[test]
    fn aggregate_reservation_blocks_budget_splitting() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            true,
        );
        delegate(
            &mut contract,
            root,
            "c.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("a.testnet", 1_200));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    root,
                    "d.testnet",
                    201,
                    100,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "BUDGET_RESERVATION",
        );
    }

    #[test]
    fn nested_reservation_cannot_exceed_parent_allocation() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("b.testnet", 1_200));
        let c = delegate(
            &mut contract,
            b,
            "c.testnet",
            150,
            50,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("c.testnet", 1_300));
        delegate(
            &mut contract,
            c,
            "d.testnet",
            100,
            10,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_400));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    b,
                    "e.testnet",
                    300,
                    50,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "BUDGET_RESERVATION",
        );
    }

    #[test]
    fn fake_parent_cannot_delegate() {
        let (mut contract, root) = setup();
        testing_env!(context("attacker.testnet", 1_100));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    root,
                    "evil.testnet",
                    100,
                    10,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "UNAUTHORIZED",
        );
    }

    #[test]
    fn unauthorized_signer_cannot_execute() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            400,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("attacker.testnet", 1_200));
        expect_panic(
            || {
                contract.execute_transfer(b, U128(10), account("x.testnet"), "req-1".into());
            },
            "UNAUTHORIZED",
        );
    }

    #[test]
    fn revocation_is_transitive() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("b.testnet", 1_200));
        let c = delegate(
            &mut contract,
            b,
            "c.testnet",
            150,
            50,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("owner.testnet", 1_300));
        contract.revoke(root, "owner stop".into());
        testing_env!(context("c.testnet", 1_400));
        expect_panic(
            || {
                contract.execute_transfer(c, U128(10), account("x.testnet"), "req-2".into());
            },
            "REVOKED",
        );
    }

    #[test]
    fn expired_ancestor_invalidates_descendant() {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        let root = contract.grant_root(
            account("a.testnet"),
            U128(1_000),
            U128(100),
            vec!["transfer".into()],
            vec!["NEAR".into()],
            vec![],
            None,
            true,
            Some(2_000),
        );
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            Some(1_500),
            true,
        );
        testing_env!(context("b.testnet", 1_600));
        expect_panic(
            || {
                contract.execute_transfer(b, U128(10), account("x.testnet"), "req-3".into());
            },
            "EXPIRED",
        );
    }

    #[test]
    fn replay_is_rejected() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        contract.execute_transfer(b, U128(10), account("x.testnet"), "same".into());
        expect_panic(
            || {
                contract.execute_transfer(b, U128(10), account("x.testnet"), "same".into());
            },
            "REPLAY",
        );
    }

    #[test]
    fn per_action_and_total_limits_are_enforced() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            50,
            30,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        expect_panic(
            || {
                contract.execute_transfer(b, U128(31), account("x.testnet"), "over-per".into());
            },
            "LIMIT",
        );
        contract.execute_transfer(b, U128(30), account("x.testnet"), "one".into());
        expect_panic(
            || {
                contract.execute_transfer(b, U128(30), account("x.testnet"), "two".into());
            },
            "LIMIT",
        );
    }

    #[test]
    fn recipient_and_action_policy_are_enforced() {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        let root = contract.grant_root(
            account("a.testnet"),
            U128(1_000),
            U128(100),
            vec!["transfer".into()],
            vec!["NEAR".into()],
            vec![],
            Some(vec![account("allowed.testnet")]),
            true,
            None,
        );
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                contract.execute_transfer(
                    root,
                    U128(10),
                    account("evil.testnet"),
                    "bad-recipient".into(),
                );
            },
            "POLICY",
        );
    }

    #[test]
    fn failed_callback_refunds_reservation() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        contract.execute_transfer(b, U128(50), account("x.testnet"), "cb".into());
        let after_reserve = contract.get_capability(b).unwrap().total_spent;
        assert_eq!(after_reserve, "50");

        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(account("intentra.testnet"))
            .current_account_id(account("intentra.testnet"))
            .block_timestamp(1_300)
            .build());
        // Simulate a failed promise result: promise_results_count == 0.
        contract.on_transfer(b, 1, U128(50));
        let after_fail = contract.get_capability(b).unwrap();
        assert_eq!(after_fail.total_spent, "0");
        assert_eq!(contract.get_execution(1).unwrap().status, "FAILED");
        let ids = contract.get_executions(b);
        assert_eq!(ids.len(), 1);
    }

    #[test]
    fn deep_delegation_preserves_attenuation_at_every_level() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            500,
            200,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("b.testnet", 1_200));
        let c = delegate(
            &mut contract,
            b,
            "c.testnet",
            300,
            100,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("c.testnet", 1_300));
        let d = delegate(
            &mut contract,
            c,
            "d.testnet",
            200,
            50,
            vec!["transfer"],
            None,
            true,
        );
        testing_env!(context("d.testnet", 1_400));
        let e = delegate(
            &mut contract,
            d,
            "e.testnet",
            150,
            40,
            vec!["transfer"],
            None,
            false,
        );

        let lineage = contract.get_lineage(e);
        assert_eq!(lineage.len(), 5);
        assert_eq!(lineage[0].depth, 4);
        assert_eq!(lineage[4].depth, 0);
        let totals: Vec<u128> = lineage
            .iter()
            .map(|c| c.max_total.parse().unwrap())
            .collect();
        let per_action: Vec<u128> = lineage
            .iter()
            .map(|c| c.max_per_action.parse().unwrap())
            .collect();
        assert!(totals.windows(2).all(|w| w[0] <= w[1]));
        assert!(per_action.windows(2).all(|w| w[0] <= w[1]));

        testing_env!(context("e.testnet", 1_500));
        expect_panic(
            || {
                delegate(
                    &mut contract,
                    e,
                    "f.testnet",
                    10,
                    5,
                    vec!["transfer"],
                    None,
                    false,
                );
            },
            "UNAUTHORIZED",
        );
    }

    #[test]
    fn rejected_delegation_leaves_no_partial_state() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            true,
        );
        let cap_id_before = contract.next_capability_id;
        let allocated_before = contract.get_capability(root).unwrap().total_allocated;

        expect_panic(
            || {
                delegate(
                    &mut contract,
                    root,
                    "c.testnet",
                    700,
                    100,
                    vec!["transfer"],
                    None,
                    true,
                );
            },
            "BUDGET_RESERVATION",
        );

        assert_eq!(contract.next_capability_id, cap_id_before);
        assert_eq!(
            contract.get_capability(root).unwrap().total_allocated,
            allocated_before
        );
        assert_eq!(contract.get_capability(b).unwrap().parent_id, Some(root));
        assert!(contract.get_capability(cap_id_before).is_none());
    }

    #[test]
    fn parent_agent_can_revoke_child_and_execution_stops() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        contract.execute_transfer(b, U128(10), account("x.testnet"), "before".into());
        testing_env!(context("a.testnet", 1_300));
        contract.revoke(b, "parent stop".into());
        testing_env!(context("b.testnet", 1_400));
        expect_panic(
            || {
                contract.execute_transfer(b, U128(10), account("x.testnet"), "after".into());
            },
            "REVOKED",
        );
    }

    #[test]
    fn prohibited_action_beats_wildcard_permission() {
        testing_env!(context("owner.testnet", 1_000));
        let mut contract = Contract::new();
        let root = contract.grant_root(
            account("a.testnet"),
            U128(1_000),
            U128(100),
            vec!["*".into()],
            vec!["*".into()],
            vec!["transfer".into()],
            None,
            false,
            None,
        );
        testing_env!(context("a.testnet", 1_100));
        expect_panic(
            || {
                contract.execute_transfer(
                    root,
                    U128(10),
                    account("x.testnet"),
                    "prohibited".into(),
                );
            },
            "POLICY: action transfer is prohibited",
        );
    }

    #[test]
    fn successful_callback_is_idempotent() {
        let (mut contract, root) = setup();
        testing_env!(context("a.testnet", 1_100));
        let b = delegate(
            &mut contract,
            root,
            "b.testnet",
            400,
            100,
            vec!["transfer"],
            None,
            false,
        );
        testing_env!(context("b.testnet", 1_200));
        contract.execute_transfer(b, U128(50), account("x.testnet"), "ok".into());

        let ctx = VMContextBuilder::new()
            .predecessor_account_id(account("intentra.testnet"))
            .current_account_id(account("intentra.testnet"))
            .block_timestamp(1_300)
            .build();
        testing_env_with_promise_results(ctx.clone(), PromiseResult::Successful(vec![]));
        contract.on_transfer(b, 1, U128(50));
        assert_eq!(contract.get_execution(1).unwrap().status, "COMPLETED");
        assert_eq!(contract.get_capability(b).unwrap().total_spent, "50");

        testing_env_with_promise_results(ctx, PromiseResult::Successful(vec![]));
        expect_panic(
            || {
                contract.on_transfer(b, 1, U128(50));
            },
            "REPLAY",
        );
    }

    #[test]
    fn randomized_attenuation_property() {
        // Deterministic LCG keeps the test reproducible; every successful
        // delegation must satisfy child <= parent on every numeric bound.
        let mut seed: u64 = 0x1e7a_2026_11ac;
        let mut next = || {
            seed = seed
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            (seed >> 33) % 1_000
        };
        for _ in 0..50 {
            testing_env!(context("owner.testnet", 1_000));
            let mut contract = Contract::new();
            let parent_total = next().max(1) as u128;
            let parent_per = (next().max(1) as u128).min(parent_total);
            let root = contract.grant_root(
                account("a.testnet"),
                U128(parent_total),
                U128(parent_per),
                vec!["transfer".into()],
                vec!["NEAR".into()],
                vec![],
                None,
                true,
                None,
            );
            let child_total = next().max(1) as u128;
            let child_per = (next().max(1) as u128).min(child_total);
            testing_env!(context("a.testnet", 1_100));
            let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                delegate(
                    &mut contract,
                    root,
                    "b.testnet",
                    child_total,
                    child_per,
                    vec!["transfer"],
                    None,
                    false,
                )
            }));
            if let Ok(child_id) = outcome {
                let child = contract.capabilities.get(&child_id).unwrap().clone();
                assert!(child.max_total <= parent_total);
                assert!(child.max_per_action <= parent_per);
                assert!(child.max_per_action <= child.max_total);
            }
        }
    }
}
