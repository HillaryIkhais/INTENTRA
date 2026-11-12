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
  keyStores,
  transactions,
  utils,
  Account,
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

const GAS = "200000000000000"; // 200 TGas
const DEPOSIT = "0";

/** Parse a u64 return value (near-api-js returns it as a string/number). */
function toNumber(value: unknown): number {
  return Number(String(value));
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

  private async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    // near-api-js v3's QueryResponseKind is a discriminated union; the runtime
    // always returns { result, ... } for a successful call_function query.
    const res: any = await this.near.connection.provider.query({
      request_type: "call_function",
      account_id: this.contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "final",
    });
    return JSON.parse(Buffer.from(res.result).toString()) as T;
  }

  async getOwner(): Promise<string> {
    return this.view<string>("get_owner");
  }

  async getCapability(capId: number): Promise<CapabilityView> {
    return this.view<CapabilityView>("get_capability", { cap_id: capId });
  }

  async getCapabilityByKey(publicKey: string): Promise<CapabilityView | null> {
    try {
      return await this.view<CapabilityView>("get_capability_by_key", { pk: publicKey });
    } catch {
      return null;
    }
  }

  async getTree(rootId: number): Promise<CapabilityView[]> {
    return this.view<CapabilityView[]>("get_tree", { root_id: rootId });
  }

  async getTreeSpend(rootId: number): Promise<string> {
    return this.view<string>("get_tree_spend", { root_id: rootId });
  }

  async getVaultBalance(): Promise<string> {
    return this.view<string>("get_vault_balance");
  }

  async getNow(): Promise<number> {
    return this.view<number>("get_now");
  }
}

export class IntentraSession {
  private near: Awaited<ReturnType<typeof connect>>;
  private contractId: string;
  private accountId: string;

  constructor(
    near: Awaited<ReturnType<typeof connect>>,
    contractId: string,
    accountId: string
  ) {
    this.near = near;
    this.contractId = contractId;
    this.accountId = accountId;
  }

  private async account(): Promise<Account> {
    return this.near.account(this.accountId);
  }

  private async change(method: string, args: Record<string, unknown>): Promise<unknown> {
    const acct = await this.account();
    const outcome = await acct.signAndSendTransaction({
      receiverId: this.contractId,
      actions: [transactions.functionCall(method, args, GAS, DEPOSIT)],
      returnError: true,
    });
    const failure =
      outcome.status &&
      typeof outcome.status === "object" &&
      (outcome.status as { Failure?: unknown }).Failure
        ? (outcome.status as { Failure: unknown }).Failure
        : null;
    if (failure) {
      throw new Error(`INTENTRA call ${method} failed: ${JSON.stringify(failure)}`);
    }
    return null;
  }

  async issueRoot(grant: RootGrant, gas?: string): Promise<number> {
    // issue_root returns a u64 capability id; read it from the last receipt.
    const acct = await this.account();
    const outcome = await acct.signAndSendTransaction({
      receiverId: this.contractId,
      actions: [transactions.functionCall("issue_root", { grant }, gas || GAS, DEPOSIT)],
      returnError: true,
    });
    const failure =
      outcome.status &&
      typeof outcome.status === "object" &&
      (outcome.status as { Failure?: unknown }).Failure
        ? (outcome.status as { Failure: unknown }).Failure
        : null;
    if (failure) {
      throw new Error(`issue_root failed: ${JSON.stringify(failure)}`);
    }
    // Scan receipt outcomes for the u64 return value (new capability id).
    const status: any = outcome.status;
    let value: string | null = null;
    if (status && typeof status.SuccessValue === "string") {
      value = Buffer.from(status.SuccessValue, "base64").toString() || value;
    }
    for (const r of outcome.receipts_outcome || []) {
      const rstatus: any = r.outcome.status;
      if (rstatus && typeof rstatus.SuccessValue === "string") {
        const v = Buffer.from(rstatus.SuccessValue, "base64").toString();
        if (v) value = v;
      }
    }
    if (value === null || value === "") {
      throw new Error("issue_root returned no capability id");
    }
    return toNumber(value);
  }

  async delegate(child: Delegation, gas?: string): Promise<number> {
    const acct = await this.account();
    const outcome = await acct.signAndSendTransaction({
      receiverId: this.contractId,
      actions: [transactions.functionCall("delegate", { child }, gas || GAS, DEPOSIT)],
      returnError: true,
    });
    const failure =
      outcome.status &&
      typeof outcome.status === "object" &&
      (outcome.status as { Failure?: unknown }).Failure
        ? (outcome.status as { Failure: unknown }).Failure
        : null;
    if (failure) {
      throw new Error(`delegate failed: ${JSON.stringify(failure)}`);
    }
    // Scan receipt outcomes for the u64 return value (new capability id).
    const status: any = outcome.status;
    let value: string | null = null;
    if (status && typeof status.SuccessValue === "string") {
      value = Buffer.from(status.SuccessValue, "base64").toString() || value;
    }
    for (const r of outcome.receipts_outcome || []) {
      const rstatus: any = r.outcome.status;
      if (rstatus && typeof rstatus.SuccessValue === "string") {
        const v = Buffer.from(rstatus.SuccessValue, "base64").toString();
        if (v) value = v;
      }
    }
    if (value === null || value === "") {
      throw new Error("delegate returned no capability id");
    }
    return toNumber(value);
  }

  async execute(recipient: string, amountYocto: string, gas?: string): Promise<void> {
    await this.change("execute", { recipient, amount: amountYocto });
  }

  async revoke(capId: number, reason: string): Promise<void> {
    await this.change("revoke", { cap_id: capId, reason });
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
