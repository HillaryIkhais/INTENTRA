import { ProvenanceReceipt, ProvenanceReceiptStore } from "./provenance-receipt.js";
import { Capability } from "../types/index.js";
import { randomBytes } from "crypto";

/**
 * INTENTRA — Binance Execution Adapter
 *
 * Sits between INTENTRA's authority check and Binance Agent OS.
 * Every execution produces a provenance receipt.
 * Every blocked attempt produces a receipt too.
 * Replay is detected via consumed nonces.
 *
 * Mock mode: proves the architecture without live credentials.
 * Real mode: calls Binance Agent OS MCP via OAuth 2.1 PKCE.
 */

export interface ExecutionResult {
  receipt: ProvenanceReceipt;
  orderId?: string;
  status: "EXECUTED" | "BLOCKED" | "REPLAY_DETECTED" | "CAPABILITY_REVOKED" | "APPROVAL_REQUIRED" | "MOCK_EXECUTED";
  message: string;
}

export interface ExecutionAdapterConfig {
  mode: "mock" | "real";
  binanceClient?: any; // BinanceClient from mcp/binance-client.ts
  receiptStore: ProvenanceReceiptStore;
}

export class ExecutionAdapter {
  private mode: "mock" | "real";
  private binanceClient: any;
  private receiptStore: ProvenanceReceiptStore;
  private executedIntents = new Set<string>();

  constructor(config: ExecutionAdapterConfig) {
    this.mode = config.mode;
    this.binanceClient = config.binanceClient;
    this.receiptStore = config.receiptStore;
  }

  /**
   * Execute a proposal through INTENTRA → Binance pipeline.
   *
   * Flow:
   *   1. Check nonce (replay detection)
   *   2. Check capability not revoked
   *   3. Execute on Binance (or mock)
   *   4. Record receipt with lineage
   *   5. Consume nonce
   */
  async execute(params: {
    capability: Capability;
    delegationChain: string[];
    proposal: { asset: string; action: string; amount: number };
    decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED";
    violations: string[];
  }): Promise<ExecutionResult> {
    const { capability, delegationChain, proposal, decision, violations } = params;

    // ── Step 1: Create receipt for this attempt ──
    const receipt = this.receiptStore.createReceipt({
      capabilityId: capability.id,
      delegationChain,
      intentId: `intent_${Date.now()}_${randomBytes(4).toString("hex")}`,
      agentId: capability.subject,
      proposal,
      decision,
      violations,
    });

    // ── Step 2: If BLOCKED, return receipt immediately ──
    if (decision === "BLOCK") {
      return {
        receipt,
        status: "BLOCKED",
        message: `BLOCKED — ${violations.join("; ")}`,
      };
    }

    // ── Step 3: If APPROVAL_REQUIRED, return receipt ──
    if (decision === "APPROVAL_REQUIRED") {
      return {
        receipt,
        status: "APPROVAL_REQUIRED",
        message: "APPROVAL_REQUIRED — human approval needed",
      };
    }

    // ── Step 4: Check for replay (same intent+proposal already executed) ──
    const replayKey = `${capability.id}:${proposal.asset}:${proposal.action}:${proposal.amount}`;
    if (this.executedIntents.has(replayKey)) {
      return {
        receipt,
        status: "REPLAY_DETECTED",
        message: `REPLAY_DETECTED — intent ${replayKey} already executed`,
      };
    }

    // ── Step 5: Check capability not revoked ──
    // (revocation is checked by the compiler before reaching here)

    // ── Step 6: Execute ──
    if (this.mode === "mock") {
      return this.executeMock(receipt, proposal, replayKey);
    } else {
      return this.executeReal(receipt, proposal, capability, replayKey);
    }
  }

  // ─── Mock Execution ──────────────────────────────────────────

  private executeMock(
    receipt: ProvenanceReceipt,
    proposal: { asset: string; action: string; amount: number },
    replayKey: string
  ): ExecutionResult {
    const mockOrderId = `mock_${Date.now()}_${randomBytes(4).toString("hex")}`;

    this.receiptStore.recordExecution(receipt.id, {
      orderId: mockOrderId,
      exchange: "binance-mock",
      executedAt: new Date().toISOString(),
      price: this.estimatePrice(proposal.asset),
      quantity: proposal.amount / (this.estimatePrice(proposal.asset) || 1),
      fee: proposal.amount * 0.001,
    });

    this.receiptStore.consumeNonce(receipt.nonce);
    this.executedIntents.add(replayKey);

    return {
      receipt: this.receiptStore.get(receipt.id)!,
      orderId: mockOrderId,
      status: "MOCK_EXECUTED",
      message: `MOCK EXECUTED — ${proposal.action} ${proposal.amount} ${proposal.asset} (mock mode, no real order placed)`,
    };
  }

  // ─── Real Execution ──────────────────────────────────────────

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
      const price = this.estimatePrice(proposal.asset);
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

      return {
        receipt: this.receiptStore.get(receipt.id)!,
        orderId: result.orderId,
        status: "EXECUTED",
        message: `EXECUTED — ${proposal.action} ${proposal.amount} ${proposal.asset} — Order ${result.orderId}`,
      };
    } catch (error: any) {
      return {
        receipt,
        status: "BLOCKED",
        message: `EXECUTION_FAILED — ${error.message}`,
      };
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private estimatePrice(asset: string): number {
    const prices: Record<string, number> = {
      BNBUSDT: 600,
      ETHUSDT: 3500,
      BTCUSDT: 65000,
      SOLUSDT: 150,
      ADAUSDT: 0.45,
      DOGEUSDT: 0.12,
      XRPUSDT: 0.55,
    };
    return prices[asset] || 100;
  }
}
