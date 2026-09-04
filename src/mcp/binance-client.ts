import { createHash, randomBytes } from "crypto";
import * as http from "http";
import * as url from "url";
import open from "open";

/**
 * INTENTRA — Binance Agent OS MCP Client
 *
 * Connects to Binance Agent OS via MCP protocol with OAuth 2.1 PKCE.
 * INTENTRA sits between the agent and Binance as the authority boundary.
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class BinanceClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private server: http.Server | null = null;
  private codeVerifier: string = "";
  private state: string = "";

  private mcpEndpoint = "https://agent.binance.com/mcp/agentic";
  private authEndpoint = "https://accounts.binance.com/agentic-oauth/authorize";
  private tokenEndpoint = "https://accounts.binance.com/oauth-agentic/token";
  private redirectUri: string;
  private clientId: string;

  constructor(config?: { clientId?: string; redirectUri?: string }) {
    this.clientId = config?.clientId || "intentra";
    this.redirectUri = config?.redirectUri || "http://localhost:3847/callback";
  }

  /**
   * Authenticate via OAuth 2.1 PKCE flow.
   * Opens browser for user authorization.
   */
  async authenticate(): Promise<boolean> {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    this.codeVerifier = codeVerifier;
    this.state = randomBytes(16).toString("hex");

    const authUrl = new URL(this.authEndpoint);
    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("redirect_uri", this.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", this.state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("scope", "openid profile trade");
    authUrl.searchParams.set("resource", this.mcpEndpoint);

    console.log("\n  Opening browser for Binance Agent OS authentication...");
    console.log(`  If browser doesn't open, visit:\n  ${authUrl.toString()}\n`);

    try {
      await open(authUrl.toString());
    } catch {
      console.log("  Could not open browser automatically.");
    }

    const code = await this.waitForCallback();
    if (!code) return false;

    const tokenResponse = await this.exchangeCode(code, this.codeVerifier);
    if (!tokenResponse) return false;

    this.accessToken = tokenResponse.access_token;
    this.tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;
    return true;
  }

  /**
   * Call an MCP tool on Binance Agent OS.
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.accessToken || Date.now() > this.tokenExpiry) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const response = await fetch(this.mcpEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MCP call failed: ${response.status} ${response.statusText}\n${text}`);
    }

    const data = await response.json() as { result?: MCPToolResult; error?: { message: string } };
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }
    return data.result || { content: [{ type: "text", text: "No result" }] };
  }

  /**
   * List available tools from Binance MCP.
   */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: any }>> {
    const response = await fetch(this.mcpEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/list",
        params: {},
      }),
    });

    const data = await response.json() as { result?: { tools: Array<{ name: string; description: string; inputSchema: any }> } };
    return data.result?.tools || [];
  }

  /**
   * Execute an approved transaction through Binance Agent OS MCP.
   */
  async executeTransaction(params: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    quantity?: string;
    quoteOrderQty?: string;
    price?: string;
    leverage?: string;
  }): Promise<{ orderId: string; status: string; details: string; raw: any }> {
    const args: Record<string, unknown> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
    };

    if (params.quantity) args.quantity = params.quantity;
    if (params.quoteOrderQty) args.quoteOrderQty = params.quoteOrderQty;
    if (params.price) args.price = params.price;
    if (params.leverage) args.leverage = params.leverage;

    const result = await this.callTool("place_order", args);
    const text = result.content[0]?.text || "";

    try {
      const parsed = JSON.parse(text);
      return {
        orderId: parsed.orderId?.toString() || parsed.orderId || "unknown",
        status: parsed.status || "UNKNOWN",
        details: text,
        raw: parsed,
      };
    } catch {
      return {
        orderId: "parse_error",
        status: "UNKNOWN",
        details: text,
        raw: text,
      };
    }
  }

  /**
   * Get account balances.
   */
  async getBalances(): Promise<string> {
    const result = await this.callTool("get_account", {});
    return result.content[0]?.text || "No balance data";
  }

  /**
   * Check if authenticated.
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Get access token.
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    return { codeVerifier, codeChallenge };
  }

  private waitForCallback(): Promise<string | null> {
    return new Promise((resolve) => {
      const port = parseInt(new URL(this.redirectUri).port || "3847");

      this.server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || "", true);
        const code = parsedUrl.query.code as string;
        const state = parsedUrl.query.state as string;
        const error = parsedUrl.query.error as string;

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1 style="color: #ef4444;">✗ Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body></html>
          `);
          this.server?.close();
          resolve(null);
          return;
        }

        if (state !== this.state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Invalid state parameter</h1></body></html>");
          this.server?.close();
          resolve(null);
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1 style="color: #22c55e;">✓ Authenticated with Binance Agent OS</h1>
              <p>INTENTRA now has authority to execute approved trades.</p>
              <p>You can close this window and return to INTENTRA.</p>
            </body></html>
          `);
          this.server?.close();
          resolve(code);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>No authorization code received</h1></body></html>");
          this.server?.close();
          resolve(null);
        }
      });

      this.server.listen(port, () => {
        console.log(`  Waiting for OAuth callback on port ${port}...`);
      });

      setTimeout(() => {
        this.server?.close();
        resolve(null);
      }, 120000);
    });
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse | null> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
      resource: this.mcpEndpoint,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  Token exchange failed: ${response.status}\n  ${error}`);
      return null;
    }

    return response.json() as Promise<TokenResponse>;
  }
}
