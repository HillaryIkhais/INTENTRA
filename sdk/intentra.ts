// INTENTRA TypeScript SDK — NEAR contract binding
//
// The contract resolves authority exclusively from env::signer_account_pk(),
// so every change call must be signed by the account whose function-call key
// is registered to the capability.
//
// Usage:
//
//   const near = await connect({ keyStore, nodeUrl: "https://rpc.testnet.near.org", ... })
//   const intentra = new Intentra(near, "intentra-vault.testnet")
//   await intentra.with(ownerAccount).issueRoot({...})
//   await intentra.with(agentA).delegate({...})
//   await intentra.with(agentB).execute("vendor.testnet", "100000000000000000000000")

import {
  connect,
  Contract,
  Account,
  keyStores,
} from "near-api-js";

export type CapabilityView = {
  id: number;
  parent: number | null;
  agent_account: string;
  agent_pk: string;
  depth: number;
  max_total: string;
  max_per_order: string;
  total_spent: string;
  allocated_children: string;
  headroom: string;
  recipients: string[] | null;
  can_transfer: boolean;
  can_delegate: boolean;
  expires_at_ns: number;
  expired: boolean;
  revoked: boolean;
  children: number[];
};

export type RootGrant = {
  agent_account: string;
  agent_pk: string;
  max_total: string;
  max_per_order: string;
  recipients?: string[] | null;
  can_transfer: boolean;
  can_delegate: boolean;
  expires_at_ns?: number | null;
};

export type Delegation = {
  child_account: string;
  child_pk: string;
  max_total: string;
  max_per_order: string;
  recipients?: string[] | null;
  can_transfer?: boolean | null;
  can_delegate?: boolean | null;
  expires_at_ns?: number | null;
};

const NEAR = 1_000_000_000_000_000_000_000_000;

export function yocto(near: number): string {
  return (near * NEAR).toString();
}

export function fromYocto(yoctoStr: string): number {
  return Number(yoctoStr) / NEAR;
}

export class Intentra {
  private near: Awaited<ReturnType<typeof connect>>;
  private contractId: string;

  constructor(nearConnection: Awaited<ReturnType<typeof connect>>, contractId: string) {
    this.near = nearConnection;
    this.contractId = contractId;
  }

  /** Bind all calls to a specific account (whose key must be registered). */
  with(accountId: string): IntentraSession {
    return new IntentraSession(this.near, this.contractId, accountId);
  }

  // ─── Account-agnostic views (no signing needed) ───────────────

  async getOwner(): Promise<string> {
    const near = this.near;
    const accountId = near.accountId() as string;
    const contract = new Contract(near, this.contractId, {
      viewMethods: ["get_owner"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_owner({}) as Promise<string>;
  }

  async getCapability(capId: number): Promise<CapabilityView> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_capability"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_capability({ cap_id: capId }) as Promise<CapabilityView>;
  }

  async getCapabilityByKey(publicKey: string): Promise<CapabilityView | null> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_capability_by_key"],
      changeMethods: [],
      sender: accountId,
    });
    return (await contract.get_capability_by_key({ pk: publicKey })) ?? null;
  }

  async getTree(rootId: number): Promise<CapabilityView[]> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_tree"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_tree({ root_id: rootId }) as Promise<CapabilityView[]>;
  }

  async getTreeSpend(rootId: number): Promise<string> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_tree_spend"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_tree_spend({ root_id: rootId }) as Promise<string>;
  }

  async getVaultBalance(): Promise<string> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_vault_balance"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_vault_balance({}) as Promise<string>;
  }

  async getNow(): Promise<number> {
    const accountId = this.near.accountId() as string;
    const contract = new Contract(this.near, this.contractId, {
      viewMethods: ["get_now"],
      changeMethods: [],
      sender: accountId,
    });
    return contract.get_now({}) as Promise<number>;
  }
}

export class IntentraSession {
  private contract: Contract;

  constructor(
    near: Awaited<ReturnType<typeof connect>>,
    contractId: string,
    accountId: string
  ) {
    this.contract = new Contract(near, contractId, {
      viewMethods: [],
      changeMethods: [
        "issue_root",
        "delegate",
        "execute",
        "revoke",
      ],
      sender: accountId,
    });
  }

  async issueRoot(grant: RootGrant, gas?: string): Promise<number> {
    const result = await this.contract.issue_root(
      { grant },
      gas ? { gas } : undefined
    );
    return Number(result);
  }

  async delegate(child: Delegation, gas?: string): Promise<number> {
    const result = await this.contract.delegate(
      { child },
      gas ? { gas } : undefined
    );
    return Number(result);
  }

  async execute(recipient: string, amountYocto: string, gas?: string): Promise<void> {
    await this.contract.execute(
      { recipient, amount: amountYocto },
      gas ? { gas } : undefined
    );
  }

  async revoke(capId: number, reason: string): Promise<void> {
    await this.contract.revoke({ cap_id: capId, reason });
  }
}

/** Create a function-call key on `agentAccount` restricted to INTENTRA. */
export async function addFunctionCallKey({
  agentAccount,
  publicKey,
  contractId,
  allowanceYocto,
}: {
  agentAccount: Account;
  publicKey: string;
  contractId: string;
  allowanceYocto: string;
}): Promise<void> {
  await agentAccount.addKey(
    publicKey,
    contractId,
    ["execute", "delegate"],
    allowanceYocto
  );
}
