/**
 * INTENTRA NEAR SDK.
 *
 * Every method maps to a real method on the INTENTRA NEAR contract. There is no
 * mock mode in this package: pass a secret key to send transactions, or connect
 * read-only to inspect capabilities and lineage.
 */
import { connect, keyStores, KeyPair, transactions, utils } from "near-api-js";

export const DEFAULT_NETWORK = "testnet";
export const DEFAULT_RPC = "https://rpc.testnet.fastnear.com";
export const DEFAULT_GAS = 150_000_000_000_000n;

export type Amount = string | number | bigint;

export type ErrorCode =
  | "UNAUTHORIZED_SIGNER"
  | "AUTHORITY_ESCALATION"
  | "BUDGET_RESERVATION"
  | "INSUFFICIENT_BUDGET"
  | "VAULT_EXHAUSTED"
  | "DEPTH_EXCEEDED"
  | "EXPIRED"
  | "REVOKED_LINEAGE"
  | "POLICY_VIOLATION"
  | "REPLAY"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "EXECUTION_FAILED"
  | "RPC_ERROR";

export class IntentraError extends Error {
  readonly code: ErrorCode;
  readonly raw?: string;
  readonly txHash?: string;

  constructor(code: ErrorCode, message: string, raw?: string, txHash?: string) {
    super(message);
    this.name = "IntentraError";
    this.code = code;
    this.raw = raw;
    this.txHash = txHash;
  }
}

export interface CapabilityView {
  id: number;
  parent_id: number | null;
  root_id: number;
  agent_id: string;
  depth: number;
  max_total: string;
  max_per_action: string;
  total_spent: string;
  total_allocated: string;
  remaining: string;
  allowed_actions: string[];
  allowed_assets: string[];
  prohibited_actions: string[];
  allowed_recipients: string[] | null;
  can_delegate: boolean;
  expires_at_ns: number | null;
  revoked: boolean;
  revocation_reason: string | null;
  created_at_ns: number;
}

export interface ExecutionView {
  id: number;
  capability_id: number;
  agent_id: string;
  recipient: string;
  amount: string;
  request_id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  created_at_ns: number;
}

export interface StatsView {
  owner: string;
  capability_count: number;
  execution_count: number;
  treasury_balance: string;
  /** Aggregate unspent authority reserved by live roots, in yoctoNEAR. */
  vault_committed: string;
  /** Vault balance usable for transfers (balance minus storage stake). */
  vault_liquid: string;
  /** `vault_liquid - vault_committed`, saturating at zero. */
  vault_available: string;
  live_roots: number;
  total_roots: number;
}

export interface VaultView {
  committed: string;
  liquid: string;
  available: string;
  live_roots: number;
  total_roots: number;
}

export interface TxResult {
  ok: boolean;
  txHash: string;
  status: string;
  error?: string;
  errorCode?: ErrorCode;
  logs: string[];
  events: Array<Record<string, unknown>>;
  raw: unknown;
}

export interface IntentraClientOptions {
  contractId: string;
  accountId?: string;
  secretKey?: string;
  networkId?: string;
  nodeUrl?: string;
}

export interface GrantRootParams {
  agentId: string;
  maxTotal: Amount;
  maxPerAction: Amount;
  allowedActions?: string[];
  allowedAssets?: string[];
  prohibitedActions?: string[];
  allowedRecipients?: string[] | null;
  canDelegate?: boolean;
  expiresAtNs?: number | null;
}

export interface DelegateParams {
  childAgentId: string;
  maxTotal: Amount;
  maxPerAction: Amount;
  allowedActions?: string[];
  allowedAssets?: string[];
  prohibitedActions?: string[];
  allowedRecipients?: string[] | null;
  canDelegate?: boolean;
  expiresAtNs?: number | null;
}

export interface ExecuteParams {
  amount: Amount;
  recipient: string;
  requestId?: string;
}

