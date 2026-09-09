import { createHash } from "crypto";
import { ProvenanceReceipt, ProvenanceReceiptStore } from "./provenance-receipt";

export interface AttestationConfig {
  maxRetries: number;
  retryDelayMs: number;
  requireExactMatch: boolean;
}

export interface ReadbackResult {
  orderId: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  status: string;
  executedQty: string;
  timestamp: string;
  lineageHash?: string;
}

export interface AttestationResult {
  proved: boolean;
  receiptId: string;
  readback1: ReadbackResult | null;
  readback2: ReadbackResult | null;
  matchVerified: boolean;
  lineageIntact: boolean;
  errors: string[];
}

export class DualReadbackAttester {
  private config: AttestationConfig;
  private receiptStore: ProvenanceReceiptStore;

  constructor(receiptStore: ProvenanceReceiptStore, config?: Partial<AttestationConfig>) {
    this.receiptStore = receiptStore;
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      requireExactMatch: config?.requireExactMatch ?? true,
    };
  }

  async attest(receiptId: string, readbackFn: (orderId: string) => Promise<ReadbackResult>): Promise<AttestationResult> {
    const receipt = this.receiptStore.get(receiptId);
    if (!receipt) {
      return {
        proved: false,
        receiptId,
        readback1: null,
        readback2: null,
        matchVerified: false,
        lineageIntact: false,
        errors: ["Receipt not found"],
      };
    }

    if (!receipt.execution?.orderId) {
      return {
        proved: false,
        receiptId,
        readback1: null,
        readback2: null,
        matchVerified: false,
        lineageIntact: false,
        errors: ["No order ID in receipt"],
      };
    }

    const orderId = receipt.execution.orderId;
    const errors: string[] = [];

    let readback1: ReadbackResult | null = null;
    let readback2: ReadbackResult | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        readback1 = await readbackFn(orderId);
        break;
      } catch (e) {
        errors.push(`Readback 1 attempt ${attempt + 1} failed: ${e}`);
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    if (!readback1) {
      return {
        proved: false,
        receiptId,
        readback1: null,
        readback2: null,
        matchVerified: false,
        lineageIntact: false,
        errors: [...errors, "Readback 1 failed after all retries"],
      };
    }

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        readback2 = await readbackFn(orderId);
        break;
      } catch (e) {
        errors.push(`Readback 2 attempt ${attempt + 1} failed: ${e}`);
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    if (!readback2) {
      return {
        proved: false,
        receiptId,
        readback1,
        readback2: null,
        matchVerified: false,
        lineageIntact: false,
        errors: [...errors, "Readback 2 failed after all retries"],
      };
    }

    const matchVerified = this.verifyMatch(readback1, readback2);
    const lineageIntact = this.verifyLineage(receipt, readback1);

    const proved = matchVerified && lineageIntact;

    return {
      proved,
      receiptId,
      readback1,
      readback2,
      matchVerified,
      lineageIntact,
      errors,
    };
  }

  private verifyMatch(r1: ReadbackResult, r2: ReadbackResult): boolean {
    if (this.config.requireExactMatch) {
      return (
        r1.orderId === r2.orderId &&
        r1.symbol === r2.symbol &&
        r1.side === r2.side &&
        r1.quantity === r2.quantity &&
        r1.price === r2.price &&
        r1.status === r2.status &&
        r1.executedQty === r2.executedQty
      );
    }

    return (
      r1.orderId === r2.orderId &&
      r1.symbol === r2.symbol &&
      r1.side === r2.side
    );
  }

  private verifyLineage(receipt: ProvenanceReceipt, readback: ReadbackResult): boolean {
    if (!receipt.delegationChain || receipt.delegationChain.length === 0) {
      return false;
    }

    const lineageData = {
      chain: receipt.delegationChain,
      capabilityId: receipt.capabilityId,
      agentId: receipt.agentId,
      proposal: receipt.proposal,
      execution: receipt.execution,
    };

    const computedHash = createHash("sha256")
      .update(JSON.stringify(lineageData))
      .digest("hex");

    return readback.lineageHash === computedHash;
  }

  computeLineageHash(receipt: ProvenanceReceipt): string {
    const lineageData = {
      chain: receipt.delegationChain,
      capabilityId: receipt.capabilityId,
      agentId: receipt.agentId,
      proposal: receipt.proposal,
      execution: receipt.execution,
    };

    return createHash("sha256")
      .update(JSON.stringify(lineageData))
      .digest("hex");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
