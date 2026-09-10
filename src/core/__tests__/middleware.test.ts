import { describe, it, expect, beforeEach } from "vitest";
import { IntentraMiddleware } from "../intentra-middleware";

describe("IntentraMiddleware", () => {
  let middleware: IntentraMiddleware;

  beforeEach(() => {
    middleware = new IntentraMiddleware({ mode: "mock" });
  });

  it("blocks permanently blocked tools", () => {
    const result = middleware.intercept("transfer_funds", { to: "attacker" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("permanently blocked");
    expect(result.operationType).toBe("BLOCKED");
  });

  it("blocks tools not in allowed set", () => {
    const result = middleware.intercept("unknown_tool", {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not in the allowed set");
    expect(result.operationType).toBe("BLOCKED");
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

  it("validates place_order against capability", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("place_order", { symbol: "BNBUSDT", side: "BUY", quoteOrderQty: "5" }, root.id);
    expect(result.allowed).toBe(true);
    expect(result.operationType).toBe("MUTATE");
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

  it("validates cancel_order requires orderId", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("cancel_order", {}, root.id);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("requires orderId");
  });

  it("allows cancel_order with orderId", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("cancel_order", { orderId: "12345" }, root.id);
    expect(result.allowed).toBe(true);
    expect(result.operationType).toBe("MUTATE");
  });

  it("allows read operations with valid capability", () => {
    const compiler = middleware.getCompiler();
    const root = compiler.issueRoot("agent-1", {
      objective: "Trade",
      allowedActions: ["BUY"],
      allowedAssets: ["BNBUSDT"],
      maxPerOrder: 10,
    });

    const result = middleware.intercept("get_account", {}, root.id);
    expect(result.allowed).toBe(true);
    expect(result.operationType).toBe("READ");
  });

  it("blocks read operations without capability", () => {
    const result = middleware.intercept("get_account", {});
    expect(result.allowed).toBe(false);
  });

  it("tracks all intercepted calls", () => {
    middleware.intercept("transfer_funds", {});
    middleware.intercept("place_order", {});
    middleware.intercept("get_account", {});

    expect(middleware.getInterceptedCalls().length).toBe(3);
  });

  it("generates report", () => {
    middleware.intercept("transfer_funds", {});
    middleware.intercept("get_account", {});

    const report = middleware.generateReport();
    expect(report).toContain("MIDDLEWARE REPORT");
    expect(report).toContain("Total intercepted calls: 2");
    expect(report).toContain("Blocked: 2");
  });
});
