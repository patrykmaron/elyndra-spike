"use server";

import { db } from "@/lib/db";
import {
  referrals,
  threads,
  messages,
  events,
  homes,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import type { Status, Decision, Role, WaitingOn, HomeConstraints, HomeCapabilities } from "@/lib/db/types";

// ── Update Referral Status ───────────────────────────────────────────────────

export async function updateReferralStatus(
  referralId: string,
  newStatus: Status,
  changedBy: string
) {
  const ref = await db
    .select()
    .from(referrals)
    .where(eq(referrals.id, referralId));
  if (!ref[0]) throw new Error("Referral not found");

  const oldStatus = ref[0].status;

  await db
    .update(referrals)
    .set({ status: newStatus })
    .where(eq(referrals.id, referralId));

  await db.insert(events).values({
    id: createId(),
    referralId,
    type: "STATUS_CHANGE",
    payload: { from: oldStatus, to: newStatus, changedBy },
    createdAt: new Date(),
  });

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/referral/${referralId}`);
}

// ── Create Thread (send placement request) ───────────────────────────────────

export async function createThread(
  referralId: string,
  homeId: string,
  initialMessage: string,
  senderName: string
) {
  const threadId = createId();

  // Get home name for the event
  const homeRows = await db
    .select()
    .from(homes)
    .where(eq(homes.id, homeId));
  const homeName = homeRows[0]?.name ?? "Unknown Home";

  await db.insert(threads).values({
    id: threadId,
    referralId,
    homeId,
    waitingOn: "HOME",
    decision: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(messages).values({
    id: createId(),
    threadId,
    senderRole: "COORDINATOR",
    body: initialMessage,
    createdAt: new Date(),
  });

  await db.insert(events).values({
    id: createId(),
    referralId,
    type: "THREAD_CREATED",
    payload: { homeName, createdBy: senderName },
    createdAt: new Date(),
  });

  // If referral is still NEW or TRIAGED, move to OUTREACH
  const ref = await db
    .select()
    .from(referrals)
    .where(eq(referrals.id, referralId));
  if (ref[0] && (ref[0].status === "NEW" || ref[0].status === "TRIAGED")) {
    await db
      .update(referrals)
      .set({ status: "OUTREACH" })
      .where(eq(referrals.id, referralId));

    await db.insert(events).values({
      id: createId(),
      referralId,
      type: "STATUS_CHANGE",
      payload: { from: ref[0].status, to: "OUTREACH", changedBy: "System" },
      createdAt: new Date(),
    });
  }

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/referral/${referralId}`);
  revalidatePath("/home");

  return threadId;
}

// ── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(
  threadId: string,
  senderRole: Role,
  body: string
) {
  const threadRows = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId));
  if (!threadRows[0]) throw new Error("Thread not found");
  const thread = threadRows[0];

  const newWaitingOn: WaitingOn =
    senderRole === "COORDINATOR" ? "HOME" : "COORDINATOR";

  await db.insert(messages).values({
    id: createId(),
    threadId,
    senderRole,
    body,
    createdAt: new Date(),
  });

  await db
    .update(threads)
    .set({ waitingOn: newWaitingOn, updatedAt: new Date() })
    .where(eq(threads.id, threadId));

  await db.insert(events).values({
    id: createId(),
    referralId: thread.referralId,
    type: "MESSAGE_SENT",
    payload: { threadId, senderRole, preview: body.substring(0, 100) },
    createdAt: new Date(),
  });

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/referral/${thread.referralId}`);
  revalidatePath("/home");
  revalidatePath(`/home/request/${threadId}`);
}

// ── Make Decision (accept / reject) ──────────────────────────────────────────

export async function makeDecision(
  threadId: string,
  decision: Decision,
  reason?: string
) {
  const threadRows = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId));
  if (!threadRows[0]) throw new Error("Thread not found");
  const thread = threadRows[0];

  const homeRows = await db
    .select()
    .from(homes)
    .where(eq(homes.id, thread.homeId));
  const homeName = homeRows[0]?.name ?? "Unknown Home";

  await db
    .update(threads)
    .set({
      decision,
      decisionReason: reason ?? null,
      waitingOn: decision === "ACCEPTED" ? null : "COORDINATOR",
      updatedAt: new Date(),
    })
    .where(eq(threads.id, threadId));

  // If accepted → move referral to PLACED
  if (decision === "ACCEPTED") {
    await db
      .update(referrals)
      .set({ status: "PLACED" })
      .where(eq(referrals.id, thread.referralId));

    await db.insert(events).values({
      id: createId(),
      referralId: thread.referralId,
      type: "STATUS_CHANGE",
      payload: { from: "DECISION", to: "PLACED", changedBy: "System" },
      createdAt: new Date(),
    });

    // Decrement free beds
    if (homeRows[0]) {
      await db
        .update(homes)
        .set({ freeBeds: Math.max(0, homeRows[0].freeBeds - 1) })
        .where(eq(homes.id, thread.homeId));
    }
  }

  await db.insert(events).values({
    id: createId(),
    referralId: thread.referralId,
    type: "DECISION_MADE",
    payload: { homeName, decision, reason: reason ?? null },
    createdAt: new Date(),
  });

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/referral/${thread.referralId}`);
  revalidatePath("/home");
  revalidatePath(`/home/request/${threadId}`);
}

