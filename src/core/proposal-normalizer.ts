import { Action, IntentConstraint } from "../types/index.js";

/**
 * INTENTRA — Proposal Normalizer
 *
 * Normalizes agent output into structured actions.
 * This is where the agent's intent becomes a formal proposal.
 */

interface RawProposal {
  type?: string;
  action?: string;
  asset?: string;
  amount?: number;
  target_asset?: string;
  leverage?: number;
  price?: number;
  quantity?: number;
  side?: string;
  order_type?: string;
}

export class ProposalNormalizer {
  normalize(raw: string | RawProposal[]): Action[] {
    if (typeof raw === "string") {
      return this.parseText(raw);
    }
    return raw.map(r => this.normalizeAction(r));
  }

  private normalizeAction(raw: RawProposal): Action {
    const type = (raw.type || raw.action || raw.side || "BUY").toUpperCase() as Action["type"];
    const asset = (raw.asset || "").toUpperCase();
    const amount = raw.amount || raw.quantity || 0;
    const leverage = raw.leverage;
    const targetAsset = raw.target_asset?.toUpperCase();

    return { type, asset, amount, leverage, targetAsset };
  }

  private parseText(text: string): Action[] {
    const actions: Action[] = [];
    const lines = text.split("\n").filter(l => l.trim());

    for (const line of lines) {
      const action = this.parseLine(line.trim());
      if (action) actions.push(action);
    }

    return actions;
  }

  private parseLine(line: string): Action | null {
    const upper = line.toUpperCase();

    let type: Action["type"] = "BUY";
    let prefix = "BUY";
    if (upper.startsWith("SELL")) { type = "SELL"; prefix = "SELL"; }
    else if (upper.startsWith("HOLD")) { type = "HOLD"; prefix = "HOLD"; }
    else if (upper.startsWith("TRANSFER")) { type = "TRANSFER"; prefix = "TRANSFER"; }
    else if (upper.startsWith("WITHDRAW")) { type = "WITHDRAW"; prefix = "WITHDRAW"; }
    else if (!upper.startsWith("BUY")) return null;

    // Remove the action prefix and find the asset
    const remainder = line.slice(prefix.length).trim();
    const assetMatch = remainder.match(/\b([A-Z]{2,10})\b/);
    const asset = assetMatch ? assetMatch[1] : "";

    const amountMatch = line.match(/\$(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    const leverageMatch = line.match(/(\d+)x/i);
    const leverage = leverageMatch ? parseInt(leverageMatch[1]) : undefined;

    const targetMatch = line.match(/(?:to|into)\s+([A-Z]{2,10})/i);
    const targetAsset = targetMatch?.[1]?.toUpperCase();

    return { type, asset, amount, leverage, targetAsset };
  }
}
