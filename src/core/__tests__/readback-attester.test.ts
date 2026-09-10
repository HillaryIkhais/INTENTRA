import { describe, it, expect, beforeEach } from "vitest";
import { ReadbackAttester } from "../readback-attester";

describe("ReadbackAttester", () => {
  let attester: ReadbackAttester;

  beforeEach(() => {
    attester = new ReadbackAttester();
  });

  it("creates attestation without Binance client", async () => {
    const attestation = await attester.attest(
      "order-123",
      {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 5,
        price: 600,
        quantity: 0.00833,
      },
      "receipt-hash-abc"
    );

    expect(attestation.orderId).toBe("order-123");
    expect(attestation.match).toBe(false);
    expect(attestation.discrepancies).toContain("No authenticated Binance client available");
  });

  it("stores and retrieves attestation", async () => {
    const attestation = await attester.attest(
      "order-123",
      {
        asset: "BNBUSDT",
        action: "BUY",
        amount: 5,
        price: 600,
        quantity: 0.00833,
      },
      "receipt-hash-abc"
    );

    const retrieved = attester.getAttestation(attestation.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.orderId).toBe("order-123");
  });

  it("returns all attestations", async () => {
    await attester.attest("order-1", { asset: "BNBUSDT", action: "BUY", amount: 5, price: 600, quantity: 0.00833 }, "hash-1");
    await attester.attest("order-2", { asset: "ETHUSDT", action: "SELL", amount: 100, price: 3500, quantity: 0.02857 }, "hash-2");

    const all = attester.getAllAttestations();
    expect(all.length).toBe(2);
  });

  it("generates report", async () => {
    await attester.attest("order-1", { asset: "BNBUSDT", action: "BUY", amount: 5, price: 600, quantity: 0.00833 }, "hash-1");

    const report = attester.generateReport();
    expect(report).toContain("READBACK ATTESTATION REPORT");
    expect(report).toContain("Total attestations: 1");
    expect(report).toContain("Matched: 0");
    expect(report).toContain("Mismatched: 1");
  });

  it("generates unique IDs", async () => {
    const a1 = await attester.attest("order-1", { asset: "BNBUSDT", action: "BUY", amount: 5, price: 600, quantity: 0.00833 }, "hash-1");
    const a2 = await attester.attest("order-2", { asset: "ETHUSDT", action: "SELL", amount: 100, price: 3500, quantity: 0.02857 }, "hash-2");

    expect(a1.id).not.toBe(a2.id);
  });
});