// ── Update Home Profile ──────────────────────────────────────────────────────

export async function updateHomeProfile(
  homeId: string,
  data: {
    freeBeds: number;
    constraints: HomeConstraints;
    capabilities: HomeCapabilities;
  }
) {
  await db
    .update(homes)
    .set({
      freeBeds: data.freeBeds,
      constraints: data.constraints,
      capabilities: data.capabilities,
    })
    .where(eq(homes.id, homeId));

  revalidatePath("/home/settings");
  revalidatePath("/home");
  revalidatePath("/coordinator");
}

// ── Simulate New Referral ────────────────────────────────────────────────────

const FIRST_NAMES_MALE = ["Oliver", "Leo", "Harry", "Finn", "George", "Ethan", "Lucas", "Max", "Charlie", "Jack"];
const FIRST_NAMES_FEMALE = ["Isla", "Amelia", "Mia", "Freya", "Poppy", "Ava", "Ella", "Daisy", "Grace", "Chloe"];
const LAST_NAMES = ["Smith", "Jones", "Davies", "Evans", "Thomas", "Roberts", "Walker", "Hughes", "Green", "Hall"];
const LOCATIONS = [
  { city: "Bristol", la: "Bristol City Council" },
  { city: "Bath", la: "Bath and NE Somerset" },
  { city: "Exeter", la: "Devon County Council" },
  { city: "Swindon", la: "Swindon Borough Council" },
  { city: "Gloucester", la: "Gloucestershire County Council" },
];
const MISSING_INFO_OPTIONS = [
  "No safeguarding plan attached",
  "GP details pending",
  "Previous placement history incomplete",
  "Education plan not received",
  "Social worker report missing",
  "Medical records outstanding",
  "Birth certificate not provided",
  "Legal status unclear",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(probability = 0.3): boolean {
  return Math.random() < probability;
}

export async function simulateReferral() {
  const gender: "male" | "female" = Math.random() > 0.5 ? "male" : "female";
  const firstName = pick(gender === "male" ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  const lastName = pick(LAST_NAMES);
  const age = Math.floor(Math.random() * 13) + 5; // 5–17
  const location = pick(LOCATIONS);

  const priorities: ("EMERGENCY" | "HIGH" | "NORMAL")[] = ["EMERGENCY", "HIGH", "NORMAL"];
  const weights = [0.2, 0.35, 0.45];
  const r = Math.random();
  const priority = r < weights[0] ? priorities[0] : r < weights[0] + weights[1] ? priorities[1] : priorities[2];

  const needs = {
    adhd: randomBool(0.3),
    diabetes: randomBool(0.15),
    trauma: randomBool(0.4),
    specialistStaff: randomBool(0.2),
    mentalHealth: randomBool(0.35),
    selfHarm: randomBool(0.15),
    violence: randomBool(0.1),
    absconding: randomBool(0.1),
  };

  // Triage score: base from priority + needs count + risk flags
  const priorityBase = priority === "EMERGENCY" ? 80 : priority === "HIGH" ? 60 : 40;
  const needsCount = Object.values(needs).filter(Boolean).length;
  const triageScore = Math.min(100, priorityBase + needsCount * 4 + Math.floor(Math.random() * 10));

  // Random missing info (0–3 items)
  const missingCount = Math.floor(Math.random() * 4);
  const shuffled = [...MISSING_INFO_OPTIONS].sort(() => Math.random() - 0.5);
  const missingInfo = shuffled.slice(0, missingCount);

  const refNum = Math.floor(Math.random() * 9000) + 1000;

  const referralId = createId();

  await db.insert(referrals).values({
    id: referralId,
    externalCaseRef: `REF-2026-${refNum}`,
    priority,
    status: "NEW",
    triageScore,
    childProfile: {
      name: `${firstName} ${lastName}`,
      age,
      gender,
      location: location.city,
      localAuthority: location.la,
    },
    needs,
    missingInfo,
    createdAt: new Date(),
  });

  await db.insert(events).values({
    id: createId(),
    referralId,
    type: "STATUS_CHANGE",
    payload: { from: null, to: "NEW", changedBy: "System (Simulated)" },
    createdAt: new Date(),
  });

  revalidatePath("/coordinator");
  return { name: `${firstName} ${lastName}`, priority };
}
