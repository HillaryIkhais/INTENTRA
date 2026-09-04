import { 
  Intent, 
  AgentAction, 
  ConstraintValue, 
  IntentConstraint, 
  Action, 
  IntentCheckError, 
  Decision, 
  TransactionPlan, 
  Receipt, 
  AgentAuthority, 
  ConstraintType, 
  ConstraintOperator, 
  ViolationType, 
  DecisionVerdict, 
  IntentraError, 
  IntentParsingError, 
  AuthorityError,
  ReceiptNotFoundError,
  InvalidProposalError,
  BinanceMcpError,
  AuthenticationError,
  ConstraintExceededError,
  PolicyMutationError,
  SplitEvasionError,
  AuthorityWideningError
} from './types';

import { IntentParser } from './intent-parser';
import { ProposalNormalizer } from './proposal-normalizer';
import { IntentChecker } from './intent-checker';
import { TransactionPlanner } from './transaction-planner';
import { IntentraCompiler } from './intentra-compiler';
import { ReceiptStore } from './receipt-store';
import { AdversarialTester, ATTACK_SCENARIOS, AttackScenario } from './adversarial-tester';

export {
  Intent,
  AgentAction,
  ConstraintValue,
  IntentConstraint,
  Action,
  IntentCheckError,
  Decision,
  TransactionPlan,
  Receipt,
  AgentAuthority,
  ConstraintType,
  ConstraintOperator,
  ViolationType,
  DecisionVerdict,
  IntentraError,
  IntentParsingError,
  AuthorityError,
  ReceiptNotFoundError,
  InvalidProposalError,
  BinanceMcpError,
  AuthenticationError,
  ConstraintExceededError,
  PolicyMutationError,
  SplitEvasionError,
  AuthorityWideningError,
  IntentParser,
  ProposalNormalizer,
  IntentChecker,
  TransactionPlanner,
  IntentraCompiler,
  ReceiptStore,
  AdversarialTester,
  ATTACK_SCENARIOS,
  AttackScenario
};

const DEFAULT_MAX_PER_ORDER = 100;
const DEFAULT_MAX_DAILY = 200;
const DEFAULT_TARGET_ASSETS = ['BTC'];
const DEFAULT_ALLOWED_ACTIONS = ['BUY'];

export interface IntentraOptions {
  maxPerOrder?: number;
  maxDaily?: number;
  targetAssets?: string[];
  allowedActions?: string[];
  sessionTtlSeconds?: number;
  storagePath?: string;
}

export interface IntentraClientConfig {
  clientId?: string;
  redirectUri?: string;
  scopes?: string[];
}

export class IntentraClient {
  private compiler: IntentraCompiler;
  private parser: IntentParser;
  private normalizer: ProposalNormalizer;
  private planner: TransactionPlanner;
  private options: IntentraOptions;
  private config: IntentraClientConfig;
  private _isAuthenticated: boolean = false;
  private _accessToken: string | null = null;
  private _sessionId: string | null = null;
  private _sessionCreatedAt: number = 0;

