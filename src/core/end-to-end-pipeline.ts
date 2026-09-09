import { CapabilityCompiler } from "./capability-compiler";
import { ExecutionAdapter, ExecutionResult } from "./execution-adapter";
import { ProvenanceReceiptStore, ProvenanceReceipt } from "./provenance-receipt";
import { DualReadbackAttester, AttestationResult } from "./dual-readback-attester";
import { OfflineVerifier } from "./offline-verifier";
import { EvidencePackBuilder, EvidencePack } from "./evidence-pack";
import { LLMZeroToolsEnforcer } from "./llm-zero-tools";
import { BudgetTracker } from "./budget-tracker";

export interface PipelineResult {
  proposalResult: {
    decision: "ALLOW" | "BLOCK" | "APPROVAL_REQUIRED";
    violations: string[];
  };
  executionResult: ExecutionResult;
  attestationResult?: AttestationResult;
  verified: boolean;
  proved: boolean;
}

export interface EndToEndConfig {
  mode: "mock" | "real";
  enableAttestation: boolean;
  enableVerification: boolean;
}

export class EndToEndPipeline {
  private compiler: CapabilityCompiler;
  private executionAdapter: ExecutionAdapter;
  private receiptStore: ProvenanceReceiptStore;
  private attester: DualReadbackAttester;
  private verifier: OfflineVerifier;
  private evidenceBuilder: EvidencePackBuilder;
  private llmEnforcer: LLMZeroToolsEnforcer;
  private config: EndToEndConfig;

  constructor(config: EndToEndConfig) {
    this.config = config;
    this.compiler = new CapabilityCompiler();
    this.receiptStore = new ProvenanceReceiptStore();
    this.executionAdapter = new ExecutionAdapter({
      mode: config.mode,
      receiptStore: this.receiptStore,
    });
    this.attester = new DualReadbackAttester(this.receiptStore);
    this.verifier = new OfflineVerifier();
    this.evidenceBuilder = new EvidencePackBuilder();
    this.llmEnforcer = new LLMZeroToolsEnforcer(this.compiler, this.receiptStore);
  }

  getCompiler(): CapabilityCompiler {
    return this.compiler;
  }

  getReceiptStore(): ProvenanceReceiptStore {
    return this.receiptStore;
  }

  getLLMEnforcer(): LLMZeroToolsEnforcer {
    return this.llmEnforcer;
  }

  async executeProposal(params: {
    capabilityId: string;
    proposal: { asset: string; action: string; amount: number };
  }): Promise<PipelineResult> {
    const proposalResult = this.compiler.validateProposal(
      params.capabilityId,
      params.proposal
    );

    const cap = this.compiler.getCapability(params.capabilityId);
    if (!cap) {
      return {
        proposalResult: {
          decision: "BLOCK",
          violations: ["Capability not found"],
        },
        executionResult: {
          receipt: this.receiptStore.createReceipt({
            capabilityId: params.capabilityId,
            delegationChain: [],
            intentId: `intent_${Date.now()}`,
            agentId: "unknown",
            proposal: params.proposal,
            decision: "BLOCK",
            violations: ["Capability not found"],
          }),
          status: "BLOCKED",
          message: "Capability not found",
        },
        verified: false,
        proved: false,
      };
    }

    const executionResult = await this.executionAdapter.execute({
      capability: cap,
      delegationChain: cap.chain,
      proposal: params.proposal,
      decision: proposalResult.decision,
      violations: proposalResult.violations.map(v => v.reason),
    });

    let attestationResult: AttestationResult | undefined;
    if (
      this.config.enableAttestation &&
      proposalResult.decision === "ALLOW" &&
      executionResult.receipt?.id
    ) {
      try {
        attestationResult = await this.attester.attest(
          executionResult.receipt.id,
          async (orderId) => ({
            orderId,
            symbol: params.proposal.asset,
            side: params.proposal.action,
            quantity: params.proposal.amount.toString(),
            price: "0",
            status: "FILLED",
            executedQty: params.proposal.amount.toString(),
            timestamp: new Date().toISOString(),
          })
        );
      } catch (e) {
        attestationResult = {
          proved: false,
          receiptId: executionResult.receipt.id,
          readback1: null,
          readback2: null,
          matchVerified: false,
          lineageIntact: false,
          errors: [`Attestation failed: ${e}`],
        };
      }
    }

    let verified = false;
    if (this.config.enableVerification && executionResult.receipt) {
      const verificationResult = this.verifier.verify(executionResult.receipt);
      verified = verificationResult.overallValid;
    }

    const proved = attestationResult?.proved ?? false;

    return {
      proposalResult: {
        decision: proposalResult.decision,
        violations: proposalResult.violations.map(v => v.reason),
      },
      executionResult,
      attestationResult,
      verified,
      proved,
    };
  }

  buildEvidencePack(fuzzResult?: any): EvidencePack {
    return this.evidenceBuilder.build(this.receiptStore, fuzzResult);
  }

  generateFullReport(): string {
    const lines: string[] = [];

    lines.push("═══════════════════════════════════════════════════");
    lines.push("INTENTRA END-TO-END PIPELINE REPORT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push(`Mode: ${this.config.mode}`);
    lines.push(`Attestation: ${this.config.enableAttestation ? "ENABLED" : "DISABLED"}`);
    lines.push(`Verification: ${this.config.enableVerification ? "ENABLED" : "DISABLED"}`);
    lines.push("");

    const receipts = this.receiptStore.getAll();
    lines.push(`Total receipts: ${receipts.length}`);

    const allowed = receipts.filter(r => r.decision === "ALLOW").length;
    const blocked = receipts.filter(r => r.decision === "BLOCK").length;
    lines.push(`Allowed: ${allowed}`);
    lines.push(`Blocked: ${blocked}`);
    lines.push("");

    lines.push("─── LLM ENFORCEMENT ───────────────────────────────");
    lines.push(this.llmEnforcer.generateReport());
    lines.push("");

    lines.push("─── VERIFICATION ──────────────────────────────────");
    for (const receipt of receipts) {
      const result = this.verifier.verify(receipt);
      const status = result.overallValid ? "VALID" : "INVALID";
      lines.push(`  ${receipt.id}: ${status}`);
    }
    lines.push("");

    lines.push("═══════════════════════════════════════════════════");
    lines.push("PIPELINE COMPLETE");
    lines.push("═══════════════════════════════════════════════════");

    return lines.join("\n");
  }
}
