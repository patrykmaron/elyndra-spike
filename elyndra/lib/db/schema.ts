import { pgTable, pgEnum, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["COORDINATOR", "HOME_MANAGER"]);
export const priorityEnum = pgEnum("priority", ["EMERGENCY", "HIGH", "NORMAL"]);
export const statusEnum = pgEnum("status", [
  "NEW",
  "TRIAGED",
  "OUTREACH",
  "AWAITING_RESPONSE",
  "DECISION",
  "PLACED",
  "CLOSED",
]);
export const waitingOnEnum = pgEnum("waiting_on", ["HOME", "COORDINATOR"]);
export const decisionEnum = pgEnum("decision", ["ACCEPTED", "REJECTED"]);
export const messageTypeEnum = pgEnum("message_type", [
  "message",
  "phone_call",
  "meeting_note",
  "document",
  "note",
]);

// ── Tables ───────────────────────────────────────────────────────────────────

export const homes = pgTable("homes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  location: text("location").notNull(),
  freeBeds: integer("free_beds").notNull(),
  constraints: jsonb("constraints").notNull().$type<{
    minAge: number;
    maxAge: number;
    genderAllowed: ("male" | "female")[];
    notes?: string;
  }>(),
  capabilities: jsonb("capabilities").notNull().$type<{
    diabetesTrained: boolean;
    traumaInformed: boolean;
    adhdSupport: boolean;
    specialistStaff: boolean;
    mentalHealth: boolean;
  }>(),
});

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  homeId: text("home_id").references(() => homes.id),
});

export const referrals = pgTable("referrals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  externalCaseRef: text("external_case_ref").notNull(),
  priority: priorityEnum("priority").notNull(),
  status: statusEnum("status").notNull().default("NEW"),
  triageScore: integer("triage_score").notNull(),
  childProfile: jsonb("child_profile").notNull().$type<{
    name: string;
    age: number;
    gender: "male" | "female";
    location: string;
    localAuthority: string;
  }>(),
  needs: jsonb("needs").notNull().$type<{
    adhd: boolean;
    diabetes: boolean;
    trauma: boolean;
    specialistStaff: boolean;
    mentalHealth: boolean;
    selfHarm: boolean;
    violence: boolean;
    absconding: boolean;
  }>(),
  missingInfo: jsonb("missing_info").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const threads = pgTable("threads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  referralId: text("referral_id")
    .references(() => referrals.id)
    .notNull(),
  homeId: text("home_id")
    .references(() => homes.id)
    .notNull(),
  waitingOn: waitingOnEnum("waiting_on"),
  decision: decisionEnum("decision"),
  decisionReason: text("decision_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  threadId: text("thread_id")
    .references(() => threads.id)
    .notNull(),
  senderRole: roleEnum("sender_role").notNull(),
  type: messageTypeEnum("type").notNull().default("message"),
  body: text("body").notNull(),
  metadata: jsonb("metadata").$type<Record<string, string> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  referralId: text("referral_id")
    .references(() => referrals.id)
    .notNull(),
  type: text("type").notNull(), // STATUS_CHANGE | MESSAGE_SENT | DECISION_MADE | THREAD_CREATED
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ────────────────────────────────────────────────────────────────

export const homesRelations = relations(homes, ({ many }) => ({
  users: many(users),
  threads: many(threads),
}));

export const usersRelations = relations(users, ({ one }) => ({
  home: one(homes, { fields: [users.homeId], references: [homes.id] }),
}));

export const referralsRelations = relations(referrals, ({ many }) => ({
  threads: many(threads),
  events: many(events),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  referral: one(referrals, { fields: [threads.referralId], references: [referrals.id] }),
  home: one(homes, { fields: [threads.homeId], references: [homes.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, { fields: [messages.threadId], references: [threads.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  referral: one(referrals, { fields: [events.referralId], references: [referrals.id] }),
}));
