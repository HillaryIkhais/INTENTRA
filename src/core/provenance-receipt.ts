import { randomBytes, createHash } from "crypto";
import { Capability, IntentConstraint } from "../types/index.js";

/**
 * INTENTRA — Provenance Receipt
 *
 * Every execution (or blocked attempt) gets a receipt.
 * The receipt contains the FULL authority lineage:
 *   intent → capability → delegation → proposal → decision → execution
 *
 * Receipts are append-only and content-addressed (SHA-256).
 * Replay is detected via consumed nonces.
 */

export interface ProvenanceReceipt {
  id: string;
  nonce: string;
  capabilityId: string;
  delegationChain: string[];
  intentId: string;
  agentId: string;
  proposal: {
    asset: string;
    action: string;
    amount: number;
    raw?: string;
  };
  decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED";
  violations: string[];
  execution?: {
    orderId: string;
    exchange: string;
    executedAt: string;
    price?: number;
    quantity?: number;
    fee?: number;
  };
  revokedAt?: string;
  revokedReason?: string;
  timestamp: string;
  receiptHash: string;
}

export class ProvenanceReceiptStore {
  private receipts = new Map<string, ProvenanceReceipt>();
  private consumedNonces = new Set<string>();

  /**
   * Create a receipt for a proposal evaluation.
   */
  createReceipt(params: {
    capabilityId: string;
    delegationChain: string[];
    intentId: string;
    agentId: string;
    proposal: { asset: string; action: string; amount: number; raw?: string };
    decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED";
    violations: string[];
    execution?: ProvenanceReceipt["execution"];
    revokedAt?: string;
    revokedReason?: string;
  }): ProvenanceReceipt {
    const id = `receipt_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const nonce = randomBytes(16).toString("hex");
    const timestamp = new Date().toISOString();

    const receipt: ProvenanceReceipt = {
      id,
      nonce,
      capabilityId: params.capabilityId,
      delegationChain: params.delegationChain,
      intentId: params.intentId,
      agentId: params.agentId,
      proposal: params.proposal,
      decision: params.decision,
      violations: params.violations,
      execution: params.execution,
      revokedAt: params.revokedAt,
      revokedReason: params.revokedReason,
      timestamp,
      receiptHash: "",
    };

    receipt.receiptHash = this.hashReceipt(receipt);
    this.receipts.set(id, receipt);
    return receipt;
  }

  /**
   * Record a Binance execution result against an existing receipt.
   */
  recordExecution(
    receiptId: string,
    execution: ProvenanceReceipt["execution"]
  ): ProvenanceReceipt | undefined {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) return undefined;

    if (receipt.execution) {
      throw new Error(`Receipt ${receiptId} already has execution recorded`);
    }

    receipt.execution = execution;
    receipt.receiptHash = this.hashReceipt(receipt);
    return receipt;
  }

  /**
   * Check if a nonce has already been consumed (replay detection).
   */
  isNonceConsumed(nonce: string): boolean {
    return this.consumedNonces.has(nonce);
  }

  /**
   * Mark a nonce as consumed after successful execution.
   */
  consumeNonce(nonce: string): void {
    this.consumedNonces.add(nonce);
  }

  /**
   * Get a receipt by ID.
   */
  get(receiptId: string): ProvenanceReceipt | undefined {
    return this.receipts.get(receiptId);
  }

  /**
   * Get all receipts.
   */
  getAll(): ProvenanceReceipt[] {
    return Array.from(this.receipts.values());
  }

  /**
   * Get receipts for a capability.
   */
  getByCapability(capabilityId: string): ProvenanceReceipt[] {
    return this.getAll().filter(r => r.capabilityId === capabilityId);
  }

  /**
   * Verify a receipt's hash is valid.
   */
  verify(receiptId: string): { valid: boolean; reason?: string } {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) return { valid: false, reason: "Receipt not found" };

    const expectedHash = this.hashReceipt(receipt);
    if (receipt.receiptHash !== expectedHash) {
      return { valid: false, reason: "Receipt hash mismatch — tampering detected" };
    }

    return { valid: true };
  }

  /**
   * Get the full provenance lineage for a receipt.
   */
  getLineage(receiptId: string): {
    receipt: ProvenanceReceipt;
    chainDepth: number;
    rootCapabilityId: string;
    leafCapabilityId: string;
  } | undefined {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) return undefined;

    return {
      receipt,
      chainDepth: receipt.delegationChain.length,
      rootCapabilityId: receipt.delegationChain[0] || receipt.capabilityId,
      leafCapabilityId: receipt.capabilityId,
    };
  }

  // ─── Private ──────────────────────────────────────────────────

  private hashReceipt(receipt: ProvenanceReceipt): string {
    const payload = JSON.stringify({
      id: receipt.id,
      nonce: receipt.nonce,
      capabilityId: receipt.capabilityId,
      delegationChain: receipt.delegationChain,
      intentId: receipt.intentId,
      agentId: receipt.agentId,
      proposal: receipt.proposal,
      decision: receipt.decision,
      violations: receipt.violations,
      execution: receipt.execution,
      revokedAt: receipt.revokedAt,
      revokedReason: receipt.revokedReason,
      timestamp: receipt.timestamp,
    });
    return createHash("sha256").update(payload).digest("hex");
  }
}
