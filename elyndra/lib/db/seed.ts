import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { createId } from "@paralleldrive/cuid2";
import {
  homes,
  users,
  referrals,
  threads,
  messages,
  events,
} from "./schema";

dotenv.config({ path: "../.env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters for foreign keys)
  await db.delete(events);
  await db.delete(messages);
  await db.delete(threads);
  await db.delete(referrals);
  await db.delete(users);
  await db.delete(homes);

  // ── Homes ──────────────────────────────────────────────────────────────────

  const homeIds = {
    oakwood: createId(),
    riverside: createId(),
    maple: createId(),
    birchwood: createId(),
  };

  await db.insert(homes).values([
    {
      id: homeIds.oakwood,
      name: "Oakwood House",
      location: "Bristol",
      freeBeds: 2,
      constraints: {
        minAge: 8,
        maxAge: 14,
        genderAllowed: ["female"],
        notes: "Girls-only home, quiet residential area",
      },
      capabilities: {
        diabetesTrained: true,
        traumaInformed: true,
        adhdSupport: false,
        specialistStaff: true,
        mentalHealth: true,
      },
    },
    {
      id: homeIds.riverside,
      name: "Riverside Lodge",
      location: "Bath",
      freeBeds: 1,
      constraints: {
        minAge: 10,
        maxAge: 17,
        genderAllowed: ["male", "female"],
        notes: "Mixed home, close to specialist school",
      },
      capabilities: {
        diabetesTrained: false,
        traumaInformed: false,
        adhdSupport: true,
        specialistStaff: false,
        mentalHealth: true,
      },
      isRegistered: false,
    },
    {
      id: homeIds.maple,
      name: "Maple Court",
      location: "Exeter",
      freeBeds: 0,
      constraints: {
        minAge: 5,
        maxAge: 12,
        genderAllowed: ["female"],
        notes: "Full capacity — younger girls home",
      },
      capabilities: {
        diabetesTrained: false,
        traumaInformed: true,
        adhdSupport: true,
        specialistStaff: false,
        mentalHealth: false,
      },
    },
    {
      id: homeIds.birchwood,
      name: "Birchwood Place",
      location: "Bristol",
      freeBeds: 3,
      constraints: {
        minAge: 8,
        maxAge: 16,
        genderAllowed: ["male", "female"],
        notes: "Large mixed home with specialist wing",
      },
      capabilities: {
        diabetesTrained: true,
        traumaInformed: true,
        adhdSupport: true,
        specialistStaff: true,
        mentalHealth: true,
      },
    },
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────

  const userIds = {
    alice: createId(),
    bob: createId(),
    sarah: createId(),
    james: createId(),
    karen: createId(),
    mike: createId(),
  };

  await db.insert(users).values([
    { id: userIds.alice, name: "Alice Chen", role: "COORDINATOR", homeId: null },
    { id: userIds.bob, name: "Bob Patel", role: "COORDINATOR", homeId: null },
    { id: userIds.sarah, name: "Sarah Thompson", role: "HOME_MANAGER", homeId: homeIds.oakwood },
    { id: userIds.james, name: "James Wilson", role: "HOME_MANAGER", homeId: homeIds.riverside },
    { id: userIds.karen, name: "Karen Moore", role: "HOME_MANAGER", homeId: homeIds.maple },
    { id: userIds.mike, name: "Mike Brown", role: "HOME_MANAGER", homeId: homeIds.birchwood },
  ]);

  // ── Referrals ──────────────────────────────────────────────────────────────

  const refIds = {
    r1: createId(),
    r2: createId(),
    r3: createId(),
    r4: createId(),
    r5: createId(),
    r6: createId(),
  };

  await db.insert(referrals).values([
    {
      id: refIds.r1,
      externalCaseRef: "REF-2026-1042",
      priority: "EMERGENCY",
      status: "NEW",
      triageScore: 95,
      childProfile: {
        name: "Lily Harper",
        age: 11,
        gender: "female",
        location: "Bristol",
        localAuthority: "Bristol City Council",
      },
      needs: {
        adhd: false,
        diabetes: true,
        trauma: true,
        specialistStaff: true,
        mentalHealth: true,
        selfHarm: true,
        violence: false,
        absconding: false,
      },
      missingInfo: ["No safeguarding plan attached", "GP details pending"],
      legalStatus: {
        applicable: true,
        legalBasis: "SECURE_ACCOMMODATION_S25",
        orderRef: "SA-2026-0412",
        court: "Family Court, Bristol",
        dateMade: "2026-01-20",
        expiryDate: "2026-04-20",
        reviewDue: "2026-02-24",
        authorisedRestrictions: [
          "Locked doors overnight (22:00-07:00)",
          "Supervised internet access only",
          "No unsupervised community access",
        ],
        placementRegistered: null,
        notes: "Initial 3-month order. LA must file review paperwork 5 working days before review date.",
      },
      createdAt: new Date("2026-02-11T08:30:00Z"),
    },
    {
      id: refIds.r2,
      externalCaseRef: "REF-2026-1038",
      priority: "EMERGENCY",
      status: "OUTREACH",
      triageScore: 92,
      childProfile: {
        name: "Jake Morris",
        age: 15,
        gender: "male",
        location: "Bath",
        localAuthority: "Bath and NE Somerset",
      },
      needs: {
        adhd: true,
        diabetes: false,
        trauma: true,
        specialistStaff: false,
        mentalHealth: true,
        selfHarm: false,
        violence: true,
        absconding: true,
      },
      missingInfo: ["Previous placement history incomplete"],
      legalStatus: {
        applicable: true,
        legalBasis: "HIGH_COURT_INHERENT",
        orderRef: "HC-2026-0087",
        court: "Family Court, Bristol",
        dateMade: "2026-02-01",
        expiryDate: "2026-08-01",
        reviewDue: "2026-03-01",
        authorisedRestrictions: [
          "2:1 staffing supervision at all times",
          "No contact with father (injunction)",
          "GPS tracking device must be worn",
        ],
        placementRegistered: false,
        notes: "High Court inherent jurisdiction order. Placement is currently unregistered — Ofsted must be notified within 7 days.",
      },
      createdAt: new Date("2026-02-10T14:00:00Z"),
    },
    {
      id: refIds.r3,
      externalCaseRef: "REF-2026-1045",
      priority: "HIGH",
      status: "TRIAGED",
      triageScore: 78,
      childProfile: {
        name: "Emma Salter",
        age: 9,
        gender: "female",
        location: "Bristol",
        localAuthority: "Bristol City Council",
      },
      needs: {
        adhd: true,
        diabetes: false,
        trauma: false,
        specialistStaff: false,
        mentalHealth: false,
        selfHarm: false,
        violence: false,
        absconding: false,
      },
      missingInfo: [],
      createdAt: new Date("2026-02-11T10:15:00Z"),
    },
    {
      id: refIds.r4,
      externalCaseRef: "REF-2026-1031",
      priority: "HIGH",
      status: "AWAITING_RESPONSE",
      triageScore: 74,
      childProfile: {
        name: "Noah Clarke",
        age: 13,
        gender: "male",
        location: "Exeter",
        localAuthority: "Devon County Council",
      },
      needs: {
        adhd: false,
        diabetes: true,
        trauma: false,
        specialistStaff: true,
        mentalHealth: false,
        selfHarm: false,
        violence: false,
        absconding: false,
      },
      missingInfo: ["Education plan not received"],
      createdAt: new Date("2026-02-09T09:00:00Z"),
    },
    {
      id: refIds.r5,
      externalCaseRef: "REF-2026-1050",
      priority: "NORMAL",
      status: "NEW",
      triageScore: 52,
      childProfile: {
        name: "Sophie Williams",
        age: 10,
        gender: "female",
        location: "Bristol",
        localAuthority: "Bristol City Council",
      },
      needs: {
        adhd: false,
        diabetes: false,
        trauma: false,
        specialistStaff: false,
        mentalHealth: false,
        selfHarm: false,
        violence: false,
        absconding: false,
      },
      missingInfo: [],
      createdAt: new Date("2026-02-12T07:45:00Z"),
    },
    {
      id: refIds.r6,
      externalCaseRef: "REF-2026-1028",
      priority: "NORMAL",
      status: "PLACED",
      triageScore: 60,
      childProfile: {
        name: "Aiden Taylor",
        age: 12,
        gender: "male",
        location: "Bath",
        localAuthority: "Bath and NE Somerset",
      },
      needs: {
        adhd: true,
        diabetes: false,
        trauma: true,
        specialistStaff: false,
        mentalHealth: true,
        selfHarm: false,
        violence: false,
        absconding: false,
      },
      missingInfo: [],
      createdAt: new Date("2026-02-05T11:00:00Z"),
    },
  ]);

  // ── Threads ────────────────────────────────────────────────────────────────

  const threadIds = {
    t1: createId(),
    t2: createId(),
    t3: createId(),
    t4: createId(),
  };

  await db.insert(threads).values([
    // Jake Morris → Riverside Lodge (active, waiting on home)
    {
      id: threadIds.t1,
      referralId: refIds.r2,
      homeId: homeIds.riverside,
      waitingOn: "HOME",
      decision: null,
      createdAt: new Date("2026-02-10T16:00:00Z"),
      updatedAt: new Date("2026-02-11T09:00:00Z"),
    },
    // Noah Clarke → Birchwood Place (waiting on coordinator)
    {
      id: threadIds.t2,
      referralId: refIds.r4,
      homeId: homeIds.birchwood,
      waitingOn: "COORDINATOR",
      decision: null,
      createdAt: new Date("2026-02-09T14:00:00Z"),
      updatedAt: new Date("2026-02-10T10:30:00Z"),
    },
    // Aiden Taylor → Birchwood Place (accepted, placed)
    {
      id: threadIds.t3,
      referralId: refIds.r6,
      homeId: homeIds.birchwood,
      waitingOn: null,
      decision: "ACCEPTED",
      createdAt: new Date("2026-02-06T09:00:00Z"),
      updatedAt: new Date("2026-02-07T15:00:00Z"),
    },
    // Jake Morris → Birchwood Place (rejected)
    {
      id: threadIds.t4,
      referralId: refIds.r2,
      homeId: homeIds.birchwood,
      waitingOn: null,
      decision: "REJECTED",
      decisionReason: "Current mix already has two boys with behavioural needs, adding another high-risk case would destabilise the group.",
      createdAt: new Date("2026-02-10T15:00:00Z"),
      updatedAt: new Date("2026-02-10T15:45:00Z"),
    },
  ]);

  // ── Messages ───────────────────────────────────────────────────────────────

  await db.insert(messages).values([
    // Thread 1: Jake → Riverside
    {
      threadId: threadIds.t1,
      senderRole: "COORDINATOR",
      body: "Hi James, we have an emergency referral for Jake Morris (15M). He needs a placement urgently — his current arrangement has broken down. He has ADHD and trauma history. Could Riverside Lodge accommodate him?",
      createdAt: new Date("2026-02-10T16:05:00Z"),
    },
    {
      threadId: threadIds.t1,
      senderRole: "HOME_MANAGER",
      body: "Thanks for reaching out. We have one bed available. I see the violence and absconding flags — can you clarify the risk levels? We need to assess before committing.",
      createdAt: new Date("2026-02-10T17:30:00Z"),
    },
    {
      threadId: threadIds.t1,
      senderRole: "COORDINATOR",
      body: "The violence flag is from a single incident 6 months ago, no recurrence since. Absconding was two occasions from previous placement — believed to be placement-specific. I can send the full risk assessment.",
      createdAt: new Date("2026-02-11T09:00:00Z"),
    },
    // Thread 2: Noah → Birchwood
    {
      threadId: threadIds.t2,
      senderRole: "COORDINATOR",
      body: "Hi Mike, we are looking at placing Noah Clarke (13M) who needs diabetes-trained staff. Birchwood looks like a strong fit. Would you have capacity?",
      createdAt: new Date("2026-02-09T14:05:00Z"),
    },
    {
      threadId: threadIds.t2,
      senderRole: "HOME_MANAGER",
      body: "We can definitely accommodate Noah. We have 3 beds free and our nursing team is diabetes-trained. Can you send his education plan? We want to coordinate school enrolment early.",
      createdAt: new Date("2026-02-10T10:30:00Z"),
    },
    // Thread 3: Aiden → Birchwood (completed)
    {
      threadId: threadIds.t3,
      senderRole: "COORDINATOR",
      body: "Aiden Taylor (12M) needs a stable long-term placement. He has ADHD and trauma background but is doing well with consistent support. Birchwood a good fit?",
      createdAt: new Date("2026-02-06T09:05:00Z"),
    },
    {
      threadId: threadIds.t3,
      senderRole: "HOME_MANAGER",
      body: "Yes, we'd be happy to take Aiden. Our ADHD support programme is well-established and he'd fit well with the current group. Accepting placement.",
      createdAt: new Date("2026-02-07T15:00:00Z"),
    },
    // Thread 4: Jake → Birchwood (rejected)
    {
      threadId: threadIds.t4,
      senderRole: "COORDINATOR",
      body: "Hi Mike, emergency referral for Jake Morris (15M). ADHD, trauma, some violence and absconding history. Can Birchwood help?",
      createdAt: new Date("2026-02-10T15:05:00Z"),
    },
    {
      threadId: threadIds.t4,
      senderRole: "HOME_MANAGER",
      body: "I'm sorry, we need to decline this one. Our current mix already has two boys with behavioural needs, and adding another high-risk case could destabilise the group dynamic. I'd suggest trying a specialist unit.",
      createdAt: new Date("2026-02-10T15:45:00Z"),
    },
  ]);

  // ── Events (audit trail) ──────────────────────────────────────────────────

  await db.insert(events).values([
    // Jake Morris journey
    {
      referralId: refIds.r2,
      type: "STATUS_CHANGE",
      payload: { from: "NEW", to: "OUTREACH", changedBy: "Alice Chen" },
      createdAt: new Date("2026-02-10T15:00:00Z"),
    },
    {
      referralId: refIds.r2,
      type: "THREAD_CREATED",
      payload: { homeName: "Birchwood Place", createdBy: "Alice Chen" },
      createdAt: new Date("2026-02-10T15:00:00Z"),
    },
    {
      referralId: refIds.r2,
      type: "DECISION_MADE",
      payload: { homeName: "Birchwood Place", decision: "REJECTED", reason: "Current mix already has two boys with behavioural needs" },
      createdAt: new Date("2026-02-10T15:45:00Z"),
    },
    {
      referralId: refIds.r2,
      type: "THREAD_CREATED",
      payload: { homeName: "Riverside Lodge", createdBy: "Alice Chen" },
      createdAt: new Date("2026-02-10T16:00:00Z"),
    },
    // Noah Clarke journey
    {
      referralId: refIds.r4,
      type: "STATUS_CHANGE",
      payload: { from: "NEW", to: "TRIAGED", changedBy: "Bob Patel" },
      createdAt: new Date("2026-02-09T10:00:00Z"),
    },
    {
      referralId: refIds.r4,
      type: "STATUS_CHANGE",
      payload: { from: "TRIAGED", to: "OUTREACH", changedBy: "Bob Patel" },
      createdAt: new Date("2026-02-09T14:00:00Z"),
    },
    {
      referralId: refIds.r4,
      type: "THREAD_CREATED",
      payload: { homeName: "Birchwood Place", createdBy: "Bob Patel" },
      createdAt: new Date("2026-02-09T14:00:00Z"),
    },
    {
      referralId: refIds.r4,
      type: "STATUS_CHANGE",
      payload: { from: "OUTREACH", to: "AWAITING_RESPONSE", changedBy: "System" },
      createdAt: new Date("2026-02-10T10:30:00Z"),
    },
    // Aiden Taylor journey
    {
      referralId: refIds.r6,
      type: "STATUS_CHANGE",
      payload: { from: "NEW", to: "TRIAGED", changedBy: "Alice Chen" },
      createdAt: new Date("2026-02-05T12:00:00Z"),
    },
    {
      referralId: refIds.r6,
      type: "THREAD_CREATED",
      payload: { homeName: "Birchwood Place", createdBy: "Alice Chen" },
      createdAt: new Date("2026-02-06T09:00:00Z"),
    },
    {
      referralId: refIds.r6,
      type: "DECISION_MADE",
      payload: { homeName: "Birchwood Place", decision: "ACCEPTED" },
      createdAt: new Date("2026-02-07T15:00:00Z"),
    },
    {
      referralId: refIds.r6,
      type: "STATUS_CHANGE",
      payload: { from: "DECISION", to: "PLACED", changedBy: "Alice Chen" },
      createdAt: new Date("2026-02-07T16:00:00Z"),
    },
    // Emma Salter
    {
      referralId: refIds.r3,
      type: "STATUS_CHANGE",
      payload: { from: "NEW", to: "TRIAGED", changedBy: "Bob Patel" },
      createdAt: new Date("2026-02-11T11:00:00Z"),
    },
  ]);

  console.log("Seeding complete!");
  console.log("  - 4 homes");
  console.log("  - 6 users (2 coordinators + 4 home managers)");
  console.log("  - 6 referrals");
  console.log("  - 4 threads with messages");
  console.log("  - 13 audit events");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
