import { describe, it, expect, beforeEach } from "vitest";
import { IntentraMiddleware } from "../intentra-middleware";

describe("IntentraMiddleware", () => {
  let middleware: IntentraMiddleware;

  beforeEach(() => {
    middleware = new IntentraMiddleware({ mode: "mock" });
  });

  it("blocks unauthorized tools", () => {
    const result = middleware.intercept("transfer_funds", { to: "attacker" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not in the allowed set");
  });

  it("blocks execution without capability", () => {
    const result = middleware.intercept("place_order", { symbol: "BNBUSDT" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("requires a valid capability ID");
  });

  it("blocks execution with invalid capability", () => {
    const result = middleware.intercept("place_order", { symbol: "BNBUSDT" }, "invalid_id");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("blocks execution with revoked capability", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    compiler.revoke(root.id, "test");

    const result = middleware.intercept("place_order", { symbol: "BNBUSDT" }, root.id);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("revoked");
  });

  it("allows valid tool calls", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("place_order", { symbol: "BNBUSDT", side: "BUY", quoteOrderQty: "5" }, root.id);
    expect(result.allowed).toBe(true);
  });

  it("blocks place_order when proposal exceeds limits", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("place_order", { symbol: "BNBUSDT", side: "BUY", quoteOrderQty: "50" }, root.id);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("BLOCKED");
  });

  it("tracks blocked calls", () => {
    middleware.intercept("transfer_funds", {});
    middleware.intercept("withdraw_crypto", {});

    expect(middleware.getBlockedCalls().length).toBe(2);
  });

  it("generates report", () => {
    middleware.intercept("transfer_funds", {});

    const report = middleware.generateReport();
    expect(report).toContain("MIDDLEWARE REPORT");
    expect(report).toContain("Total blocked calls: 1");
  });
});
