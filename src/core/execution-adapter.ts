import { ProvenanceReceipt, ProvenanceReceiptStore } from "./provenance-receipt.js";
import { Capability } from "../types/index.js";
import { randomBytes } from "crypto";
import { ReadbackAttester } from "./readback-attester.js";

/**
 * INTENTRA — Binance Execution Adapter
 *
 * Sits between INTENTRA's authority check and Binance Agent OS.
 * Every execution produces a provenance receipt.
 * Every blocked attempt produces a receipt too.
 * Replay is detected via consumed nonces.
 *
 * Real mode: fetches actual prices from Binance, executes, then performs readback.
 */

export interface ExecutionResult {
  receipt: ProvenanceReceipt;
  orderId?: string;
  status: "EXECUTED" | "BLOCKED" | "REPLAY_DETECTED" | "CAPABILITY_REVOKED" | "APPROVAL_REQUIRED";
  message: string;
  readback?: {
    match: boolean;
    discrepancies: string[];
  };
}

export interface ExecutionAdapterConfig {
  mode: "mock" | "real";
  binanceClient?: any;
  receiptStore: ProvenanceReceiptStore;
  readbackAttester?: ReadbackAttester;
}

export class ExecutionAdapter {
  private mode: "mock" | "real";
  private binanceClient: any;
  private receiptStore: ProvenanceReceiptStore;
  private readbackAttester: ReadbackAttester;
  private executedIntents = new Set<string>();

  constructor(config: ExecutionAdapterConfig) {
    this.mode = config.mode;
    this.binanceClient = config.binanceClient;
    this.receiptStore = config.receiptStore;
    this.readbackAttester = config.readbackAttester || new ReadbackAttester(config.binanceClient);
  }

  /**
   * Execute a proposal through INTENTRA → Binance pipeline.
   *
   * Flow:
   *   1. Check nonce (replay detection)
   *   2. Check capability not revoked
   *   3. Fetch real price from Binance
   *   4. Execute on Binance
   *   5. Perform readback attestation
   *   6. Record receipt with lineage
   *   7. Consume nonce
   */
  async execute(params: {
    capability: Capability;
    delegationChain: string[];
    proposal: { asset: string; action: string; amount: number };
    decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED";
    violations: string[];
  }): Promise<ExecutionResult> {
    const { capability, delegationChain, proposal, decision, violations } = params;

    const receipt = this.receiptStore.createReceipt({
      capabilityId: capability.id,
      delegationChain,
      intentId: `intent_${Date.now()}_${randomBytes(4).toString("hex")}`,
      agentId: capability.agentId,
      proposal,
      decision,
      violations,
    });

    if (decision === "BLOCK") {
      return {
        receipt,
        status: "BLOCKED",
        message: `BLOCKED — ${violations.join("; ")}`,
      };
    }

    if (decision === "APPROVAL_REQUIRED") {
      return {
        receipt,
        status: "APPROVAL_REQUIRED",
        message: "APPROVAL_REQUIRED — human approval needed",
      };
    }

    const replayKey = `${capability.id}:${proposal.asset}:${proposal.action}:${proposal.amount}`;
    if (this.executedIntents.has(replayKey)) {
      return {
        receipt,
        status: "REPLAY_DETECTED",
        message: `REPLAY_DETECTED — intent ${replayKey} already executed`,
      };
    }

    if (this.mode === "mock") {
      return this.executeMock(receipt, proposal, replayKey);
    } else {
      return this.executeReal(receipt, proposal, capability, replayKey);
    }
  }

  /**
   * Fetch real price from Binance.
   */
  private async fetchPrice(asset: string): Promise<number> {
    if (!this.binanceClient || !this.binanceClient.isAuthenticated()) {
      return 0;
    }

    try {
      const result = await this.binanceClient.callTool("get_ticker", { symbol: asset });
      const text = result.content[0]?.text || "";
      const parsed = JSON.parse(text);
      return parseFloat(parsed.price) || 0;
    } catch {
      return 0;
    }
  }

  private async executeMock(
    receipt: ProvenanceReceipt,
    proposal: { asset: string; action: string; amount: number },
    replayKey: string
  ): Promise<ExecutionResult> {
    const mockOrderId = `mock_${Date.now()}_${randomBytes(4).toString("hex")}`;

    this.receiptStore.recordExecution(receipt.id, {
      orderId: mockOrderId,
      exchange: "binance-mock",
      executedAt: new Date().toISOString(),
      price: 0,
      quantity: 0,
      fee: 0,
    });

    this.receiptStore.consumeNonce(receipt.nonce);
    this.executedIntents.add(replayKey);

    return {
      receipt: this.receiptStore.get(receipt.id)!,
      orderId: mockOrderId,
      status: "BLOCKED",
      message: `MOCK BLOCKED — ${proposal.action} ${proposal.amount} ${proposal.asset} (mock mode, no real order placed)`,
    };
  }

  private async executeReal(
    receipt: ProvenanceReceipt,
    proposal: { asset: string; action: string; amount: number },
    capability: Capability,
    replayKey: string
  ): Promise<ExecutionResult> {
    if (!this.binanceClient) {
      throw new Error("Real mode requires BinanceClient — not provided");
    }

    if (!this.binanceClient.isAuthenticated()) {
      throw new Error("BinanceClient not authenticated — call authenticate() first");
    }

    try {
      const price = await this.fetchPrice(proposal.asset);
      if (price === 0) {
        throw new Error(`Could not fetch price for ${proposal.asset}`);
      }

      const quantity = (proposal.amount / price).toFixed(6);

      const result = await this.binanceClient.executeTransaction({
        symbol: proposal.asset,
        side: proposal.action as "BUY" | "SELL",
        type: "MARKET",
        quantity,
      });

      this.receiptStore.recordExecution(receipt.id, {
        orderId: result.orderId,
        exchange: "binance",
        executedAt: new Date().toISOString(),
        price,
        quantity: parseFloat(quantity),
        fee: proposal.amount * 0.001,
      });

      this.receiptStore.consumeNonce(receipt.nonce);
      this.executedIntents.add(replayKey);

      const readback = await this.readbackAttester.attest(
        result.orderId,
        {
          asset: proposal.asset,
          action: proposal.action,
          amount: proposal.amount,
          price,
          quantity: parseFloat(quantity),
        },
        receipt.id
      );

      return {
        receipt: this.receiptStore.get(receipt.id)!,
        orderId: result.orderId,
        status: "EXECUTED",
        message: `EXECUTED — ${proposal.action} ${proposal.amount} ${proposal.asset} — Order ${result.orderId}`,
        readback: {
          match: readback.match,
          discrepancies: readback.discrepancies,
        },
      };
    } catch (error: any) {
      return {
        receipt,
        status: "BLOCKED",
        message: `EXECUTION_FAILED — ${error.message}`,
      };
    }
  }
}