export function toYocto(amount: Amount): string {
  if (typeof amount === "bigint") {
    if (amount <= 0n) throw new IntentraError("INVALID_REQUEST", "amount must be positive");
    return amount.toString();
  }
  const text = String(amount);
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new IntentraError("INVALID_REQUEST", `invalid NEAR amount: ${text}`);
  }
  const [whole, fraction = ""] = text.split(".");
  if (fraction.length > 24) {
    throw new IntentraError("INVALID_REQUEST", `too many decimal places: ${text}`);
  }
  const yocto = BigInt(whole) * 10n ** 24n + BigInt((fraction + "0".repeat(24)).slice(0, 24));
  if (yocto <= 0n) throw new IntentraError("INVALID_REQUEST", "amount must be positive");
  return yocto.toString();
}

/**
 * Verifies the contract-reported conservation invariant for one capability:
 * `total_spent + total_allocated <= max_total`.
 *
 * This is a read-only audit helper. It never authorizes anything locally; the
 * contract remains the only enforcement point.
 */
export function verifyCapabilityConservation(capability: CapabilityView): {
  ok: boolean;
  spent: string;
  allocated: string;
  maxTotal: string;
  headroom: string;
} {
  const spent = BigInt(capability.total_spent);
  const allocated = BigInt(capability.total_allocated);
  const maxTotal = BigInt(capability.max_total);
  const committed = spent + allocated;
  return {
    ok: committed <= maxTotal,
    spent: spent.toString(),
    allocated: allocated.toString(),
    maxTotal: maxTotal.toString(),
    headroom: (maxTotal > committed ? maxTotal - committed : 0n).toString(),
  };
}

export function classifyError(text: string | undefined): ErrorCode {
  const value = text || "";
  if (value.includes("UNAUTHORIZED")) return "UNAUTHORIZED_SIGNER";
  if (value.includes("ATTENUATION")) return "AUTHORITY_ESCALATION";
  if (value.includes("BUDGET_RESERVATION")) return "BUDGET_RESERVATION";
  if (value.includes("VAULT")) return "VAULT_EXHAUSTED";
  if (value.includes("DEPTH")) return "DEPTH_EXCEEDED";
  if (value.includes("EXPIRED")) return "EXPIRED";
  if (value.includes("REVOKED")) return "REVOKED_LINEAGE";
  if (value.includes("POLICY")) return "POLICY_VIOLATION";
  if (value.includes("LIMIT")) return "INSUFFICIENT_BUDGET";
  if (value.includes("REPLAY")) return "REPLAY";
  if (value.includes("INVALID")) return "INVALID_REQUEST";
  if (value.includes("UNKNOWN")) return "NOT_FOUND";
  if (value.includes("RPC")) return "RPC_ERROR";
  return "EXECUTION_FAILED";
}

function parseEvents(logs: string[]): Array<Record<string, unknown>> {
  return logs
    .filter((line) => line.startsWith("EVENT_JSON:"))
    .map((line) => {
      try {
        return JSON.parse(line.slice("EVENT_JSON:".length));
      } catch {
        return { raw: line };
      }
    });
}

function collectLogs(outcome: any): string[] {
  const logs: string[] = [];
  for (const receipt of (outcome && outcome.receipts_outcome) || []) {
    logs.push(...((receipt.outcome && receipt.outcome.logs) || []));
  }
  return logs;
}

function failureOf(outcome: any): string | undefined {
  const failure = outcome && outcome.status && outcome.status.Failure;
  if (!failure) return undefined;
  const kind = failure.ActionError && failure.ActionError.kind;
  if (kind) {
    if (kind.ExecutionError !== undefined) return String(kind.ExecutionError);
    return JSON.stringify(kind);
  }
  return JSON.stringify(failure);
}

export class IntentraNearClient {
  readonly contractId: string;
  readonly networkId: string;
  readonly nodeUrl: string;
  readonly accountId?: string;
  readonly readOnly: boolean;
  private account: any;

  private constructor(options: IntentraClientOptions, account: any) {
    this.contractId = options.contractId;
    this.networkId = options.networkId || DEFAULT_NETWORK;
    this.nodeUrl = options.nodeUrl || DEFAULT_RPC;
    this.accountId = options.accountId;
    this.readOnly = !options.secretKey;
    this.account = account;
  }

