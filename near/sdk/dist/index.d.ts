export declare const DEFAULT_NETWORK = "testnet";
export declare const DEFAULT_RPC = "https://rpc.testnet.fastnear.com";
export declare const DEFAULT_GAS = 150000000000000n;
export type Amount = string | number | bigint;
export type ErrorCode = "UNAUTHORIZED_SIGNER" | "AUTHORITY_ESCALATION" | "BUDGET_RESERVATION" | "INSUFFICIENT_BUDGET" | "EXPIRED" | "REVOKED_LINEAGE" | "POLICY_VIOLATION" | "REPLAY" | "INVALID_REQUEST" | "NOT_FOUND" | "EXECUTION_FAILED" | "RPC_ERROR";
export declare class IntentraError extends Error {
    readonly code: ErrorCode;
    readonly raw?: string;
    readonly txHash?: string;
    constructor(code: ErrorCode, message: string, raw?: string, txHash?: string);
}
export interface CapabilityView {
    id: number;
    parent_id: number | null;
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
export declare function toYocto(amount: Amount): string;
export declare function classifyError(text: string | undefined): ErrorCode;
export declare class IntentraNearClient {
    readonly contractId: string;
    readonly networkId: string;
    readonly nodeUrl: string;
    readonly accountId?: string;
    readonly readOnly: boolean;
    private account;
    private constructor();
    static connect(options: IntentraClientOptions): Promise<IntentraNearClient>;
    private assertSigner;
    private send;
    deposit(amount: Amount): Promise<TxResult>;
    grantRoot(params: GrantRootParams): Promise<{
        capabilityId: number;
        tx: TxResult;
    }>;
    delegate(parentId: number, params: DelegateParams): Promise<{
        capabilityId: number;
        tx: TxResult;
    }>;
    executeTransfer(capabilityId: number, params: ExecuteParams): Promise<{
        executionId?: number;
        tx: TxResult;
    }>;
    revoke(capabilityId: number, reason: string): Promise<TxResult>;
    getCapability(capabilityId: number): Promise<CapabilityView | null>;
    getLineage(capabilityId: number): Promise<CapabilityView[]>;
    isUsable(capabilityId: number): Promise<boolean>;
    getExecution(executionId: number): Promise<ExecutionView | null>;
    getExecutions(capabilityId: number): Promise<ExecutionView[]>;
    getStats(): Promise<StatsView>;
    private view;
    private eventCapabilityId;
}
/**
 * A developer-facing handle to one capability in the delegation hierarchy.
 */
export declare class IntentraSession {
    readonly client: IntentraNearClient;
    readonly capabilityId: number;
    constructor(client: IntentraNearClient, capabilityId: number);
    static open(client: IntentraNearClient, capabilityId: number): Promise<IntentraSession>;
    capability(): Promise<CapabilityView | null>;
    lineage(): Promise<CapabilityView[]>;
    execute(params: ExecuteParams): Promise<{
        executionId?: number;
        tx: TxResult;
    }>;
    delegate(params: DelegateParams): Promise<{
        capabilityId: number;
        tx: TxResult;
    }>;
    revoke(reason: string): Promise<TxResult>;
}
