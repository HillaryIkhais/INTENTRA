// @ts-nocheck
import { randomBytes, createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { Receipt } from "../types/index.js";

/**
 * INTENTRA — Receipt Store
 *
 * Generates and stores receipts for executed transactions.
 * Persists to disk for audit trail.
 */

export class ReceiptStore {
  private receipts = new Map<string, Receipt>();
  private dir: string;

  constructor(dir: string = "./receipts") {
    this.dir = dir;
    this.ensureDir();
    this.loadFromDisk();
  }

  generateReceipt(
    planId: string,
    intent: string,
    proposal: string,
    decision: string,
    approvedBy: string
  ): Receipt {
    const intentHash = createHash("sha256").update(intent).digest("hex").slice(0, 16);
    const proposalHash = createHash("sha256").update(proposal).digest("hex").slice(0, 16);
    const decisionHash = createHash("sha256").update(decision).digest("hex").slice(0, 16);

    const receiptContent = `${planId}:${intentHash}:${proposalHash}:${decisionHash}`;
    const receiptHash = createHash("sha256").update(receiptContent).digest("hex").slice(0, 16);

    const receipt: Receipt = {
      planId,
      intentHash,
      proposalHash,
      decisionHash,
      receiptHash,
      timestamp: new Date().toISOString(),
      executed: false,
      executionPath: [],
    };

    this.receipts.set(planId, receipt);
    this.saveToDisk(receipt);
    return receipt;
  }

  save(receipt: Receipt): void {
    this.receipts.set(receipt.planId, receipt);
    this.saveToDisk(receipt);
  }

  get(planId: string): Receipt | undefined {
    return this.receipts.get(planId);
  }

  getAll(): Receipt[] {
    return Array.from(this.receipts.values());
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  private saveToDisk(receipt: Receipt): void {
    const filePath = path.join(this.dir, `${receipt.planId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2));
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.dir)) return;

    const files = fs.readdirSync(this.dir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.dir, file), "utf-8");
        const receipt = JSON.parse(content) as Receipt;
        this.receipts.set(receipt.planId, receipt);
      } catch {
        // Skip corrupted files
      }
    }
  }
}