  static async connect(options: IntentraClientOptions): Promise<IntentraNearClient> {
    if (!options.contractId) throw new IntentraError("INVALID_REQUEST", "contractId is required");
    const keyStore: any = new keyStores.InMemoryKeyStore();
    if (options.secretKey) {
      if (!options.accountId) {
        throw new IntentraError("INVALID_REQUEST", "accountId is required with secretKey");
      }
      await keyStore.setKey(
        options.networkId || DEFAULT_NETWORK,
        options.accountId,
        KeyPair.fromString(options.secretKey as any)
      );
    }
    const near: any = await connect({
      networkId: options.networkId || DEFAULT_NETWORK,
      nodeUrl: options.nodeUrl || DEFAULT_RPC,
      keyStore,
    });
    const account = await near.account(options.accountId || options.contractId);
    return new IntentraNearClient(options, account);
  }

  private assertSigner(): void {
    if (this.readOnly) {
      throw new IntentraError("UNAUTHORIZED_SIGNER", "client is read-only; provide a secretKey");
    }
  }

  private async send(methodName: string, args: Record<string, unknown>, deposit = 0n): Promise<TxResult> {
    this.assertSigner();
    // near-api-js caches access-key nonces on the Account instance.
    this.account.accessKeyByPublicKeyCache = {};
    const [hashBytes, signed] = await this.account.signTransaction(this.contractId, [
      transactions.functionCall(methodName, args, DEFAULT_GAS, deposit),
    ]);
    const txHash = utils.serialize.base_encode(hashBytes);
    let outcome: any;
    try {
      outcome = await this.account.connection.provider.sendTransaction(signed);
    } catch (error: any) {
      const message = error && (error.message || String(error));
      return {
        ok: false,
        txHash,
        status: "RPC_ERROR",
        error: message,
        errorCode: classifyError(message),
        logs: [],
        events: [],
        raw: error,
      };
    }
    const logs = collectLogs(outcome);
    const error = failureOf(outcome);
    const ok = outcome.status && outcome.status.SuccessValue !== undefined && !error;
    return {
      ok: Boolean(ok),
      txHash,
      status: ok ? "SUCCESS" : "FAILURE",
      error,
      errorCode: error ? classifyError(error) : undefined,
      logs,
      events: parseEvents(logs),
      raw: outcome,
    };
  }

  async deposit(amount: Amount): Promise<TxResult> {
    return this.send("deposit", {}, BigInt(toYocto(amount)));
  }

  async grantRoot(params: GrantRootParams): Promise<{ capabilityId: number; tx: TxResult }> {
    const tx = await this.send("grant_root", {
      agent_id: params.agentId,
      max_total: toYocto(params.maxTotal),
      max_per_action: toYocto(params.maxPerAction),
      allowed_actions: params.allowedActions || ["transfer"],
      allowed_assets: params.allowedAssets || ["NEAR"],
      prohibited_actions: params.prohibitedActions || [],
      allowed_recipients: params.allowedRecipients ?? null,
      can_delegate: Boolean(params.canDelegate),
      expires_at_ns: params.expiresAtNs ?? null,
    });
    return { capabilityId: this.eventCapabilityId(tx), tx };
  }

  async delegate(parentId: number, params: DelegateParams): Promise<{ capabilityId: number; tx: TxResult }> {
    const tx = await this.send("delegate", {
      parent_id: parentId,
      child_agent_id: params.childAgentId,
      max_total: toYocto(params.maxTotal),
      max_per_action: toYocto(params.maxPerAction),
      allowed_actions: params.allowedActions || ["transfer"],
      allowed_assets: params.allowedAssets || ["NEAR"],
      prohibited_actions: params.prohibitedActions || [],
      allowed_recipients: params.allowedRecipients ?? null,
      can_delegate: Boolean(params.canDelegate),
      expires_at_ns: params.expiresAtNs ?? null,
    });
    return { capabilityId: this.eventCapabilityId(tx), tx };
  }

