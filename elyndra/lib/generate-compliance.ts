"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { LegalStatus, ChildProfile, ChildNeeds, Priority } from "@/lib/db/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceAdvice {
  riskLevel: "low" | "medium" | "high";
  obligations: string[];
  warnings: string[];
  recommendations: string[];
}

interface HomeSummary {
  name: string;
  location: string;
  isRegistered: boolean;
  hasThread: boolean;
  decision: string | null;
}

interface GenerateComplianceInput {
  referral: {
    externalCaseRef: string;
    priority: Priority;
    childProfile: ChildProfile;
    needs: ChildNeeds;
    missingInfo: string[];
    legalStatus: LegalStatus;
  };
  homes: HomeSummary[];
  conversationSummary?: string;
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function generateComplianceAdvice(
  input: GenerateComplianceInput
): Promise<ComplianceAdvice> {
  const { referral, homes } = input;
  const ls = referral.legalStatus;

  const LEGAL_BASIS_LABELS: Record<string, string> = {
    NONE: "None",
    COURT_OF_PROTECTION: "Court of Protection",
    HIGH_COURT_INHERENT: "High Court Inherent Jurisdiction",
    SECURE_ACCOMMODATION_S25: "Secure Accommodation (S.25)",
    MHA: "Mental Health Act",
    OTHER: "Other Legal Basis",
  };

  const needsList = Object.entries(referral.needs)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
    .join(", ");

  const homesList = homes
    .map(
      (h) =>
        `- ${h.name} (${h.location}): registered=${h.isRegistered}, contacted=${h.hasThread}, decision=${h.decision ?? "pending"}`
    )
    .join("\n");

  const prompt = `You are a legal compliance advisor for children's care placements in England & Wales. Analyse this case involving Deprivation of Liberty and provide structured compliance guidance.

REFERRAL:
- Case: ${referral.externalCaseRef}
- Priority: ${referral.priority}
- Child: ${referral.childProfile.name}, age ${referral.childProfile.age}, ${referral.childProfile.gender}
- Location: ${referral.childProfile.location} (${referral.childProfile.localAuthority})
- Care needs: ${needsList || "None flagged"}
- Missing info: ${referral.missingInfo.length > 0 ? referral.missingInfo.join(", ") : "None"}

LEGAL STATUS:
- Legal basis: ${LEGAL_BASIS_LABELS[ls.legalBasis] ?? ls.legalBasis}
- Order ref: ${ls.orderRef ?? "Not specified"}
- Court: ${ls.court ?? "Not specified"}
- Date made: ${ls.dateMade ?? "Not specified"}
- Expiry: ${ls.expiryDate ?? "Not specified"}
- Review due: ${ls.reviewDue ?? "Not specified"}
- Authorised restrictions: ${ls.authorisedRestrictions?.join(", ") ?? "None specified"}
- Placement registered: ${ls.placementRegistered === null ? "Not confirmed" : ls.placementRegistered ? "Yes" : "No (UNREGISTERED)"}
${ls.notes ? `- Notes: ${ls.notes}` : ""}

HOMES BEING CONSIDERED:
${homesList || "No homes contacted yet"}

${input.conversationSummary ? `CONVERSATION CONTEXT:\n${input.conversationSummary}` : ""}

Return a JSON object with:
{
  "riskLevel": "low|medium|high",
  "obligations": ["specific legal obligations that MUST be fulfilled, with dates where applicable"],
  "warnings": ["compliance risks or issues that need immediate attention"],
  "recommendations": ["practical next steps to ensure compliance"]
}

Rules for assessment:
- riskLevel "high" if: order is expiring soon (<14 days), placement is unregistered, review is overdue, or key paperwork is missing
- riskLevel "medium" if: some concerns but no immediate compliance risk
- riskLevel "low" if: all paperwork in order, registered placement, dates are comfortable

For Secure Accommodation (S.25): note the statutory review timeline (first review within 1 month, subsequent every 3 months)
For High Court Inherent Jurisdiction: note Ofsted notification requirements for unregistered placements
For all DoL: emphasise the importance of documenting authorised restrictions and ensuring the home can enforce them

Be specific about dates, deadlines, and regulatory requirements. Reference actual UK legislation/guidance where relevant.
Return ONLY valid JSON, no markdown fences.`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 600,
    temperature: 0.4,
  });

  try {
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ComplianceAdvice;
    return {
      riskLevel: parsed.riskLevel ?? "medium",
      obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
    };
  } catch (err) {
    console.error("Failed to parse compliance advice:", err, text);
    return {
      riskLevel: "medium",
      obligations: [],
      warnings: ["Unable to generate compliance advice. Please try again."],
      recommendations: [],
    };
  }
}
