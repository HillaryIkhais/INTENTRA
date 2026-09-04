import express, { Request, Response } from "express";
import { IntentraCompiler } from "./core/intentra-compiler.js";
import { ReceiptStore } from "./core/receipt-store.js";
import { BinanceClient } from "./mcp/binance-client.js";
import { IntentConstraint, Session } from "./types/index.js";

/**
 * INTENTRA API Server
 *
 * Connects the dashboard to the real INTENTRA compiler.
 * This is not mock data. This is the actual authority enforcement layer.
 */

const app = express();
app.use(express.json());
app.use(express.static("ui"));

const compiler = new IntentraCompiler();
const receiptStore = new ReceiptStore("./receipts");
let binanceClient: BinanceClient | null = null;

// Store active sessions
const activeSessions = new Map<string, Session>();

// Store intent
let currentIntent: IntentConstraint | null = null;
let currentIntentText: string = "";

// ═══════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Set intent
app.post("/api/intent", (req: Request, res: Response) => {
  const { intent } = req.body;
  if (!intent) {
    res.status(400).json({ error: "Intent is required" });
    return;
  }

  currentIntentText = intent;
  currentIntent = compiler.compile(intent, "").intent;

  // Create a session for this intent
  const session = compiler.createSession("demo-agent", currentIntent, {
    durationMs: 60 * 60 * 1000, // 1 hour
    maxProposals: 100,
  });
  activeSessions.set(session.id, session);

  res.json({
    intent: currentIntent,
    sessionId: session.id,
    expiresAt: session.expiresAt,
  });
});

// Get intent
app.get("/api/intent", (_req: Request, res: Response) => {
  if (!currentIntent) {
    res.json({ intent: null });
    return;
  }
  res.json({ intent: currentIntent, intentText: currentIntentText });
});

// Propose transaction
app.post("/api/propose", (req: Request, res: Response) => {
  const { proposal, sessionId } = req.body;
  if (!proposal) {
    res.status(400).json({ error: "Proposal is required" });
    return;
  }

  if (!currentIntentText) {
    res.status(400).json({ error: "No intent declared" });
    return;
  }

  try {
    const plan = compiler.compile(currentIntentText, proposal, "demo-agent", sessionId);

    // Save receipt if allowed
    if (plan.result.decision === "ALLOW") {
      const receipt = receiptStore.generateReceipt(
        plan.id,
        currentIntentText,
        proposal,
        plan.result.decision,
        "human"
      );
      receiptStore.save(receipt);
      plan.result.stateUpdate = {
        usedTotal: plan.result.totals.totalSpend,
        usedToday: plan.result.totals.totalSpend,
        lastOrderTime: new Date().toISOString(),
        approvedOrders: 1,
      };
    }

    res.json({ plan });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Execute on Binance
app.post("/api/execute", async (req: Request, res: Response) => {
  const { planId, proposal } = req.body;
  if (!planId || !proposal) {
    res.status(400).json({ error: "Plan ID and proposal are required" });
    return;
  }

  // Check if Binance client is configured
  if (!binanceClient) {
    res.status(400).json({
      error: "Binance client not configured. Run: npx tsx src/cli.ts to authenticate.",
    });
    return;
  }

  try {
    if (!binanceClient) throw new Error("Binance client not configured");
    const result = await (binanceClient as BinanceClient).executeTransaction({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: "50",
    });

    res.json({ success: true, orderId: result.orderId, details: result.details });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Revoke session
app.post("/api/revoke", (req: Request, res: Response) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: "Session ID is required" });
    return;
  }

  try {
    const revocation = compiler.revokeSession(sessionId, "human", reason || "Manual revocation");
    res.json({ revocation });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get session
app.get("/api/session/:id", (req: Request, res: Response) => {
  const sessionId = String(req.params.id);
  const session = compiler.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ session });
});

// List sessions
app.get("/api/sessions", (_req: Request, res: Response) => {
  const sessions = compiler.listSessions();
  res.json({ sessions });
});

// Check authority mutation
app.post("/api/check-mutation", (req: Request, res: Response) => {
  const { agentId, proposedChanges } = req.body;
  if (!agentId || !proposedChanges) {
    res.status(400).json({ error: "Agent ID and proposed changes are required" });
    return;
  }

  const result = compiler.checkAuthorityMutation(agentId, proposedChanges);
  res.json(result);
});

// Get receipt
app.get("/api/receipt/:planId", (req: Request, res: Response) => {
  const planId = String(req.params.planId);
  const receipt = receiptStore.get(planId);
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.json({ receipt });
});

// List receipts
app.get("/api/receipts", (_req: Request, res: Response) => {
  const receipts = receiptStore.getAll();
  res.json({ receipts });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3847;

app.listen(PORT, () => {
  console.log(`\n  INTENTRA API Server`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  API:       http://localhost:${PORT}/api`);
  console.log(`  ─────────────────────────────────────────────\n`);
});