  async executeTransfer(capabilityId: number, params: ExecuteParams): Promise<{ executionId?: number; tx: TxResult }> {
    const requestId = params.requestId || `intentra-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const tx = await this.send("execute_transfer", {
      capability_id: capabilityId,
      amount: toYocto(params.amount),
      recipient: params.recipient,
      request_id: requestId,
    });
    const event = tx.events.find((entry: any) => entry.event === "execute") as any;
    return { executionId: event && event.data ? Number(event.data.execution_id) : undefined, tx };
  }

  async revoke(capabilityId: number, reason: string): Promise<TxResult> {
    return this.send("revoke", { capability_id: capabilityId, reason });
  }

  async getCapability(capabilityId: number): Promise<CapabilityView | null> {
    return this.view("get_capability", { capability_id: capabilityId });
  }

  async getLineage(capabilityId: number): Promise<CapabilityView[]> {
    return this.view("get_lineage", { capability_id: capabilityId });
  }

  async isUsable(capabilityId: number): Promise<boolean> {
    return this.view("is_usable", { capability_id: capabilityId });
  }

  async getExecution(executionId: number): Promise<ExecutionView | null> {
    return this.view("get_execution", { execution_id: executionId });
  }

  async getExecutions(capabilityId: number): Promise<ExecutionView[]> {
    return this.view("get_executions", { capability_id: capabilityId });
  }

  async getStats(): Promise<StatsView> {
    return this.view("get_stats", {});
  }

  /** Direct children of a capability, for walking the delegation tree. */
  async getChildren(parentId: number): Promise<CapabilityView[]> {
    return this.view("get_children", { parent_id: parentId });
  }

  /** Global vault accounting: committed, liquid and available authority. */
  async getVault(): Promise<VaultView> {
    return this.view("get_vault", {});
  }

  private async view<T>(methodName: string, args: Record<string, unknown>): Promise<T> {
    return this.account.viewFunction({
      contractId: this.contractId,
      methodName,
      args,
    }) as Promise<T>;
  }

  private eventCapabilityId(tx: TxResult): number {
    if (!tx.ok) {
      throw new IntentraError(tx.errorCode || "EXECUTION_FAILED", tx.error || "transaction failed", tx.error, tx.txHash);
    }
    const event = tx.events.find((entry: any) => entry.event === "grant" || entry.event === "delegate") as any;
    if (!event || !event.data) {
      throw new IntentraError("EXECUTION_FAILED", "contract did not emit a capability event", undefined, tx.txHash);
    }
    return Number(event.data.capability_id);
  }
}

/**
 * A developer-facing handle to one capability in the delegation hierarchy.
 */
export class IntentraSession {
  readonly client: IntentraNearClient;
  readonly capabilityId: number;

  constructor(client: IntentraNearClient, capabilityId: number) {
    this.client = client;
    this.capabilityId = capabilityId;
  }

  static async open(client: IntentraNearClient, capabilityId: number): Promise<IntentraSession> {
    const capability = await client.getCapability(capabilityId);
    if (!capability) {
      throw new IntentraError("NOT_FOUND", `capability ${capabilityId} does not exist`);
    }
    return new IntentraSession(client, capabilityId);
  }

  capability(): Promise<CapabilityView | null> {
    return this.client.getCapability(this.capabilityId);
  }

  lineage(): Promise<CapabilityView[]> {
    return this.client.getLineage(this.capabilityId);
  }

  children(): Promise<CapabilityView[]> {
    return this.client.getChildren(this.capabilityId);
  }

  execute(params: ExecuteParams): Promise<{ executionId?: number; tx: TxResult }> {
    return this.client.executeTransfer(this.capabilityId, params);
  }

  delegate(params: DelegateParams): Promise<{ capabilityId: number; tx: TxResult }> {
    return this.client.delegate(this.capabilityId, params);
  }

  revoke(reason: string): Promise<TxResult> {
    return this.client.revoke(this.capabilityId, reason);
  }
}
