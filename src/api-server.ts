import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { Intentra } from "./publishable-sdk.js";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const intentra = new Intentra();

// ─── Swagger ─────────────────────────────────────────────────────

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "INTENTRA API",
    version: "1.0.0",
    description: "Transaction Compiler for AI Agents — The authority enforcement layer between agents and execution.",
  },
  servers: [{ url: "http://localhost:8080" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          200: { description: "Server is running" },
        },
      },
    },
    "/sessions": {
      post: {
        summary: "Create a session (time-boxed authority)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["agentId", "intentText"],
                properties: {
                  agentId: { type: "string", description: "Unique identifier for the agent" },
                  intentText: { type: "string", description: "Human-declared intent (e.g., 'Buy BTC only. Max $100 per order.')" },
                  durationMs: { type: "number", description: "Session duration in milliseconds (default: 3600000 = 1 hour)" },
                  maxProposals: { type: "number", description: "Maximum proposals allowed in session (default: 100)" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session created successfully" },
          400: { description: "Invalid request" },
        },
      },
      get: {
        summary: "List all sessions",
        parameters: [{
          name: "agentId",
          in: "query",
          description: "Filter sessions by agent ID",
          schema: { type: "string" },
        }],
        responses: {
          200: { description: "List of sessions" },
        },
      },
    },
    "/sessions/{sessionId}": {
      get: {
        summary: "Get a session by ID",
        parameters: [{
          name: "sessionId",
          in: "path",
          required: true,
          description: "Session ID from createSession()",
          schema: { type: "string" },
        }],
        responses: {
          200: { description: "Session object" },
          404: { description: "Session not found" },
        },
      },
      post: {
        summary: "Revoke a session",
        parameters: [{
          name: "sessionId",
          in: "path",
          required: true,
          description: "Session ID to revoke",
          schema: { type: "string" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["revokedBy", "reason"],
                properties: {
                  revokedBy: { type: "string", enum: ["human", "system", "timeout"], description: "Who is revoking" },
                  reason: { type: "string", description: "Reason for revocation" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session revoked" },
          404: { description: "Session not found" },
        },
      },
    },
    "/sessions/{sessionId}/compile": {
      post: {
        summary: "Compile an agent proposal against declared intent",
        description: "This is the authority enforcement layer. Returns ALLOW | BLOCK | APPROVAL_REQUIRED.",
        parameters: [{
          name: "sessionId",
          in: "path",
          required: true,
          description: "Session ID from createSession()",
          schema: { type: "string" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["proposal"],
                properties: {
                  proposal: { type: "string", description: "The agent's proposal (e.g., 'Buy $90 BTC')" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Transaction plan with decision" },
          404: { description: "Session not found or invalid" },
        },
      },
    },
    "/sessions/{sessionId}/revocations": {
      get: {
        summary: "Get revocation history for a session",
        parameters: [{
          name: "sessionId",
          in: "path",
          required: true,
          description: "Session ID",
          schema: { type: "string" },
        }],
        responses: {
          200: { description: "List of revocations" },
        },
      },
    },
    "/validate-sub-authority": {
      post: {
        summary: "Validate that a sub-agent's authority does not exceed its parent's",
        description: "The invariant: Authority can only narrow. Never widen.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["parentIntent", "subIntent"],
                properties: {
                  parentIntent: { type: "string", description: "Parent agent's intent text" },
                  subIntent: { type: "string", description: "Sub-agent's proposed intent text" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Validation result" },
        },
      },
    },
    "/receipts": {
      get: {
        summary: "Get all receipts",
        responses: {
          200: { description: "List of receipts" },
        },
      },
    },
    "/receipts/{planId}": {
      get: {
        summary: "Get a receipt by plan ID",
        parameters: [{
          name: "planId",
          in: "path",
          required: true,
          description: "Plan ID from compile()",
          schema: { type: "string" },
        }],
        responses: {
          200: { description: "Receipt object" },
          404: { description: "Receipt not found" },
        },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ─── Schemas ─────────────────────────────────────────────────────

const CreateSessionSchema = z.object({
  agentId: z.string().min(1),
  intentText: z.string().min(1),
  durationMs: z.number().positive().optional().default(60 * 60 * 1000),
  maxProposals: z.number().positive().optional().default(100),
});

const RevokeSessionSchema = z.object({
  revokedBy: z.enum(["human", "system", "timeout"]),
  reason: z.string().min(1),
});

const CompileSchema = z.object({
  proposal: z.string().min(1),
});

const ValidateSubAuthoritySchema = z.object({
  parentIntent: z.string().min(1),
  subIntent: z.string().min(1),
});

// ─── Routes ──────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/sessions", (req: Request, res: Response) => {
  try {
    const data = CreateSessionSchema.parse(req.body);
    const session = intentra.createSession(data.agentId, data.intentText, {
      durationMs: data.durationMs,
      maxProposals: data.maxProposals,
    });
    res.json({ success: true, session });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get("/sessions", (req: Request, res: Response) => {
  const agentId = req.query.agentId as string;
  const sessions = intentra.listSessions(agentId);
  res.json({ success: true, sessions });
});

app.get("/sessions/:sessionId", (req: Request, res: Response) => {
  const session = intentra.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: "Session not found" });
  }
  res.json({ success: true, session });
});

app.post("/sessions/:sessionId/compile", (req: Request, res: Response) => {
  try {
    const data = CompileSchema.parse(req.body);
    const plan = intentra.compile(req.params.sessionId, data.proposal);
    res.json({ success: true, plan });
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message });
  }
});

app.post("/sessions/:sessionId", (req: Request, res: Response) => {
  try {
    const data = RevokeSessionSchema.parse(req.body);
    const revocation = intentra.revokeSession(req.params.sessionId, data.revokedBy, data.reason);
    const session = intentra.getSession(req.params.sessionId);
    res.json({ success: true, revocation, session });
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message });
  }
});

app.get("/sessions/:sessionId/revocations", (req: Request, res: Response) => {
  const revocations = intentra.getRevocations(req.params.sessionId);
  res.json({ success: true, revocations });
});

app.post("/validate-sub-authority", (req: Request, res: Response) => {
  try {
    const data = ValidateSubAuthoritySchema.parse(req.body);
    const result = intentra.validateSubAuthority(data.parentIntent, data.subIntent);
    res.json({ success: true, result });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get("/receipts", (_req: Request, res: Response) => {
  const receipts = intentra.getAllReceipts();
  res.json({ success: true, receipts });
});

app.get("/receipts/:planId", (req: Request, res: Response) => {
  const receipt = intentra.getReceipt(req.params.planId);
  if (!receipt) {
    return res.status(404).json({ success: false, error: "Receipt not found" });
  }
  res.json({ success: true, receipt });
});

// ─── Start Server ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  INTENTRA API SERVER                                      ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  Running on: http://localhost:${PORT}                        ║`);
  console.log(`║  API Docs:   http://localhost:${PORT}/docs                   ║`);
  console.log(`║  Health:     http://localhost:${PORT}/health                 ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
});
