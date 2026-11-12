"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentraSession = exports.IntentraNearClient = exports.IntentraError = exports.DEFAULT_GAS = exports.DEFAULT_RPC = exports.DEFAULT_NETWORK = void 0;
exports.toYocto = toYocto;
exports.classifyError = classifyError;
/**
 * INTENTRA NEAR SDK.
 *
 * Every method maps to a real method on the INTENTRA NEAR contract. There is no
 * mock mode in this package: pass a secret key to send transactions, or connect
 * read-only to inspect capabilities and lineage.
 */
const near_api_js_1 = require("near-api-js");
exports.DEFAULT_NETWORK = "testnet";
exports.DEFAULT_RPC = "https://rpc.testnet.fastnear.com";
exports.DEFAULT_GAS = 150000000000000n;
class IntentraError extends Error {
    constructor(code, message, raw, txHash) {
        super(message);
        this.name = "IntentraError";
        this.code = code;
        this.raw = raw;
        this.txHash = txHash;
    }
}
exports.IntentraError = IntentraError;
function toYocto(amount) {
    if (typeof amount === "bigint") {
        if (amount <= 0n)
            throw new IntentraError("INVALID_REQUEST", "amount must be positive");
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
    if (yocto <= 0n)
        throw new IntentraError("INVALID_REQUEST", "amount must be positive");
    return yocto.toString();
}
function classifyError(text) {
    const value = text || "";
    if (value.includes("UNAUTHORIZED"))
        return "UNAUTHORIZED_SIGNER";
    if (value.includes("ATTENUATION"))
        return "AUTHORITY_ESCALATION";
    if (value.includes("BUDGET_RESERVATION"))
        return "BUDGET_RESERVATION";
    if (value.includes("EXPIRED"))
        return "EXPIRED";
    if (value.includes("REVOKED"))
        return "REVOKED_LINEAGE";
    if (value.includes("POLICY"))
        return "POLICY_VIOLATION";
    if (value.includes("LIMIT"))
        return "INSUFFICIENT_BUDGET";
    if (value.includes("REPLAY"))
        return "REPLAY";
    if (value.includes("INVALID"))
        return "INVALID_REQUEST";
    if (value.includes("UNKNOWN"))
        return "NOT_FOUND";
    if (value.includes("RPC"))
        return "RPC_ERROR";
    return "EXECUTION_FAILED";
}
function parseEvents(logs) {
    return logs
        .filter((line) => line.startsWith("EVENT_JSON:"))
        .map((line) => {
        try {
            return JSON.parse(line.slice("EVENT_JSON:".length));
        }
        catch {
            return { raw: line };
        }
    });
}
function collectLogs(outcome) {
    const logs = [];
    for (const receipt of (outcome && outcome.receipts_outcome) || []) {
        logs.push(...((receipt.outcome && receipt.outcome.logs) || []));
    }
    return logs;
}
function failureOf(outcome) {
    const failure = outcome && outcome.status && outcome.status.Failure;
    if (!failure)
        return undefined;
    const kind = failure.ActionError && failure.ActionError.kind;
    if (kind) {
        if (kind.ExecutionError !== undefined)
            return String(kind.ExecutionError);
        return JSON.stringify(kind);
    }
    return JSON.stringify(failure);
}
class IntentraNearClient {
    constructor(options, account) {
        this.contractId = options.contractId;
        this.networkId = options.networkId || exports.DEFAULT_NETWORK;
        this.nodeUrl = options.nodeUrl || exports.DEFAULT_RPC;
        this.accountId = options.accountId;
        this.readOnly = !options.secretKey;
        this.account = account;
    }
    static async connect(options) {
        if (!options.contractId)
            throw new IntentraError("INVALID_REQUEST", "contractId is required");
        const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
        if (options.secretKey) {
            if (!options.accountId) {
                throw new IntentraError("INVALID_REQUEST", "accountId is required with secretKey");
            }
            await keyStore.setKey(options.networkId || exports.DEFAULT_NETWORK, options.accountId, near_api_js_1.KeyPair.fromString(options.secretKey));
        }
        const near = await (0, near_api_js_1.connect)({
            networkId: options.networkId || exports.DEFAULT_NETWORK,
            nodeUrl: options.nodeUrl || exports.DEFAULT_RPC,
            keyStore,
        });
        const account = await near.account(options.accountId || options.contractId);
        return new IntentraNearClient(options, account);
    }
    assertSigner() {
        if (this.readOnly) {
            throw new IntentraError("UNAUTHORIZED_SIGNER", "client is read-only; provide a secretKey");
        }
    }
    async send(methodName, args, deposit = 0n) {
        this.assertSigner();
        // near-api-js caches access-key nonces on the Account instance.
        this.account.accessKeyByPublicKeyCache = {};
        const [hashBytes, signed] = await this.account.signTransaction(this.contractId, [
            near_api_js_1.transactions.functionCall(methodName, args, exports.DEFAULT_GAS, deposit),
        ]);
        const txHash = near_api_js_1.utils.serialize.base_encode(hashBytes);
        let outcome;
        try {
            outcome = await this.account.connection.provider.sendTransaction(signed);
        }
        catch (error) {
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
    async deposit(amount) {
        return this.send("deposit", {}, BigInt(toYocto(amount)));
    }
    async grantRoot(params) {
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
    async delegate(parentId, params) {
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
    async executeTransfer(capabilityId, params) {
        const requestId = params.requestId || `intentra-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const tx = await this.send("execute_transfer", {
            capability_id: capabilityId,
            amount: toYocto(params.amount),
            recipient: params.recipient,
            request_id: requestId,
        });
        const event = tx.events.find((entry) => entry.event === "execute");
        return { executionId: event && event.data ? Number(event.data.execution_id) : undefined, tx };
    }
    async revoke(capabilityId, reason) {
        return this.send("revoke", { capability_id: capabilityId, reason });
    }
    async getCapability(capabilityId) {
        return this.view("get_capability", { capability_id: capabilityId });
    }
    async getLineage(capabilityId) {
        return this.view("get_lineage", { capability_id: capabilityId });
    }
    async isUsable(capabilityId) {
        return this.view("is_usable", { capability_id: capabilityId });
    }
    async getExecution(executionId) {
        return this.view("get_execution", { execution_id: executionId });
    }
    async getExecutions(capabilityId) {
        return this.view("get_executions", { capability_id: capabilityId });
    }
    async getStats() {
        return this.view("get_stats", {});
    }
    async view(methodName, args) {
        return this.account.viewFunction({
            contractId: this.contractId,
            methodName,
            args,
        });
    }
    eventCapabilityId(tx) {
        if (!tx.ok) {
            throw new IntentraError(tx.errorCode || "EXECUTION_FAILED", tx.error || "transaction failed", tx.error, tx.txHash);
        }
        const event = tx.events.find((entry) => entry.event === "grant" || entry.event === "delegate");
        if (!event || !event.data) {
            throw new IntentraError("EXECUTION_FAILED", "contract did not emit a capability event", undefined, tx.txHash);
        }
        return Number(event.data.capability_id);
    }
}
exports.IntentraNearClient = IntentraNearClient;
/**
 * A developer-facing handle to one capability in the delegation hierarchy.
 */
class IntentraSession {
    constructor(client, capabilityId) {
        this.client = client;
        this.capabilityId = capabilityId;
    }
    static async open(client, capabilityId) {
        const capability = await client.getCapability(capabilityId);
        if (!capability) {
            throw new IntentraError("NOT_FOUND", `capability ${capabilityId} does not exist`);
        }
        return new IntentraSession(client, capabilityId);
    }
    capability() {
        return this.client.getCapability(this.capabilityId);
    }
    lineage() {
        return this.client.getLineage(this.capabilityId);
    }
    execute(params) {
        return this.client.executeTransfer(this.capabilityId, params);
    }
    delegate(params) {
        return this.client.delegate(this.capabilityId, params);
    }
    revoke(reason) {
        return this.client.revoke(this.capabilityId, reason);
    }
}
exports.IntentraSession = IntentraSession;
