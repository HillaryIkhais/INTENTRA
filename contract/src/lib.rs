/*!
INTENTRA — contract-enforced non-escalating agent delegation on NEAR.

Thesis: NEAR function-call keys restrict what a key may call, but nothing
defines how much authority a child agent inherits from its parent agent.
This contract makes delegation non-escalating — `C_child ⊆ C_parent` is
enforced in contract state on every delegation.

All agent funds live in this vault. Agent accounts hold only restricted
function-call keys (receiver = this contract, methods = execute/delegate).
Authority is resolved exclusively from `env::signer_account_pk()`.
*/
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise, PublicKey};
use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;

pub const CALLBACK_GAS: u64 = 10_000_000_000_000; // 10 TGas

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Capability {
    pub id: u64,
    pub parent: Option<u64>,
    pub agent_account: AccountId,
    pub agent_pk: PublicKey,
    pub depth: u32,
    /// Total budget in yoctoNEAR, including everything reserved for children.
    pub max_total: u128,
    pub max_per_order: u128,
    /// Actually spent by this node (successful transfers it initiated).
    pub total_spent: u128,
    /// Reserved for children (live and revoked-but-charged).
    pub allocated_children: u128,
    /// None = unrestricted. Some(list) = allowlist (empty list = allow nothing).
    pub recipients: Option<Vec<AccountId>>,
    pub can_transfer: bool,
    pub can_delegate: bool,
    /// Unix nanoseconds. 0 = never expires.
    pub expires_at_ns: u64,
    pub revoked: bool,
    pub children: Vec<u64>,
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct RootGrant {
    pub agent_account: AccountId,
    pub agent_pk: PublicKey,
    pub max_total: U128,
    pub max_per_order: U128,
    /// None = unrestricted.
    pub recipients: Option<Vec<AccountId>>,
    pub can_transfer: bool,
    pub can_delegate: bool,
    /// None = never expires.
    pub expires_at_ns: Option<u64>,
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct Delegation {
    pub child_account: AccountId,
    pub child_pk: PublicKey,
    pub max_total: U128,
    pub max_per_order: U128,
    /// None = inherit parent's exact recipient policy.
    pub recipients: Option<Vec<AccountId>>,
    /// None = inherit parent.
    pub can_transfer: Option<bool>,
    /// None = inherit parent.
    pub can_delegate: Option<bool>,
    /// None = inherit parent's expiry.
    pub expires_at_ns: Option<u64>,
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct CapabilityView {
    pub id: u64,
    pub parent: Option<u64>,
    pub agent_account: AccountId,
    pub agent_pk: String,
    pub depth: u32,
    pub max_total: U128,
    pub max_per_order: U128,
    pub total_spent: U128,
    pub allocated_children: U128,
    pub headroom: U128,
    pub recipients: Option<Vec<AccountId>>,
    pub can_transfer: bool,
    pub can_delegate: bool,
    pub expires_at_ns: u64,
    pub expired: bool,
    pub revoked: bool,
    pub children: Vec<u64>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Intentra {
    owner: AccountId,
    next_id: u64,
    capabilities: LookupMap<u64, Capability>,
    key_to_cap: LookupMap<PublicKey, u64>,
}

#[near]
impl Intentra {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            next_id: 0,
            capabilities: LookupMap::new(b"caps".to_vec()),
            key_to_cap: LookupMap::new(b"keys".to_vec()),
        }
    }

    // ─── Owner operations ───────────────────────────────────────────

    /// Owner grants the first authority in a chain to an agent.
    pub fn issue_root(&mut self, grant: RootGrant) -> u64 {
        require!(
            env::predecessor_account_id() == self.owner,
            "INTENTRA: only the owner may issue root capabilities"
        );
        require!(
            self.key_to_cap.get(&grant.agent_pk).is_none(),
            "INTENTRA: key is already registered to a capability"
        );
        let max_total = grant.max_total.0;
        let max_per_order = grant.max_per_order.0;
        require!(max_total > 0, "INTENTRA: max_total must be positive");
        require!(
            max_per_order > 0 && max_per_order <= max_total,
            "INTENTRA: max_per_order must be > 0 and <= max_total"
        );
        if let Some(list) = &grant.recipients {
            self.assert_unique_accounts(list, "recipients");
        }

        let id = self.next_id;
        self.next_id += 1;
        let cap = Capability {
            id,
            parent: None,
            agent_account: grant.agent_account.clone(),
            agent_pk: grant.agent_pk.clone(),
            depth: 0,
            max_total,
            max_per_order,
            total_spent: 0,
            allocated_children: 0,
            recipients: grant.recipients.clone(),
            can_transfer: grant.can_transfer,
            can_delegate: grant.can_delegate,
            expires_at_ns: grant.expires_at_ns.unwrap_or(0),
            revoked: false,
            children: vec![],
        };
        self.capabilities.insert(id, cap);
        self.key_to_cap.insert(grant.agent_pk.clone(), id);
        self.log_event(
            "root_issued",
            serde_json::json!({
                "capability_id": id,
                "agent_account": grant.agent_account,
                "max_total": max_total.to_string(),
                "max_per_order": max_per_order.to_string(),
            }),
        );
        id
    }

    /// Owner revokes a capability and its entire descendant branch.
    /// Enforcement is state-based and takes effect in this same transaction.
    pub fn revoke(&mut self, cap_id: u64, reason: String) {
        require!(
            env::predecessor_account_id() == self.owner,
            "INTENTRA: only the owner may revoke"
        );
        require!(env::attached_deposit().as_yoctonear() == 0, "INTENTRA: do not attach a deposit");
        let parent_id = {
            let cap = self.get_cap_mut(cap_id).unwrap_or_else(|| env::panic_str(&format!("INTENTRA: capability {} not found", cap_id)));
            if cap.revoked {
                env::log_str("INTENTRA: already revoked");
                return;
            }
            cap.revoked = true;
            cap.parent
        };

        // Release this node's unspent reservation from its live parent.
        if let Some(pid) = parent_id {
            let released = self.revoke_subtree(cap_id);
            let parent = self.get_cap_mut(pid).unwrap();
            parent.allocated_children = parent.allocated_children.saturating_sub(released);
        } else {
            self.revoke_subtree(cap_id);
        }

        self.log_event(
            "capability_revoked",
            serde_json::json!({ "capability_id": cap_id, "reason": reason }),
        );
    }

    // ─── Agent operations ───────────────────────────────────────────

    /// Parent agent delegates narrowed authority to a child agent.
    pub fn delegate(&mut self, child: Delegation) -> u64 {
        require!(env::attached_deposit().as_yoctonear() == 0, "INTENTRA: do not attach a deposit");
        let parent = self.resolve_signer_capability();
        let parent_id = parent.id;

        // Liveness of parent and ancestors (I4).
        self.assert_chain_live(parent_id);

        require!(
            parent.can_delegate,
            "INTENTRA: DELEGATION_FORBIDDEN: parent capability is not allowed to delegate"
        );

        let max_total = child.max_total.0;
        let max_per_order = child.max_per_order.0;

        // ── Subset validation: child ⊆ parent (I1) ──
        require!(
            max_total > 0,
            "INTENTRA: AMOUNT_INVALID: child max_total must be positive"
        );

        let headroom = parent
            .max_total
            .saturating_sub(parent.total_spent)
            .saturating_sub(parent.allocated_children);
        if max_total > headroom {
            self.reject_delegation(
                &format!(
                    "BUDGET_ESCALATION: requested child budget {} yoctoNEAR exceeds parent headroom {}",
                    max_total, headroom
                ),
                parent_id,
            );
        }

        if max_per_order > parent.max_per_order {
            self.reject_delegation(
                &format!(
                    "PER_ORDER_ESCALATION: child per-order limit {} exceeds parent limit {}",
                    max_per_order, parent.max_per_order
                ),
                parent_id,
            );
        }
        if max_per_order > max_total {
            self.reject_delegation(
                &format!(
                    "AMOUNT_INVALID: child per-order limit {} exceeds its own total budget {}",
                    max_per_order, max_total
                ),
                parent_id,
            );
        }

        // Recipient policy: explicit subset or exact inheritance.
        let recipients = match child.recipients.clone() {
            Some(list) => {
                self.assert_unique_accounts(&list, "recipients");
                if let Some(parent_list) = &parent.recipients {
                    for acct in &list {
                        if !parent_list.contains(acct) {
                            self.reject_delegation(
                                &format!(
                                    "RECIPIENT_ESCALATION: child recipient {} is not in parent's allowlist",
                                    acct
                                ),
                                parent_id,
                            );
                        }
                    }
                }
                Some(list)
            }
            None => parent.recipients.clone(),
        };

        // Action policy: inherit or narrow.
        let can_transfer = child.can_transfer.unwrap_or(parent.can_transfer);
        if can_transfer && !parent.can_transfer {
            self.reject_delegation(
                "ACTION_ESCALATION: parent cannot transfer; child cannot be granted transfer",
                parent_id,
            );
        }
        let can_delegate = child.can_delegate.unwrap_or(parent.can_delegate);
        if can_delegate && !parent.can_delegate {
            self.reject_delegation(
                "ACTION_ESCALATION: cannot grant delegation rights beyond parent's",
                parent_id,
            );
        }

        // Temporal policy: inherit or narrow.
        let expires_at_ns = child.expires_at_ns.unwrap_or(parent.expires_at_ns);
        if parent.expires_at_ns != 0 {
            if expires_at_ns == 0 {
                self.reject_delegation(
                    "TEMPORAL_ESCALATION: child must expire; parent has an expiry",
                    parent_id,
                );
            }
            if expires_at_ns > parent.expires_at_ns {
                self.reject_delegation(
                    &format!(
                        "TEMPORAL_ESCALATION: child expiry {} exceeds parent expiry {}",
                        expires_at_ns, parent.expires_at_ns
                    ),
                    parent_id,
                );
            }
        }

        require!(
            self.key_to_cap.get(&child.child_pk).is_none(),
            "INTENTRA: child key is already registered to a capability"
        );

        // ── Commit: reserve budget BEFORE the child exists (I2) ──
        let id = self.next_id;
        self.next_id += 1;
        {
            let parent = self.get_cap_mut(parent_id).unwrap();
            parent.allocated_children += max_total;
            parent.children.push(id);
        }
        let cap = Capability {
            id,
            parent: Some(parent_id),
            agent_account: child.child_account.clone(),
            agent_pk: child.child_pk.clone(),
            depth: parent.depth + 1,
            max_total,
            max_per_order,
            total_spent: 0,
            allocated_children: 0,
            recipients,
            can_transfer,
            can_delegate,
            expires_at_ns,
            revoked: false,
            children: vec![],
        };
        let (depth, mut chain) = (parent.depth + 1, self.chain_ids(parent_id));
        chain.insert(0, id);
        self.capabilities.insert(id, cap);
        self.key_to_cap.insert(child.child_pk.clone(), id);

        self.log_event(
            "capability_created",
            serde_json::json!({
                "capability_id": id,
                "parent_id": parent_id,
                "depth": depth,
                "agent_account": child.child_account,
                "max_total": max_total.to_string(),
                "max_per_order": max_per_order.to_string(),
                "chain": chain,
            }),
        );
        id
    }

    /// Agent initiates a payment from the vault. The vault transfers its own
    /// balance; the agent's key never carries spending power (I5).
    pub fn execute(&mut self, recipient: AccountId, amount: U128) {
        require!(env::attached_deposit().as_yoctonear() == 0, "INTENTRA: do not attach a deposit");
        let amount = amount.0;
        require!(amount > 0, "INTENTRA: amount must be positive");
        let cap = self.resolve_signer_capability();
        let cap_id = cap.id;
        let recipients = cap.recipients.clone();
        let can_transfer = cap.can_transfer;
        let max_per_order = cap.max_per_order;
        let max_total = cap.max_total;

        self.assert_chain_live(cap_id);

        if !can_transfer {
            self.reject_payment("ACTION_FORBIDDEN: capability is not allowed to transfer", cap_id);
        }
        if let Some(list) = &recipients {
            if !list.contains(&recipient) {
                self.reject_payment(
                    &format!("RECIPIENT_FORBIDDEN: {} is not in the capability's allowlist", recipient),
                    cap_id,
                );
            }
        }
        if amount > max_per_order {
            self.reject_payment(
                &format!(
                    "PER_ORDER_EXCEEDED: {} exceeds per-order limit {}",
                    amount, max_per_order
                ),
                cap_id,
            );
        }
        let headroom = max_total
            .saturating_sub(self.get_cap(cap_id).unwrap().total_spent)
            .saturating_sub(self.get_cap(cap_id).unwrap().allocated_children);
        if amount > headroom {
            self.reject_payment(
                &format!(
                    "BUDGET_EXCEEDED: {} exceeds remaining headroom {} (total budget reserved for children: {})",
                    amount,
                    headroom,
                    self.get_cap(cap_id).unwrap().allocated_children
                ),
                cap_id,
            );
        }

        // Debit first, transfer second; the callback refunds on failure.
        self.get_cap_mut(cap_id).unwrap().total_spent += amount;

        let token = NearToken::from_yoctonear(amount);
        let transfer = Promise::new(recipient.clone()).transfer(token);
        let _ = transfer.then(
            Self::ext(env::current_account_id())
                .with_static_gas(near_sdk::Gas::from_gas(CALLBACK_GAS))
                .on_transfer(cap_id, amount),
        );

        self.log_event(
            "transfer_initiated",
            serde_json::json!({
                "capability_id": cap_id,
                "recipient": recipient,
                "amount": amount.to_string(),
            }),
        );
    }

    /// Private callback: refunds budget if the transfer failed.
    #[private]
    pub fn on_transfer(&mut self, cap_id: u64, amount: u128) {
        match env::promise_result_checked(0, usize::MAX) {
            Ok(_) => {
                self.log_event(
                    "transfer_executed",
                    serde_json::json!({
                        "capability_id": cap_id,
                        "amount": amount.to_string(),
                    }),
                );
            }
            Err(_) => {
                if let Some(cap) = self.capabilities.get_mut(&cap_id) {
                    cap.total_spent = cap.total_spent.saturating_sub(amount);
                }
                self.log_event(
                    "transfer_failed_refunded",
                    serde_json::json!({
                        "capability_id": cap_id,
                        "amount": amount.to_string(),
                    }),
                );
            }
        }
    }

    // ─── Views ──────────────────────────────────────────────────────

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    /// Current block timestamp in ns — used by tests and the verifier.
    pub fn get_now(&self) -> u64 {
        env::block_timestamp()
    }

    pub fn get_capability(&self, cap_id: u64) -> CapabilityView {
        self.view_of(&self.get_cap(cap_id).unwrap_or_else(|| env::panic_str("capability not found")))
    }

    pub fn get_capability_by_key(&self, pk: PublicKey) -> Option<CapabilityView> {
        self.key_to_cap
            .get(&pk)
            .and_then(|id| self.capabilities.get(&id).cloned())
            .map(|c| self.view_of(&c))
    }

    /// Full delegation tree from a root, with liveness flags.
    pub fn get_tree(&self, root_id: u64) -> Vec<CapabilityView> {
        let mut out = vec![];
        let mut stack = vec![root_id];
        while let Some(id) = stack.pop() {
            if let Some(cap) = self.capabilities.get(&id).cloned() {
                stack.extend(cap.children.iter().copied());
                out.push(self.view_of(&cap));
            }
        }
        out
    }

    /// Aggregate spend actually paid out by an entire tree.
    pub fn get_tree_spend(&self, root_id: u64) -> U128 {
        self.get_tree(root_id)
            .iter()
            .map(|c| c.total_spent.0)
            .sum::<u128>()
            .into()
    }

    pub fn get_vault_balance(&self) -> U128 {
        env::account_balance().as_yoctonear().into()
    }

    // ─── Internal helpers ───────────────────────────────────────────

    fn resolve_signer_capability(&self) -> Capability {
        let pk = env::signer_account_pk();
        let cap_id = *self
            .key_to_cap
            .get(&pk)
            .unwrap_or_else(|| env::panic_str("INTENTRA: UNKNOWN_KEY: signing key is not registered to any capability"));
        self.get_cap(cap_id)
            .unwrap_or_else(|| env::panic_str("INTENTRA: registered key points to missing capability"))
    }

    /// Walk to the root asserting no ancestor is revoked or expired (I4).
    fn assert_chain_live(&self, mut cap_id: u64) {
        loop {
            let cap = self.get_cap(cap_id).unwrap();
            if cap.revoked {
                env::panic_str(&format!("INTENTRA: REVOKED_CHAIN: capability {} in the authority chain is revoked", cap_id));
            }
            if cap.expires_at_ns != 0 && env::block_timestamp() >= cap.expires_at_ns {
                env::panic_str(&format!("INTENTRA: EXPIRED: capability {} in the authority chain has expired", cap_id));
            }
            match cap.parent {
                Some(p) => cap_id = p,
                None => break,
            }
        }
    }

    /// Recursively marks a subtree revoked, deletes key registrations, and
    /// returns the budget released to the caller's parent (post-order so a
    /// node's released amount accounts for what its revoked descendants left).
    fn revoke_subtree(&mut self, node_id: u64) -> u128 {
        let (has_parent, children, max_total, total_spent, mut allocated) = {
            let cap = self.get_cap(node_id).unwrap();
            (
                cap.parent.is_some(),
                cap.children.clone(),
                cap.max_total,
                cap.total_spent,
                cap.allocated_children,
            )
        };
        let was_revoked = self.get_cap(node_id).map(|c| c.revoked).unwrap_or(false);
        for child_id in children {
            let released = self.revoke_subtree(child_id);
            allocated = allocated.saturating_sub(released);
        }
        {
            let cap = self.get_cap_mut(node_id).unwrap();
            cap.revoked = true;
            cap.allocated_children = allocated;
        }
        // Key bindings are intentionally RETAINED: a revoked capability's key
        // stays registered, so every attempt answers with the state-authoritative
        // REVOKED_CHAIN panic instead of an ambiguous UNKNOWN_KEY. No authority
        // leaks — every entrypoint checks liveness before acting.
        if !was_revoked && has_parent {
            self.log_event(
                "descendant_invalidated",
                serde_json::json!({ "capability_id": node_id }),
            );
        }
        // Released to parent = this node's unspent, unreserved budget.
        max_total.saturating_sub(total_spent).saturating_sub(allocated)
    }

    // `last_revoked_root` is a transient marker set in revoke(); declared here
    // for clarity of revoke_subtree's event logic.
    // NOTE: implemented as a local flag via the field below.

    fn reject_delegation(&self, reason: &str, parent_id: u64) {
        self.log_event(
            "delegation_rejected",
            serde_json::json!({ "parent_id": parent_id, "reason": reason }),
        );
        env::panic_str(&format!("INTENTRA: {}", reason));
    }

    fn reject_payment(&self, reason: &str, cap_id: u64) {
        self.log_event(
            "payment_rejected",
            serde_json::json!({ "capability_id": cap_id, "reason": reason }),
        );
        env::panic_str(&format!("INTENTRA: {}", reason));
    }

    fn assert_unique_accounts(&self, list: &[AccountId], field: &str) {
        let mut seen = std::collections::HashSet::new();
        for acct in list {
            if !seen.insert(acct.clone()) {
                env::panic_str(&format!("INTENTRA: duplicate account in {}", field));
            }
        }
    }

    fn chain_ids(&self, mut cap_id: u64) -> Vec<u64> {
        let mut chain = vec![cap_id];
        while let Some(cap) = self.get_cap(cap_id) {
            match cap.parent {
                Some(p) => {
                    chain.push(p);
                    cap_id = p;
                }
                None => break,
            }
        }
        chain
    }

    fn get_cap(&self, id: u64) -> Option<Capability> {
        self.capabilities.get(&id).cloned()
    }

    fn get_cap_mut(&mut self, id: u64) -> Option<&mut Capability> {
        self.capabilities.get_mut(&id)
    }

    fn view_of(&self, cap: &Capability) -> CapabilityView {
        let headroom = cap
            .max_total
            .saturating_sub(cap.total_spent)
            .saturating_sub(cap.allocated_children);
        CapabilityView {
            id: cap.id,
            parent: cap.parent,
            agent_account: cap.agent_account.clone(),
            agent_pk: cap.agent_pk.to_string(),
            depth: cap.depth,
            max_total: cap.max_total.into(),
            max_per_order: cap.max_per_order.into(),
            total_spent: cap.total_spent.into(),
            allocated_children: cap.allocated_children.into(),
            headroom: headroom.into(),
            recipients: cap.recipients.clone(),
            can_transfer: cap.can_transfer,
            can_delegate: cap.can_delegate,
            expires_at_ns: cap.expires_at_ns,
            expired: cap.expires_at_ns != 0 && env::block_timestamp() >= cap.expires_at_ns,
            revoked: cap.revoked,
            children: cap.children.clone(),
        }
    }

    fn log_event(&self, event: &str, data: serde_json::Value) {
        let log = serde_json::json!({
            "standard": "intentra",
            "version": "1.0.0",
            "event": event,
            "data": data,
        });
        env::log_str(&format!("EVENT_JSON:{}", log));
    }
}
