// @ts-nocheck
import { IntentConstraint } from "../types/index.js";

/**
 * INTENTRA — Intent Parser
 *
 * Parses natural-language intent into structured constraints.
 * This is where authority begins.
 */

const KNOWN_ASSETS = new Set([
  "BTC", "ETH", "SOL", "BNB", "USDT", "USDC",
  "XRP", "ADA", "DOGE", "DOT", "AVAX", "MATIC",
  "LINK", "UNI", "ATOM", "FIL", "APT", "ARB", "OP", "SUI",
]);

export class IntentParser {
  parse(text: string): IntentConstraint {
    const objective = this.extractObjective(text);
    const allowedActions = this.extractActions(text);
    const allowedAssets = this.extractAssets(text);
    const prohibitedActions = this.extractProhibited(text);

    const maxTotalSpend = this.extractMaxTotal(text)
      ?? this.extractDollarAmount(text);
    const maxPerOrder = this.extractMaxPerOrder(text);
    const maxDailySpend = this.extractMaxDaily(text);
    const approvalThreshold = this.extractApprovalThreshold(text);
    const expiresAt = this.extractTime(text);

    return {
      objective,
      allowedActions,
      allowedAssets,
      prohibitedActions,
      maxTotalSpend,
      maxPerOrder,
      maxDailySpend,
      approvalThreshold,
      expiresAt,
      allowedPairs: this.buildPairs(allowedActions, allowedAssets),
    };
  }

  private extractObjective(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("sell") || lower.includes("reduce")) return "Reduce position";
    if (lower.includes("swap") || lower.includes("convert") || lower.includes("trade")) return "Trade assets";
    if (lower.includes("accumulate") || lower.includes("buy the dip") || lower.includes("buy")) return "Accumulate position";
    if (lower.includes("hold") || lower.includes("maintain")) return "Hold position";
    if (lower.includes("transfer") || lower.includes("send")) return "Transfer assets";
    if (lower.includes("withdraw")) return "Withdraw funds";
    return "Execute trading strategy";
  }

  private extractActions(text: string): Array<"BUY" | "SELL" | "HOLD" | "TRANSFER" | "WITHDRAW"> {
    const actions: Array<"BUY" | "SELL" | "HOLD" | "TRANSFER" | "WITHDRAW"> = [];
    const upper = text.toUpperCase();
    for (const action of ["BUY", "SELL", "HOLD", "TRANSFER", "WITHDRAW"] as const) {
      if (upper.includes(action) && !actions.includes(action)) {
        actions.push(action);
      }
    }
    if (actions.length === 0) actions.push("BUY", "SELL");
    return actions;
  }

  private extractAssets(text: string): string[] {
    const assets: string[] = [];
    const words = text.toUpperCase().split(/[\s,;.]+/);
    for (const word of words) {
      const clean = word.replace(/[^A-Z]/g, "");
      if (clean.length >= 2 && clean.length <= 6 && KNOWN_ASSETS.has(clean) && !assets.includes(clean)) {
        assets.push(clean);
      }
    }
    return assets;
  }

  private extractProhibited(text: string): string[] {
    const prohibited: string[] = [];
    const lower = text.toLowerCase();
    const patterns: [RegExp, string][] = [
      [/(?:don't|do not|never)\s+sell/, "SELL"],
      [/(?:don't|do not|never)\s+buy/, "BUY"],
      [/(?:don't|do not|never)\s+transfer/, "TRANSFER"],
      [/(?:don't|do not|never)\s+withdraw/, "WITHDRAW"],
      [/no\s+selling/, "SELL"],
      [/no\s+buying/, "BUY"],
    ];
    for (const [pattern, action] of patterns) {
      if (pattern.test(lower) && !prohibited.includes(action)) {
        prohibited.push(action);
      }
    }
    return prohibited;
  }

  private extractMaxTotal(text: string): number | undefined {
    const patterns = [
      /(?:up to|at most|maximum|max|no more than)\s+\$?(\d+(?:\.\d{2})?)/i,
      /spend\s+(?:at\s+most|up\s+to|max(?:imum)?)\s+\$?(\d+(?:\.\d{2})?)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return parseFloat(match[1]);
    }
    return undefined;
  }

  private extractMaxPerOrder(text: string): number | undefined {
    const patterns = [
      /(?:per order|max(?:imum)?\s+(?:per|each)\s+order|(?:each|every)\s+order)\s+(?:max\s+)?\$?(\d+)/i,
      /order\s+(?:max|limit|up\s+to)\s+\$?(\d+)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return parseFloat(match[1]);
    }
    return undefined;
  }

  private extractMaxDaily(text: string): number | undefined {
    const patterns = [
      /(?:per day|daily|max(?:imum)?\s+per day|each day)\s+\$?(\d+)/i,
      /day\s+(?:max|limit|up\s+to)\s+\$?(\d+)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return parseFloat(match[1]);
    }
    return undefined;
  }

  private extractApprovalThreshold(text: string): number | undefined {
    const match = text.match(/(?:approval|approve|confirm)\s+(?:required|needed|above|over)\s+\$?(\d+)/i);
    return match?.[1] ? parseFloat(match[1]) : undefined;
  }

  private extractDollarAmount(text: string): number | undefined {
    const match = text.match(/\$(\d+(?:\.\d{2})?)/);
    return match?.[1] ? parseFloat(match[1]) : undefined;
  }

  private extractTime(text: string): string | undefined {
    const match = text.match(/(?:expires?|until|valid until|good until)\s+(\d{1,2}:\d{2})/i);
    if (match?.[1]) {
      const now = new Date();
      const [hours, minutes] = match[1].split(":").map(Number);
      now.setHours(hours, minutes, 0, 0);
      return now.toISOString();
    }
    return undefined;
  }

  private buildPairs(actions: string[], assets: string[]): string[] {
    const pairs: string[] = [];
    actions.forEach(a => {
      assets.forEach(asset => {
        pairs.push(`${a}_${asset}`);
      });
    });
    return pairs;
  }
}
