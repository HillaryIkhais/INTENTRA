import { createHash } from "crypto";
import { BinanceClient } from "../mcp/binance-client";

export interface ReadbackAttestation {
  id: string;
  orderId: string;
  claim: {
    asset: string;
    action: string;
    amount: number;
    price: number;
    quantity: number;
  };
  readback: {
    asset: string;
    action: string;
    quantity: string;
    price: string;
    status: string;
    executedQty: string;
  } | null;
  match: boolean;
  discrepancies: string[];
  timestamp: string;
  receiptHash: string;
}

/**
 * ReadbackAttester
 *
 * After execution, queries Binance to confirm what actually happened.
 * Compares the readback against the original claim.
 *
 * This is the gap between INTENTRA and QUALTO:
 * - INTENTRA: "I executed the trade" (records what it believes happened)
 * - QUALTO: "Binance confirms the trade" (asks Binance what actually happened)
 *
 * This bridges that gap.
 */
export class ReadbackAttester {
  private binanceClient: BinanceClient | null = null;
  private attestations: Map<string, ReadbackAttestation> = new Map();

  constructor(binanceClient?: BinanceClient) {
    this.binanceClient = binanceClient || null;
  }

  /**
   * Perform readback attestation after execution.
   * Queries Binance to confirm the order actually happened.
   */
  async attest(
    orderId: string,
    claim: {
      asset: string;
      action: string;
      amount: number;
      price: number;
      quantity: number;
    },
    receiptHash: string
  ): Promise<ReadbackAttestation> {
    const id = createHash("sha256")
      .update(`${orderId}-${receiptHash}-${Date.now()}`)
      .digest("hex")
      .slice(0, 16);

    let readback: ReadbackAttestation["readback"] = null;
    let match = false;
    const discrepancies: string[] = [];

    if (this.binanceClient && this.binanceClient.isAuthenticated()) {
      try {
        const orderData = await this.binanceClient.getOrder(orderId, claim.asset);

        if (orderData) {
          readback = {
            asset: orderData.symbol,
            action: orderData.side,
            quantity: orderData.quantity,
            price: orderData.price,
            status: orderData.status,
            executedQty: orderData.executedQty,
          };

          // Compare claim against readback
          if (readback.asset !== claim.asset) {
            discrepancies.push(`Asset mismatch: claimed ${claim.asset}, got ${readback.asset}`);
          }
          if (readback.action !== claim.action) {
            discrepancies.push(`Action mismatch: claimed ${claim.action}, got ${readback.action}`);
          }

          const readbackQty = parseFloat(readback.quantity);
          const quantityDiff = Math.abs(readbackQty - claim.quantity);
          if (quantityDiff > 0.0001) {
            discrepancies.push(`Quantity mismatch: claimed ${claim.quantity}, got ${readbackQty}`);
          }

          const readbackPrice = parseFloat(readback.price);
          if (readbackPrice > 0) {
            const priceDiff = Math.abs(readbackPrice - claim.price) / claim.price;
            if (priceDiff > 0.05) {
              discrepancies.push(`Price mismatch: claimed ${claim.price}, got ${readbackPrice}`);
            }
          }

          match = discrepancies.length === 0;
        } else {
          discrepancies.push("Could not retrieve order from Binance");
        }
      } catch (error) {
        discrepancies.push(`Readback failed: ${error}`);
      }
    } else {
      discrepancies.push("No authenticated Binance client available");
    }

    const attestation: ReadbackAttestation = {
      id,
      orderId,
      claim,
      readback,
      match,
      discrepancies,
      timestamp: new Date().toISOString(),
      receiptHash,
    };

    this.attestations.set(id, attestation);
    return attestation;
  }

  /**
   * Get attestation by ID.
   */
  getAttestation(id: string): ReadbackAttestation | undefined {
    return this.attestations.get(id);
  }

  /**
   * Get all attestations.
   */
  getAllAttestations(): ReadbackAttestation[] {
    return Array.from(this.attestations.values());
  }

  /**
   * Generate attestation report.
   */
  generateReport(): string {
    const lines: string[] = [];
    const all = this.getAllAttestations();

    lines.push("═══════════════════════════════════════════════════");
    lines.push("READBACK ATTESTATION REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Total attestations: ${all.length}`);

    const matched = all.filter(a => a.match);
    const mismatched = all.filter(a => !a.match);

    lines.push(`  Matched: ${matched.length}`);
    lines.push(`  Mismatched: ${mismatched.length}`);
    lines.push("");

    if (mismatched.length > 0) {
      lines.push("MISMATCHED ATTESTATIONS:");
      for (const att of mismatched) {
        lines.push(`  Order: ${att.orderId}`);
        lines.push(`  Discrepancies:`);
        for (const d of att.discrepancies) {
          lines.push(`    - ${d}`);
        }
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("TRUST MODEL");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA asks Binance what actually happened.");
    lines.push("The readback is compared against the original claim.");
    lines.push("If they don't match, the attestation is flagged.");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
