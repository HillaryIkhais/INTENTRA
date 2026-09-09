import { createHash } from "crypto";
import { ProvenanceReceipt } from "./provenance-receipt";

export interface VerificationResult {
  receiptId: string;
  hashValid: boolean;
  lineageValid: boolean;
  chainIntact: boolean;
  executionAttested: boolean;
  overallValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PublicReadback {
  orderId: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  status: string;
  executedQty: string;
  timestamp: string;
}

export class OfflineVerifier {
  verify(receipt: ProvenanceReceipt): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hashValid = this.verifyHash(receipt, errors);
    const lineageValid = this.verifyLineage(receipt, errors);
    const chainIntact = this.verifyChainIntegrity(receipt, errors, warnings);
    const executionAttested = this.verifyExecution(receipt, errors, warnings);

    return {
      receiptId: receipt.id,
      hashValid,
      lineageValid,
      chainIntact,
      executionAttested,
      overallValid: hashValid && lineageValid && chainIntact,
      errors,
      warnings,
    };
  }

  verifyAgainstPublicData(
    receipt: ProvenanceReceipt,
    publicReadbacks: PublicReadback[]
  ): VerificationResult {
    const baseResult = this.verify(receipt);

    if (publicReadbacks.length < 2) {
      baseResult.warnings.push("Less than 2 public readbacks provided — dual-readback not verified");
      baseResult.executionAttested = false;
      baseResult.overallValid = false;
      return baseResult;
    }

    const r1 = publicReadbacks[0];
    const r2 = publicReadbacks[1];

    if (r1.orderId !== r2.orderId) {
      baseResult.errors.push("Readback order IDs do not match");
      baseResult.overallValid = false;
    }

    if (r1.symbol !== r2.symbol) {
      baseResult.errors.push("Readback symbols do not match");
      baseResult.overallValid = false;
    }

    if (r1.side !== r2.side) {
      baseResult.errors.push("Readback sides do not match");
      baseResult.overallValid = false;
    }

    if (r1.quantity !== r2.quantity) {
      baseResult.errors.push("Readback quantities do not match");
      baseResult.overallValid = false;
    }

    if (r1.price !== r2.price) {
      baseResult.errors.push("Readback prices do not match");
      baseResult.overallValid = false;
    }

    if (r1.status !== r2.status) {
      baseResult.errors.push("Readback statuses do not match");
      baseResult.overallValid = false;
    }

    if (r1.executedQty !== r2.executedQty) {
      baseResult.errors.push("Readback executed quantities do not match");
      baseResult.overallValid = false;
    }

    if (receipt.execution?.orderId && receipt.execution.orderId !== r1.orderId) {
      baseResult.errors.push("Receipt order ID does not match public readback");
      baseResult.overallValid = false;
    }

    if (receipt.proposal.asset !== r1.symbol) {
      baseResult.errors.push("Receipt asset does not match public readback symbol");
      baseResult.overallValid = false;
    }

    baseResult.executionAttested = baseResult.errors.length === 0;

    return baseResult;
  }

  private verifyHash(receipt: ProvenanceReceipt, errors: string[]): boolean {
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

    const expectedHash = createHash("sha256").update(payload).digest("hex");

    if (receipt.receiptHash !== expectedHash) {
      errors.push(`Hash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`);
      return false;
    }

    return true;
  }

  private verifyLineage(receipt: ProvenanceReceipt, errors: string[]): boolean {
    if (!receipt.delegationChain || receipt.delegationChain.length === 0) {
      errors.push("Empty delegation chain — no lineage");
      return false;
    }

    if (receipt.delegationChain[0] === receipt.capabilityId) {
      errors.push("Delegation chain starts with leaf capability — invalid lineage");
      return false;
    }

    return true;
  }

  private verifyChainIntegrity(
    receipt: ProvenanceReceipt,
    errors: string[],
    warnings: string[]
  ): boolean {
    if (receipt.delegationChain.length === 1) {
      warnings.push("Single-element delegation chain — no delegation occurred");
      return true;
    }

    const seen = new Set<string>();
    for (const capId of receipt.delegationChain) {
      if (seen.has(capId)) {
        errors.push(`Circular reference detected in delegation chain: ${capId}`);
        return false;
      }
      seen.add(capId);
    }

    return true;
  }

  private verifyExecution(
    receipt: ProvenanceReceipt,
    errors: string[],
    warnings: string[]
  ): boolean {
    if (receipt.decision === "BLOCK") {
      if (receipt.execution) {
        warnings.push("BLOCKED receipt has execution data — suspicious");
      }
      return true;
    }

    if (receipt.decision === "ALLOW") {
      if (!receipt.execution) {
        warnings.push("ALLOW receipt has no execution data — may not have been executed");
        return false;
      }

      if (!receipt.execution.orderId) {
        errors.push("ALLOW receipt has execution but no order ID");
        return false;
      }

      if (!receipt.execution.executedAt) {
        errors.push("ALLOW receipt has execution but no execution timestamp");
        return false;
      }

      return true;
    }

    return true;
  }

  generateReport(receipts: ProvenanceReceipt[]): string {
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA OFFLINE VERIFICATION REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Total receipts: ${receipts.length}`);
    lines.push("");

    let totalValid = 0;
    let totalInvalid = 0;
    let totalWarnings = 0;

    for (const receipt of receipts) {
      const result = this.verify(receipt);
      if (result.overallValid) totalValid++;
      else totalInvalid++;
      totalWarnings += result.warnings.length;

      if (!result.overallValid || result.warnings.length > 0) {
        lines.push(`Receipt: ${receipt.id}`);
        lines.push(`  Hash: ${result.hashValid ? "VALID" : "INVALID"}`);
        lines.push(`  Lineage: ${result.lineageValid ? "VALID" : "INVALID"}`);
        lines.push(`  Chain: ${result.chainIntact ? "INTACT" : "BROKEN"}`);
        lines.push(`  Execution: ${result.executionAttested ? "ATTESTED" : "NOT ATTESTED"}`);
        lines.push(`  Overall: ${result.overallValid ? "VALID" : "INVALID"}`);

        for (const error of result.errors) {
          lines.push(`  ERROR: ${error}`);
        }
        for (const warning of result.warnings) {
          lines.push(`  WARNING: ${warning}`);
        }
        lines.push("");
      }
    }

    lines.push("═══════════════════════════════════════════════════");
    lines.push("SUMMARY");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Valid:   ${totalValid}`);
    lines.push(`Invalid: ${totalInvalid}`);
    lines.push(`Warnings: ${totalWarnings}`);
    lines.push(`Result: ${totalInvalid === 0 ? "ALL RECEIPTS VERIFIED" : "VERIFICATION FAILED"}`);
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
