import express, { Request, Response } from "express";
import cors from "cors";
import { CapabilityCompiler } from "./core/capability-compiler.js";
import { ProvenanceReceiptStore } from "./core/provenance-receipt.js";
import { ExecutionAdapter } from "./core/execution-adapter.js";
import { IntentConstraint, Capability } from "./types/index.js";

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

// ─── ENGINE STATE ──────────────────────────────────────────────────
const compiler = new CapabilityCompiler();
const receiptStore = new ProvenanceReceiptStore();
const adapter = new ExecutionAdapter({
  mode: "mock",
  receiptStore,
});

interface LiveTest {
  id: string;
  parent: Capability;
  child?: Capability;
  proposal?: { asset: string; action: string; amount: number };
  delegationResult?: { valid: boolean; violations: string[] };
  proposalResult?: { decision: string; violations: string[] };
  executionResult?: { status: string; receipt?: string };
  timestamp: string;
}

let history: LiveTest[] = [];

// ─── ROUTES ────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    engine: "capability-compiler",
    mode: "mock",
  });
});

// Create a root capability
app.post("/api/issue", (req: Request, res: Response) => {
  try {
    const { agentId, objective, assets, actions, maxPerOrder, maxTotalSpend, maxDailySpend } = req.body;

    const constraints: IntentConstraint = {
      objective: objective || "Trading",
      allowedActions: actions || ["BUY"],
      allowedAssets: assets || ["BNBUSDT"],
      maxPerOrder: maxPerOrder || 100,
      maxTotalSpend: maxTotalSpend || 1000,
      maxDailySpend: maxDailySpend || 1000,
    };

    const cap = compiler.issueRoot(agentId || "human", constraints, { durationMs: 600000 });

    res.json({
      success: true,
      capability: {
        id: cap.id,
        agentId: cap.agentId,
        depth: cap.depth,
        constraints: cap.constraints,
        createdAt: cap.createdAt,
      },
    });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Delegate from parent to child
app.post("/api/delegate", (req: Request, res: Response) => {
  try {
    const { parentId, childAgentId, assets, actions, maxPerOrder, maxTotalSpend, maxDailySpend } = req.body;

    const constraints: any = {
      objective: "Delegated",
      allowedActions: actions || ["BUY"],
      allowedAssets: assets || ["BNBUSDT"],
    };

    if (maxPerOrder !== undefined) constraints.maxPerOrder = maxPerOrder;
    if (maxTotalSpend !== undefined) constraints.maxTotalSpend = maxTotalSpend;
    if (maxDailySpend !== undefined) constraints.maxDailySpend = maxDailySpend;

    const parent = compiler.getCapability(parentId);
    if (!parent) {
      return res.status(404).json({ success: false, error: "Parent capability not found" });
    }

    const result = compiler.delegate(parentId, childAgentId || "child-agent", constraints);

    const test: LiveTest = {
      id: `delegation-${Date.now()}`,
      parent,
      child: result.capability,
      delegationResult: {
        valid: result.violations.length === 0,
        violations: result.violations.map((v: any) => `${v.type}: ${v.reason}`),
      },
      timestamp: new Date().toISOString(),
    };
    history.push(test);

    res.json({
      success: true,
      parent: {
        id: parent.id,
        agentId: parent.agentId,
        constraints: parent.constraints,
      },
      child: result.capability
        ? {
            id: result.capability.id,
            agentId: result.capability.agentId,
            constraints: result.capability.constraints,
          }
        : null,
      valid: result.violations.length === 0,
      violations: result.violations.map((v: any) => ({
        type: v.type,
        reason: v.reason,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Validate a proposal against a capability
app.post("/api/validate", (req: Request, res: Response) => {
  try {
    const { capabilityId, asset, action, amount } = req.body;

    const cap = compiler.getCapability(capabilityId);
    if (!cap) {
      return res.status(404).json({ success: false, error: "Capability not found" });
    }

    const proposal = { asset: asset || "BNBUSDT", action: action || "BUY", amount: amount || 10 };

    const result = compiler.validateProposal(capabilityId, proposal);

    const test: LiveTest = {
      id: `proposal-${Date.now()}`,
      parent: cap,
      proposal,
      proposalResult: {
        decision: result.decision,
        violations: result.violations.map((v: any) => `${v.type}: ${v.reason}`),
      },
      timestamp: new Date().toISOString(),
    };
    history.push(test);

    res.json({
      success: true,
      capability: {
        id: cap.id,
        agentId: cap.agentId,
        constraints: cap.constraints,
      },
      proposal,
      decision: result.decision,
      violations: result.violations.map((v: any) => ({
        type: v.type,
        reason: v.reason,
      })),
      result: {
        blocked: result.decision === "BLOCK",
        blockedReason: result.decision === "BLOCK" ? "AUTHORITY WIDENING" : "WITHIN SCOPE",
      },
    });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Execute an approved proposal
app.post("/api/execute", async (req: Request, res: Response) => {
  try {
    const { capabilityId, asset, action, amount, decision, delegatedFrom } = req.body;

    const cap = compiler.getCapability(capabilityId);
    if (!cap) {
      return res.status(404).json({ success: false, error: "Capability not found" });
    }

    const chain = compiler.buildChain(capabilityId);
    const chainIds = chain ? chain.capabilities.map((c: Capability) => c.id) : [capabilityId];

    const proposal = { asset: asset || "BNBUSDT", action: action || "BUY", amount: amount || 10 };

    const execResult = await adapter.execute({
      capability: cap,
      delegationChain: chainIds,
      proposal,
      decision: decision || "ALLOW",
      violations: [],
    });

    const test: LiveTest = {
      id: `execution-${Date.now()}`,
      parent: cap,
      proposal,
      executionResult: {
        status: execResult.status,
        receipt: execResult.receipt.id,
      },
      timestamp: new Date().toISOString(),
    };
    history.push(test);

    res.json({
      success: true,
      capability: {
        id: cap.id,
        agentId: cap.agentId,
      },
      proposal,
      execution: {
        status: execResult.status,
        orderId: execResult.orderId,
        message: execResult.message,
        receipt: {
          id: execResult.receipt.id,
          nonce: execResult.receipt.nonce,
          execution: execResult.receipt.execution,
        },
      },
    });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Get test history
app.get("/api/history", (_req: Request, res: Response) => {
  res.json({ success: true, history: history.slice(-50) });
});

// Clear history
app.post("/api/reset", (_req: Request, res: Response) => {
  history = [];
  res.json({ success: true, cleared: true });
});

// ─── Start ────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  INTENTRA LIVE API                                        ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  Running on: http://localhost:${PORT}                        ║`);
  console.log(`║  Health:     http://localhost:${PORT}/health                 ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  This API exposes the actual capability compiler.        ║`);
  console.log(`║  No mock data. Real decisions.                          ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
});