  constructor(options: IntentraOptions = {}, config: IntentraClientConfig = {}) {
    this.options = {
      maxPerOrder: options.maxPerOrder ?? DEFAULT_MAX_PER_ORDER,
      maxDaily: options.maxDaily ?? DEFAULT_MAX_DAILY,
      targetAssets: options.targetAssets ?? [...DEFAULT_TARGET_ASSETS],
      allowedActions: options.allowedActions ?? [...DEFAULT_ALLOWED_ACTIONS],
      sessionTtlSeconds: options.sessionTtlSeconds ?? 3600,
      storagePath: options.storagePath ?? './intentra-receipts'
    };

    this.config = {
      clientId: config.clientId ?? 'intentra',
      redirectUri: config.redirectUri ?? 'http://localhost:3000/callback',
      scopes: config.scopes ?? ['spot:read', 'spot:trade']
    };

    this.compiler = new IntentraCompiler();
    this.parser = new IntentParser();
    this.normalizer = new ProposalNormalizer();
    this.planner = new TransactionPlanner();
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get accessToken(): string | null {
    return this._accessToken;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  get isSessionActive(): boolean {
    if (!this._sessionCreatedAt) return false;
    const elapsed = Date.now() / 1000 - this._sessionCreatedAt;
    return elapsed < (this.options.sessionTtlSeconds ?? 3600);
  }

  declareIntent(naturalLanguageIntent: string): Intent {
    const intent = this.parser.parse(naturalLanguageIntent);
    
    if (!intent.constraints.some(c => c.type === ConstraintType.MAX_ORDER_AMOUNT)) {
      intent.constraints.push({
        type: ConstraintType.MAX_ORDER_AMOUNT,
        operator: ConstraintOperator.LESS_THAN_OR_EQUAL,
        value: this.options.maxPerOrder ?? DEFAULT_MAX_PER_ORDER
      });
    }

    if (!intent.constraints.some(c => c.type === ConstraintType.DAILY_LIMIT)) {
      intent.constraints.push({
        type: ConstraintType.DAILY_LIMIT,
        operator: ConstraintOperator.LESS_THAN_OR_EQUAL,
        value: this.options.maxDaily ?? DEFAULT_MAX_DAILY
      });
    }

    if (!intent.constraints.some(c => c.type === ConstraintType.TARGET_ASSET)) {
      (this.options.targetAssets ?? DEFAULT_TARGET_ASSETS).forEach(asset => {
        intent.constraints.push({
          type: ConstraintType.TARGET_ASSET,
          operator: ConstraintOperator.IN,
          value: asset
        });
      });
    }

    if (!intent.constraints.some(c => c.type === ConstraintType.ALLOWED_ACTION)) {
      (this.options.allowedActions ?? DEFAULT_ALLOWED_ACTIONS).forEach(action => {
        intent.constraints.push({
          type: ConstraintType.ALLOWED_ACTION,
          operator: ConstraintOperator.IN,
          value: action.toUpperCase()
        });
      });
    }

    this.compiler.setIntent(intent);
    return intent;
  }

  parseAgentProposal(naturalLanguageProposal: string): AgentAction[] {
    return this.normalizer.parse(naturalLanguageProposal);
  }

  evaluateProposal(actions: AgentAction[]): Decision {
    return this.compiler.evaluate(actions);
  }

  evaluateProposalFromText(naturalLanguageProposal: string): Decision {
    const actions = this.parseAgentProposal(naturalLanguageProposal);
    return this.evaluateProposal(actions);
  }

  generatePlan(actions: AgentAction[]): TransactionPlan {
    return this.planner.generate(actions);
  }

  simulateAgentAttack(attackType: string): Decision {
    const scenarios = ATTACK_SCENARIOS();
    const scenario = scenarios.find(s => s.name === attackType);
    
    if (!scenario) {
      throw new Error(`Attack scenario not found: ${attackType}`);
    }

    if (scenario.modifyLimit) {
      const intent = this.declareIntent('Buy BTC only. Max $100 per order. Max $200 per day.');
      intent.constraints = intent.constraints.filter(c => 
        c.type !== ConstraintType.DAILY_LIMIT
      );
      intent.constraints.push({
        type: ConstraintType.DAILY_LIMIT,
        operator: ConstraintOperator.LESS_THAN_OR_EQUAL,
        value: 500
      });
    }

    return this.evaluateProposalFromText(scenario.input);
  }

  runAllAttacks(): { [key: string]: { verdict: string; expected: string; passed: boolean } } {
    const tester = new AdversarialTester(this.compiler);
    const results = tester.runAll();
    
    const output: { [key: string]: { verdict: string; expected: string; passed: boolean } } = {};
    
    for (const [name, result] of Object.entries(results)) {
      output[name] = {
        verdict: result.decision.verdict,
        expected: result.expected,
        passed: result.passed
      };
    }

    return output;
  }

  getReceipt(transactionId: string): Receipt | null {
    return this.compiler.store.getReceipt(transactionId);
  }

  listReceipts(): Receipt[] {
    return this.compiler.store.listReceipts();
  }

  getTotalSpentToday(): number {
    return this.compiler.store.getTotalSpentToday();
  }

  getRemainingBudget(): number {
    const dailyLimit = this.options.maxDaily ?? DEFAULT_MAX_DAILY;
    const spent = this.getTotalSpentToday();
    return Math.max(0, dailyLimit - spent);
  }

  getActiveAuthority(): AgentAuthority | null {
    return this.compiler.getAuthority('root');
  }

  registerSubAgent(agentId: string, constraints: {
    maxOrderAmount?: number;
    dailyLimit?: number;
    targetAssets?: string[];
    allowedActions?: string[];
  }): AgentAuthority {
    const parent = this.compiler.getAuthority('root');
    if (!parent) {
      throw new Error('No root authority. Call declareIntent first.');
    }

    const subAuthority: AgentAuthority = {
      agentId,
      parentId: 'root',
      constraints: [],
      sessionId: this._sessionId ?? undefined
    };

    if (constraints.maxOrderAmount !== undefined) {
      subAuthority.constraints.push({
        type: ConstraintType.MAX_ORDER_AMOUNT,
        operator: ConstraintOperator.LESS_THAN_OR_EQUAL,
        value: constraints.maxOrderAmount
      });
    }

    if (constraints.dailyLimit !== undefined) {
      subAuthority.constraints.push({
        type: ConstraintType.DAILY_LIMIT,
        operator: ConstraintOperator.LESS_THAN_OR_EQUAL,
        value: constraints.dailyLimit
      });
    }

    if (constraints.targetAssets) {
      constraints.targetAssets.forEach(asset => {
        subAuthority.constraints.push({
          type: ConstraintType.TARGET_ASSET,
          operator: ConstraintOperator.IN,
          value: asset
        });
      });
    }

    if (constraints.allowedActions) {
      constraints.allowedActions.forEach(action => {
        subAuthority.constraints.push({
          type: ConstraintType.ALLOWED_ACTION,
          operator: ConstraintOperator.IN,
          value: action.toUpperCase()
        });
      });
    }

    return this.compiler.registerAuthority(subAuthority);
  }

  revokeAuthority(agentId: string): boolean {
    const authority = this.compiler.getAuthority(agentId);
    if (!authority) return false;

    const allAuthorities = this.compiler.listAllAuthorities();
    for (const auth of allAuthorities) {
      if (auth.parentId === agentId) {
        this.compiler.revokeAuthority(auth.agentId);
      }
    }

    return this.compiler.revokeAuthority(agentId);
  }

  listAuthorities(): AgentAuthority[] {
    return this.compiler.listAllAuthorities();
  }

  async startSession(): Promise<{ sessionId: string; sessionUrl: string; expiresAt: Date }> {
    this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    this._sessionCreatedAt = Date.now() / 1000;

    const rootAuthority = this.compiler.getAuthority('root');
    if (rootAuthority) {
      this.compiler.registerAuthority({
        ...rootAuthority,
        sessionId: this._sessionId
      });
    }

    const ttl = this.options.sessionTtlSeconds ?? 3600;
    return {
      sessionId: this._sessionId,
      sessionUrl: `http://localhost:3000/session/${this._sessionId}`,
      expiresAt: new Date(Date.now() + ttl * 1000)
    };
  }

  revokeSession(): boolean {
    if (!this._sessionId) return false;

    const authorities = this.compiler.listAllAuthorities();
    for (const auth of authorities) {
      if (auth.sessionId === this._sessionId) {
        this.compiler.revokeAuthority(auth.agentId);
      }
    }

    this._sessionId = null;
    this._sessionCreatedAt = 0;
    return true;
  }

  async authenticate(): Promise<{ authUrl: string; codeVerifier: string }> {
    const crypto = await import('crypto');
    const codeVerifier = crypto.webcrypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
    
    const hashBuffer = await crypto.webcrypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(codeVerifier)
    );
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const state = crypto.webcrypto.getRandomValues(new Uint8Array(16))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

    const authUrl = new URL('https://accounts.binance.com/agentic-oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.clientId ?? 'intentra');
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri ?? 'http://localhost:3000/callback');
    authUrl.searchParams.set('scope', (this.config.scopes ?? ['spot:read', 'spot:trade']).join(' '));
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    return {
      authUrl: authUrl.toString(),
      codeVerifier
    };
  }

  async completeAuthorization(code: string, codeVerifier: string): Promise<{ accessToken: string; expiresIn: number }> {
    const tokenUrl = 'https://accounts.binance.com/oauth-agentic/token';
    
    const formData = new URLSearchParams();
    formData.set('grant_type', 'authorization_code');
    formData.set('code', code);
    formData.set('redirect_uri', this.config.redirectUri ?? 'http://localhost:3000/callback');
    formData.set('client_id', this.config.clientId ?? 'intentra');
    formData.set('code_verifier', codeVerifier);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AuthenticationError(`Authentication failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    this._accessToken = data.access_token;
    this._isAuthenticated = true;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  }

  async executeTransaction(actions: AgentAction[]): Promise<{ executionId: string; receipt: Receipt; isAllowed: boolean }> {
    const decision = this.evaluateProposal(actions);
    
    if (decision.verdict !== DecisionVerdict.ALLOW) {
      return {
        executionId: `blocked_${Date.now()}`,
        receipt: {
          id: `blocked_${Date.now()}`,
          transactionId: `blocked_${Date.now()}`,
          status: 'REJECTED',
          executedAt: new Date(),
          metadata: {
            reason: decision.reason,
            violations: decision.violations
          }
        },
        isAllowed: false
      };
    }

    if (!this._accessToken) {
      throw new AuthenticationError('Not authenticated. Call authenticate first.');
    }

    const toolName = this.mapActionToBinanceTool(actions[0]);
    const toolArgs = this.mapActionToToolArgs(actions[0]);

    const mcpUrl = 'https://agent.binance.com/mcp/agentic';
    
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._accessToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArgs
        }
      })
    });

    if (!response.ok) {
      throw new BinanceMcpError(`Binance MCP call failed: ${response.statusText}`);
    }

    const result = await response.json();

    const receipt: Receipt = {
      id: `txn_${Date.now()}`,
      transactionId: result.id?.toString() || `txn_${Date.now()}`,
      status: 'SUCCESS',
      amount: actions.reduce((sum, a) => sum + (a.amount ?? 0), 0),
      asset: actions[0]?.asset,
      action: actions[0]?.actionType as any,
      executedAt: new Date(),
      metadata: {
        binanceResponse: result,
        decision,
        sessionId: this._sessionId
      }
    };

    this.compiler.store.saveReceipt(receipt);

    return {
      executionId: receipt.transactionId,
      receipt,
      isAllowed: true
    };
  }

  private mapActionToBinanceTool(action: AgentAction): string {
    const actionType = action.actionType.toUpperCase();
    
    if (actionType === 'BUY') return 'binance_spot_buy';
    if (actionType === 'SELL') return 'binance_spot_sell';
    
    return 'binance_spot_place_order';
  }

  private mapActionToToolArgs(action: AgentAction): Record<string, any> {
    return {
      symbol: `${action.asset}USDT`,
      side: action.actionType.toUpperCase(),
      type: 'MARKET',
      quantity: (action.amount ?? 0).toString(),
      quoteOrderQty: (action.amount ?? 0).toString()
    };
  }

  static quickStart(options: {
    maxSpend?: number;
    asset?: string;
    dailyLimit?: number;
  } = {}): IntentraClient {
    const client = new IntentraClient({
      maxPerOrder: options.maxSpend ?? 100,
      maxDaily: options.dailyLimit ?? 200,
      targetAssets: options.asset ? [options.asset] : ['BTC'],
      allowedActions: ['BUY']
    });

    client.declareIntent(
      `Buy ${options.asset || 'BTC'} only. ` +
      `Max $${options.maxSpend ?? 100} per order. ` +
      `Max $${options.dailyLimit ?? 200} per day.`
    );

    return client;
  }
}

export default IntentraClient;
