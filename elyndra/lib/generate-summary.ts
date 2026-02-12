"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  ChildProfile,
  ChildNeeds,
  Priority,
  WaitingOn,
  Decision,
  Role,
  MessageType,
} from "@/lib/db/types";
import type { HomeConstraints, HomeCapabilities } from "@/lib/db/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FitItem {
  status: "good" | "warning" | "concern";
  text: string;
}

export interface CaseSummary {
  summary: string;
  missingInfo: string[];
  fitAssessment: FitItem[];
  nextSteps: string[];
}

interface MessageSummary {
  senderRole: Role;
  type: MessageType;
  body: string;
  createdAt: Date;
}

interface GenerateSummaryInput {
  referral: {
    externalCaseRef: string;
    priority: Priority;
    childProfile: ChildProfile;
    needs: ChildNeeds;
    missingInfo: string[];
  };
  home: {
    name: string;
    location: string;
    freeBeds: number;
    constraints: HomeConstraints;
    capabilities: HomeCapabilities;
  };
  thread: {
    waitingOn: WaitingOn | null;
    decision: Decision | null;
    decisionReason: string | null;
  };
  messages: MessageSummary[];
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function generateCaseSummary(
  input: GenerateSummaryInput
): Promise<CaseSummary> {
  const { referral, home, thread, messages } = input;

  const needsList = Object.entries(referral.needs)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
    .join(", ");

  const capabilitiesList = Object.entries(home.capabilities)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
    .join(", ");

  const conversationLog = messages
    .map(
      (m) =>
        `[${m.type}] ${m.senderRole} (${new Date(m.createdAt).toLocaleDateString("en-GB")}): ${m.body.substring(0, 200)}`
    )
    .join("\n");

  const prompt = `You are an AI assistant helping a children's home manager review a placement request. Analyse all the information below and return a structured JSON summary.

REFERRAL:
- Case: ${referral.externalCaseRef}
- Priority: ${referral.priority}
- Child: ${referral.childProfile.name}, age ${referral.childProfile.age}, ${referral.childProfile.gender}
- Location: ${referral.childProfile.location} (${referral.childProfile.localAuthority})
- Care needs: ${needsList || "None flagged"}
- Known missing info from referral: ${referral.missingInfo.length > 0 ? referral.missingInfo.join(", ") : "None"}

HOME PROFILE:
- Name: ${home.name}
- Location: ${home.location}
- Free beds: ${home.freeBeds}
- Age range: ${home.constraints.minAge}–${home.constraints.maxAge}
- Gender accepted: ${home.constraints.genderAllowed.join(", ")}
- Capabilities: ${capabilitiesList || "None listed"}
${home.constraints.notes ? `- Notes: ${home.constraints.notes}` : ""}

THREAD STATUS:
- Waiting on: ${thread.waitingOn ?? "No one (resolved)"}
- Decision: ${thread.decision ?? "Pending"}
${thread.decisionReason ? `- Decision reason: ${thread.decisionReason}` : ""}

CONVERSATION (${messages.length} entries):
${conversationLog || "No messages yet"}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence TL;DR of this case and where things stand",
  "missingInfo": ["array of specific missing information items - include both known missing docs AND any unanswered questions from the conversation"],
  "fitAssessment": [{"status": "good|warning|concern", "text": "description"}],
  "nextSteps": ["array of recommended next actions for the home manager"]
}

For fitAssessment:
- "good": child need matches a home capability, or constraint is met
- "warning": something to consider but not blocking (e.g. near age limit, location mismatch)
- "concern": child need that the home lacks capability for, or constraint violated

Be specific and practical. Return ONLY valid JSON, no markdown fences.`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 600,
    temperature: 0.5,
  });

  try {
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as CaseSummary;
    return {
      summary: parsed.summary ?? "",
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      fitAssessment: Array.isArray(parsed.fitAssessment)
        ? parsed.fitAssessment
        : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    };
  } catch (err) {
    console.error("Failed to parse AI summary:", err, text);
    return {
      summary: "Unable to generate summary. Please try again.",
      missingInfo: [],
      fitAssessment: [],
      nextSteps: [],
    };
  }
}
