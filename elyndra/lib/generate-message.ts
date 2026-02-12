"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ChildProfile, ChildNeeds, Priority, LegalStatus } from "@/lib/db/types";
import type { MatchReason } from "@/lib/matching";

interface GenerateMessageInput {
  childProfile: ChildProfile;
  needs: ChildNeeds;
  priority: Priority;
  triageScore: number;
  missingInfo: string[];
  homeName: string;
  homeLocation: string;
  matchReasons: MatchReason[];
  coordinatorName: string;
  legalStatus?: LegalStatus | null;
}

export async function generatePlacementMessage(
  input: GenerateMessageInput,
): Promise<string> {
  const needsList = Object.entries(input.needs)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
    .join(", ");

  const matchSummary = input.matchReasons
    .map(
      (r) =>
        `${r.level === "pass" ? "+" : r.level === "warn" ? "~" : "-"} ${r.text}`,
    )
    .join("\n");

  const prompt = `You are a child-care placement coordinator writing a professional but warm initial message to a home manager to request a placement.

Write a concise message (3-5 sentences) that:
- Introduces the referral and its urgency
- Summarises the child's key details and care needs
- Explains why this home was identified as a potential match
- Asks if they can accommodate the child
- Is professional, empathetic, and action-oriented

Child details:
- Name: ${input.childProfile.name}
- Age: ${input.childProfile.age}, Gender: ${input.childProfile.gender}
- Location: ${input.childProfile.location} (${input.childProfile.localAuthority})
- Priority: ${input.priority}
- Triage Score: ${input.triageScore}/100
- Care needs: ${needsList || "None flagged"}
- Missing info: ${input.missingInfo.length > 0 ? input.missingInfo.join(", ") : "None"}

Home being contacted:
- Name: ${input.homeName}
- Location: ${input.homeLocation}

Match analysis:
${matchSummary}
${input.legalStatus?.applicable ? `
IMPORTANT - Legal context (Deprivation of Liberty):
- Legal basis: ${input.legalStatus.legalBasis}
- Order ref: ${input.legalStatus.orderRef ?? "Not specified"}
- Authorised restrictions: ${input.legalStatus.authorisedRestrictions?.join(", ") ?? "None specified"}
- The message MUST mention that this placement involves DoL restrictions and briefly note the key restrictions the home would need to accommodate.
` : ""}
Coordinator name: ${input.coordinatorName}

Write ONLY the message body, no subject line. Do not include greetings like "Dear" - start directly. Sign off with the coordinator's first name only.`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 300,
    temperature: 0.7,
  });

  return text.trim();
}
