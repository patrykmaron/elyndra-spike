"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  ChildProfile,
  ChildNeeds,
  Priority,
  Status,
  WaitingOn,
  Decision,
  Role,
  LegalStatus,
} from "@/lib/db/types";
import type { MatchReason } from "@/lib/matching";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SuggestedAction {
  type: "send_request" | "follow_up" | "update_status" | "request_info";
  title: string;
  reasoning: string;
  homeId?: string;
  homeName?: string;
  message?: string;
  newStatus?: Status;
  threadId?: string;
}

interface MatchSummary {
  homeId: string;
  homeName: string;
  location: string;
  score: number;
  eligible: boolean;
  reasons: MatchReason[];
  existingThreadId: string | null;
}

interface ThreadSummary {
  id: string;
  homeName: string;
  homeLocation: string;
  waitingOn: WaitingOn | null;
  decision: Decision | null;
  decisionReason: string | null;
  updatedAt: Date;
  lastMessage?: {
    senderRole: Role;
    body: string;
    createdAt: Date;
  };
}

interface GenerateActionsInput {
  referral: {
    id: string;
    externalCaseRef: string;
    priority: Priority;
    status: Status;
    triageScore: number;
    childProfile: ChildProfile;
    needs: ChildNeeds;
    missingInfo: string[];
    legalStatus?: LegalStatus | null;
  };
  matches: MatchSummary[];
  threads: ThreadSummary[];
  coordinatorName: string;
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function generateSuggestedActions(
  input: GenerateActionsInput
): Promise<SuggestedAction[]> {
  const { referral, matches, threads } = input;

  const needsList = Object.entries(referral.needs)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
    .join(", ");

  const eligibleHomes = matches
    .filter((m) => m.eligible)
    .map(
      (m) =>
        `- ${m.homeName} (ID: ${m.homeId}, score: ${m.score}%, location: ${m.location}, already contacted: ${m.existingThreadId ? "yes" : "no"})` +
        `\n  Reasons: ${m.reasons.map((r) => `[${r.level}] ${r.text}`).join(", ")}`
    )
    .join("\n");

  const threadsSummary = threads
    .map((t) => {
      const lastMsg = t.lastMessage
        ? `Last message by ${t.lastMessage.senderRole} (${timeSince(t.lastMessage.createdAt)}): "${t.lastMessage.body.substring(0, 80)}..."`
        : "No messages";
      return `- ${t.homeName} (thread: ${t.id}, waiting_on: ${t.waitingOn ?? "none"}, decision: ${t.decision ?? "pending"}, updated: ${timeSince(t.updatedAt)})` +
        `\n  ${lastMsg}` +
        (t.decisionReason ? `\n  Rejection reason: ${t.decisionReason}` : "");
    })
    .join("\n");

  const prompt = `You are an AI assistant for a child-care placement coordinator. Analyse the current state of this referral and suggest 2-4 concrete next actions.

REFERRAL:
- Case: ${referral.externalCaseRef}
- Status: ${referral.status}
- Priority: ${referral.priority}
- Triage Score: ${referral.triageScore}/100
- Child: ${referral.childProfile.name}, age ${referral.childProfile.age}, ${referral.childProfile.gender}
- Location: ${referral.childProfile.location} (${referral.childProfile.localAuthority})
- Care needs: ${needsList || "None flagged"}
- Missing info: ${referral.missingInfo.length > 0 ? referral.missingInfo.join(", ") : "None"}
${referral.legalStatus?.applicable ? `
LEGAL STATUS (Deprivation of Liberty):
- Legal basis: ${referral.legalStatus.legalBasis}
- Order ref: ${referral.legalStatus.orderRef ?? "Not specified"}
- Review due: ${referral.legalStatus.reviewDue ?? "Not specified"}
- Authorised restrictions: ${referral.legalStatus.authorisedRestrictions?.join(", ") ?? "None specified"}
- Placement registered: ${referral.legalStatus.placementRegistered === null ? "Not confirmed" : referral.legalStatus.placementRegistered ? "Yes" : "No (UNREGISTERED)"}
` : ""}
ELIGIBLE HOMES (not yet contacted, sorted by fit score):
${eligibleHomes || "None available"}

EXISTING THREADS:
${threadsSummary || "No threads yet"}

COORDINATOR NAME: ${input.coordinatorName}

Return a JSON array of 2-4 actions. Each action must have:
- "type": one of "send_request", "follow_up", "update_status", "request_info"
- "title": short action title (e.g. "Send request to Oakwood House")
- "reasoning": 1 sentence explaining why this action makes sense
- For "send_request": include "homeId", "homeName", and "message" (a draft 2-3 sentence placement request message)
- For "follow_up": include "threadId", "homeName", and "message" (a polite follow-up message)
- For "update_status": include "newStatus" (one of: NEW, TRIAGED, OUTREACH, AWAITING_RESPONSE, DECISION, PLACED, CLOSED)
- For "request_info": include "message" describing what info to request

Rules:
- Only suggest "send_request" for homes that have NOT been contacted yet (existingThreadId is null)
- Only suggest "follow_up" for threads where waiting_on is "HOME" and no decision yet
- Consider the priority level — EMERGENCY referrals need urgent, parallel outreach
- If a home rejected, factor in their reason when suggesting alternatives
- Suggest status updates if the current status doesn't match the actual state (e.g. status is NEW but threads exist)
- Messages should be professional, warm, and concise
${referral.legalStatus?.applicable ? `- This referral involves Deprivation of Liberty. Consider suggesting actions like: requesting court order copies, verifying home registration with Ofsted, ensuring homes can meet authorised restrictions, and filing review paperwork before deadlines.
- For DoL cases, ONLY suggest registered homes. Mention legal requirements in placement request messages.` : ""}

Return ONLY valid JSON. No markdown fences, no explanation outside the array.`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 800,
    temperature: 0.7,
  });

  try {
    // Strip any markdown fences if the model adds them
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as SuggestedAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse AI actions:", err, text);
    return [];
  }
}

function timeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
