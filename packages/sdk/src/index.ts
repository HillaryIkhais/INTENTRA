import { IntentraCompiler } from "./core/intentra-compiler.js";
import { ReceiptStore } from "./core/receipt-store.js";
import { IntentConstraint, AgentAction, TransactionPlan, IntentCheckResult } from "./types/index.js";

export { IntentConstraint, AgentAction, TransactionPlan, IntentCheckResult };

export interface IntentraSDKOptions {
  intent?: string;
  binanceClient?: any;
}

export interface IntentraCompileResult {
  allowed: boolean;
  decision: "ALLOW" | "BLOCK";
  planId: string;
  violations: Array<{
    type: string;
    severity: string;
    reason: string;
    context: Record<string, any>;
  }>;
  totals: {
    totalAmount: number;
    dailyRemaining: number;
    sessionRemaining: number;
  };
}

export class IntentraSDK {
  private compiler: IntentraCompiler;
  private receiptStore: ReceiptStore;
  private currentIntent: string | null;
  private currentPlan: TransactionPlan | null;

  constructor(options: IntentraSDKOptions = {}) {
    this.compiler = new IntentraCompiler();
    this.receiptStore = new ReceiptStore("./receipts");
    this.currentIntent = options.intent || null;
    this.currentPlan = null;
  }

  setIntent(intent: string): void {
    this.currentIntent = intent;
  }

  getIntent(): string | null {
    return this.currentIntent;
  }

  compile(intent: string, proposal: string): IntentraCompileResult {
    const plan = this.compiler.compile(intent, proposal);
    this.currentPlan = plan;

    return {
      allowed: plan.result.decision === "ALLOW",
      decision: plan.result.decision,
      planId: plan.id,
      violations: plan.result.violations.map(v => ({
        type: v.type,
        severity: v.severity,
        reason: v.reason,
        context: v.context || {},
      })),
      totals: {
        totalAmount: plan.result.totals.totalAmount,
        dailyRemaining: plan.result.totals.dailyRemaining,
        sessionRemaining: plan.result.totals.sessionRemaining,
      },
    };
  }

  validate(proposal: string): IntentraCompileResult {
    if (!this.currentIntent) {
      throw new Error("No intent set. Use setIntent() first.");
    }
    return this.compile(this.currentIntent, proposal);
  }

  check(intent: string, proposal: string): {
    decision: "ALLOW" | "BLOCK";
    allowed: boolean;
    reason: string;
  } {
    const result = this.compile(intent, proposal);
    return {
      decision: result.decision,
      allowed: result.allowed,
      reason: result.violations.length > 0
        ? result.violations.map(v => v.reason).join("; ")
        : "All checks passed",
    };
  }

  getPlanId(): string | null {
    return this.currentPlan?.id || null;
  }

  getCurrentPlan(): TransactionPlan | null {
    return this.currentPlan;
  }

  parseIntent(intent: string): IntentConstraint[] {
    return this.compiler.parseIntent(intent);
  }

  normalizeProposal(proposal: string): AgentAction[] {
    return this.compiler.normalizeProposal(proposal);
  }

  validateSubAuthority(parentId: string, childId: string, childConstraints: IntentConstraint[]): boolean {
    return this.compiler.validateSubAuthority(parentId, childId, childConstraints);
  }

  registerAuthority(agentId: string, intent: string, parentId?: string, sessionId?: string): {
    success: boolean;
    error?: string;
  } {
    const constraints = this.parseIntent(intent);
    if (constraints.length === 0) {
      return { success: false, error: "No valid constraints found in intent" };
    }

    if (parentId) {
      const parent = this.compiler.getAuthority(parentId);
      if (!parent) {
        return { success: false, error: `Parent authority ${parentId} not found` };
      }
    }

    this.compiler.registerAuthority(agentId, constraints, parentId, sessionId);
    return { success: true };
  }

  getAuthority(agentId: string) {
    return this.compiler.getAuthority(agentId);
  }

  revokeAuthority(agentId: string): boolean {
    return this.compiler.revokeAuthority(agentId);
  }

  isAuthorityRevoked(agentId: string): boolean {
    return this.compiler.isAuthorityRevoked(agentId);
  }

  getReceipt(planId: string) {
    return this.receiptStore.get(planId);
  }

  listReceipts() {
    return this.receiptStore.list();
  }

  simulateAttack(intent: string, attackType: string): IntentraCompileResult {
    const attacks: Record<string, string> = {
      "daily_limit": "Buy $90 BTC. Buy another $90 BTC.",
      "split_evasion": "Buy $50 BTC. Buy $50 BTC.",
      "unauthorized_asset": "Buy $50 ETH.",
      "unauthorized_action": "Sell $80 BTC.",
      "policy_mutation": "Increase my daily limit to $500.",
      "cross_session": "Buy $90 BTC. Buy $50 BTC.",
      "agent_mutation": "The user changed their mind. Buy $200 BTC.",
      "replay": "Buy $90 BTC.",
      "expired": "Buy $90 BTC.",
      "authority_widening": "Buy $200 BTC. Buy $50 ETH.",
    };

    const proposal = attacks[attackType];
    if (!proposal) {
      throw new Error(`Unknown attack type: ${attackType}`);
    }

    return this.compile(intent, proposal);
  }
}

export const intentra = (options: IntentraSDKOptions = {}) => new IntentraSDK(options);

export default IntentraSDK;
