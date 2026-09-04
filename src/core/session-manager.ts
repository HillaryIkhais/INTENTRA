import crypto from "crypto";
import { Session, SessionStatus, Revocation, IntentConstraint } from "../types";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SESSIONS_DIR = path.resolve(process.cwd(), "./sessions");
const REVOCATIONS_DIR = path.resolve(process.cwd(), "./revocations");

function ensureDirs(): void {
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
  if (!existsSync(REVOCATIONS_DIR)) mkdirSync(REVOCATIONS_DIR, { recursive: true });
}

function generateId(): string {
  return `ses_${crypto.randomBytes(12).toString("hex")}`;
}

function getSessionPath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

function getRevocationPath(revocationId: string): string {
  return path.join(REVOCATIONS_DIR, `${revocationId}.json`);
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    ensureDirs();
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (!existsSync(SESSIONS_DIR)) return;
    const fs = require("fs");
    const files = fs.readdirSync(SESSIONS_DIR).filter((f: string) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = readFileSync(path.join(SESSIONS_DIR, file), "utf8");
        const session = JSON.parse(content) as Session;
        this.sessions.set(session.id, session);
      } catch (e) {
        console.warn(`Failed to load session ${file}`);
      }
    }
  }

  private saveToDisk(session: Session): void {
    writeFileSync(getSessionPath(session.id), JSON.stringify(session, null, 2), "utf8");
  }

  private saveRevocation(revocation: Revocation): void {
    const revocationId = `rev_${crypto.randomBytes(8).toString("hex")}`;
    writeFileSync(getRevocationPath(revocationId), JSON.stringify(revocation, null, 2), "utf8");
  }

  createSession(
    agentId: string,
    intent: IntentConstraint,
    options: {
      expiresInSeconds?: number;
      maxProposals?: number;
      parentSessionId?: string;
    } = {}
  ): Session {
    const id = generateId();
    const now = new Date();
    const expiresIn = options.expiresInSeconds || 3600;
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    const session: Session = {
      id,
      agentId,
      intent,
      constraints: intent,
      status: "active",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxProposals: options.maxProposals || 100,
      proposalCount: 0,
      totalExecuted: 0,
      totalBlocked: 0,
      parentSessionId: options.parentSessionId,
    };

    this.sessions.set(id, session);
    this.saveToDisk(session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    this.checkExpiration(session);
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter((s) => {
      this.checkExpiration(s);
      return s.status === "active";
    });
  }

  private checkExpiration(session: Session): void {
    if (session.status !== "active") return;
    if (new Date() > new Date(session.expiresAt)) {
      session.status = "expired";
      this.saveToDisk(session);

      this.saveRevocation({
        sessionId: session.id,
        revokedBy: "timeout",
        reason: "Session expired",
        timestamp: new Date().toISOString(),
      });
    }
  }

  incrementProposalCount(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "active") return false;

    session.proposalCount++;
    this.saveToDisk(session);
    return true;
  }

  incrementExecuted(sessionId: string, amount: number): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "active") return false;

    session.totalExecuted += amount;
    this.saveToDisk(session);
    return true;
  }

  incrementBlocked(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "active") return false;

    session.totalBlocked++;
    this.saveToDisk(session);
    return true;
  }

  revokeSession(
    sessionId: string,
    revokedBy: "human" | "system",
    reason: string
  ): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "active") return false;

    session.status = "revoked";
    session.revokedAt = new Date().toISOString();
    session.revokedBy = revokedBy === "human" ? "human" : "system";
    session.revocationReason = reason;
    this.saveToDisk(session);

    const revocation: Revocation = {
      sessionId,
      revokedBy,
      reason,
      timestamp: session.revokedAt,
    };
    this.saveRevocation(revocation);

    return true;
  }

  completeSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "active") return false;

    session.status = "completed";
    this.saveToDisk(session);
    return true;
  }

  getRevocations(): Revocation[] {
    if (!existsSync(REVOCATIONS_DIR)) return [];
    const fs = require("fs");
    const files = fs.readdirSync(REVOCATIONS_DIR).filter((f: string) => f.endsWith(".json"));
    const revocations: Revocation[] = [];
    for (const file of files) {
      try {
        const content = readFileSync(path.join(REVOCATIONS_DIR, file), "utf8");
        revocations.push(JSON.parse(content) as Revocation);
      } catch (e) {}
    }
    return revocations;
  }

  validateSubSession(
    parentSessionId: string,
    childIntent: IntentConstraint
  ): { valid: boolean; reason?: string } {
    const parent = this.getSession(parentSessionId);
    if (!parent || parent.status !== "active") {
      return { valid: false, reason: "Parent session not found or not active" };
    }

    return this.validateNarrowing(parent.constraints, childIntent);
  }

  private validateNarrowing(
    parent: IntentConstraint,
    child: IntentConstraint
  ): { valid: boolean; reason?: string } {
    if (child.allowedActions.length > parent.allowedActions.length) {
      for (const action of child.allowedActions) {
        if (!parent.allowedActions.includes(action as any)) {
          return {
            valid: false,
            reason: `Sub-session tries to add action ${action} not in parent`,
          };
        }
      }
    }

    for (const asset of child.allowedAssets) {
      if (!parent.allowedAssets.includes(asset)) {
        return {
          valid: false,
          reason: `Sub-session tries to add asset ${asset} not in parent`,
        };
      }
    }

    if (child.maxPerOrder !== undefined && parent.maxPerOrder !== undefined) {
      if (child.maxPerOrder > parent.maxPerOrder) {
        return {
          valid: false,
          reason: `Sub-session maxPerOrder ${child.maxPerOrder} > parent ${parent.maxPerOrder}`,
        };
      }
    }

    if (child.maxDailySpend !== undefined && parent.maxDailySpend !== undefined) {
      if (child.maxDailySpend > parent.maxDailySpend) {
        return {
          valid: false,
          reason: `Sub-session maxDailySpend ${child.maxDailySpend} > parent ${parent.maxDailySpend}`,
        };
      }
    }

    if (child.maxTotalSpend !== undefined && parent.maxTotalSpend !== undefined) {
      if (child.maxTotalSpend > parent.maxTotalSpend) {
        return {
          valid: false,
          reason: `Sub-session maxTotalSpend ${child.maxTotalSpend} > parent ${parent.maxTotalSpend}`,
        };
      }
    }

    if (child.expiresAt && parent.expiresAt) {
      if (new Date(child.expiresAt) > new Date(parent.expiresAt)) {
        return {
          valid: false,
          reason: `Sub-session expires after parent session`,
        };
      }
    }

    return { valid: true };
  }
}
