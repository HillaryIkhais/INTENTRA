import { z } from "zod";

export const IntentConstraintSchema = z.object({
  type: z.enum(["EXACT", "MAX", "RANGE", "ALLOW_LIST", "BLOCK_LIST", "LIMIT", "TIMEBOX"]),
  field: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  comparison: z.enum(["EQ", "LT", "GT", "LTE", "GTE", "IN", "NOT_IN"]).optional(),
  secondaryValue: z.union([z.string(), z.number()]).optional(),
  description: z.string().optional(),
});

export type IntentConstraint = z.infer<typeof IntentConstraintSchema>;

export const ActionSchema = z.object({
  type: z.enum(["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW", "MARGIN_OPEN", "MARGIN_CLOSE", "FUTURES_OPEN", "FUTURES_CLOSE", "LIMIT_CHANGE", "AUTHORITY_CHANGE"]),
  asset: z.string(),
  amount: z.number(),
  amountType: z.enum(["BASE", "QUOTE"]).default("QUOTE"),
  secondaryAsset: z.string().optional(),
  price: z.number().optional(),
  leverage: z.number().optional(),
  raw: z.string(),
  normalized: z.boolean(),
  isAuthorityMutation: z.boolean().optional(),
});

export type Action = z.infer<typeof ActionSchema>;

export const ViolationType = {
  AMOUNT_EXCEEDS: "AMOUNT_EXCEEDS",
  ASSET_RESTRICTED: "ASSET_RESTRICTED",
  ACTION_DISALLOWED: "ACTION_DISALLOWED",
  DAILY_EXCEEDED: "DAILY_EXCEEDED",
  WEEKLY_EXCEEDED: "WEEKLY_EXCEEDED",
  SPOT_ONLY: "SPOT_ONLY",
  POLICY_MUTATION: "POLICY_MUTATION",
  AUTHORITY_WIDENING: "AUTHORITY_WIDENING",
  SPLIT_EVASION: "SPLIT_EVASION",
  AGGREGATE_BUDGET: "AGGREGATE_BUDGET",
  REPLAY: "REPLAY",
  EXPIRED: "EXPIRED",
  SUB_AGENT_ESCALATION: "SUB_AGENT_ESCALATION",
  UNKNOWN_INTENT: "UNKNOWN_INTENT",
} as const;

export type ViolationType = typeof ViolationType[keyof typeof ViolationType];

export const ViolationSchema = z.object({
  type: z.nativeEnum(ViolationType as any),
  actionIndex: z.number(),
  message: z.string(),
  constraint: IntentConstraintSchema.optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
});

export type Violation = z.infer<typeof ViolationSchema>;

export const AgentIntentSchema = z.object({
  id: z.string(),
  rawInput: z.string().optional(),
  constraints: z.array(IntentConstraintSchema),
  createdAt: z.string().default(() => new Date().toISOString()),
  expiresAt: z.string().optional(),
  parentIntentId: z.string().optional(),
});

export type AgentIntent = z.infer<typeof AgentIntentSchema>;

export const TransactionPlanSchema = z.object({
  intentId: z.string(),
  actions: z.array(ActionSchema),
  totalRequested: z.number(),
  totalNotional: z.number(),
  estimatedFees: z.number(),
  violations: z.array(ViolationSchema),
  decision: z.enum(["ALLOW", "BLOCK", "CONDITIONAL_APPROVAL"]),
  dailyLimitRemaining: z.number().optional(),
  needsHumanApproval: z.boolean().default(false),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type TransactionPlan = z.infer<typeof TransactionPlanSchema>;

export type Decision = "ALLOW" | "BLOCK" | "CONDITIONAL_APPROVAL";

export const ReceiptSchema = z.object({
  id: z.string(),
  plan: TransactionPlanSchema,
  externalId: z.string().optional(),
  executed: z.boolean(),
  executedAt: z.string().default(() => new Date().toISOString()),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export const AgentAuthoritySchema = z.object({
  agentId: z.string(),
  intentId: z.string(),
  grantedAt: z.string().default(() => new Date().toISOString()),
  expiresAt: z.string().optional(),
  parentAuthorityId: z.string().optional(),
  maxSingleTrade: z.number().optional(),
  maxDailyVolume: z.number().optional(),
  allowedAssets: z.array(z.string()).optional(),
  blockedAssets: z.array(z.string()).optional(),
  allowedActions: z.array(z.string()).optional(),
  canDelegate: z.boolean().default(false),
  delegatedAgents: z.array(z.string()).optional(),
});

export type AgentAuthority = z.infer<typeof AgentAuthoritySchema>;

export const StateUpdateSchema = z.object({
  dailySpent: z.number().default(0),
  weeklySpent: z.number().default(0),
  lastTradeTimestamp: z.number().optional(),
  executedTradeIds: z.array(z.string()).default([]),
  dailyResetAt: z.string().default(() => new Date().toISOString()),
  weeklyResetAt: z.string().default(() => new Date().toISOString()),
});

export type StateUpdate = z.infer<typeof StateUpdateSchema>;

export class IntentraError extends Error {
  readonly type: ViolationType;
  readonly details?: Record<string, unknown>;

  constructor(type: ViolationType, message: string, details?: Record<string, unknown>) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = "IntentraError";
  }
}

export const SessionStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

export const SessionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  intent: z.array(IntentConstraintSchema),
  intentDescription: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["active", "expired", "revoked"]),
  stats: z.object({
    proposalsEvaluated: z.number(),
    proposalsAllowed: z.number(),
    proposalsBlocked: z.number(),
    amountExecuted: z.number(),
    amountLimit: z.number().optional(),
  }),
  config: z.object({
    maxProposals: z.number().optional(),
    canDelegate: z.boolean(),
  }),
  parentSessionId: z.string().optional(),
  delegatedSessions: z.array(z.string()).default([]),
});

export type Session = z.infer<typeof SessionSchema>;

export const RevocationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  revokedBy: z.string(),
  revokedAt: z.string(),
  reason: z.string(),
  agentId: z.string(),
});

export type Revocation = z.infer<typeof RevocationSchema>;
