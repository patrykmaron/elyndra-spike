import { db } from "@/lib/db";
import {
  users,
  homes,
  referrals,
  threads,
  messages,
  events,
} from "@/lib/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";

// ── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      homeId: users.homeId,
      homeName: homes.name,
    })
    .from(users)
    .leftJoin(homes, eq(users.homeId, homes.id));
}

// ── Homes ────────────────────────────────────────────────────────────────────

export async function getAllHomes() {
  return db.select().from(homes);
}

export async function getHomeById(id: string) {
  const rows = await db.select().from(homes).where(eq(homes.id, id));
  return rows[0] ?? null;
}

// ── Referrals ────────────────────────────────────────────────────────────────

export async function getAllReferrals() {
  return db.select().from(referrals).orderBy(desc(referrals.createdAt));
}

export async function getReferralById(id: string) {
  const rows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.id, id));
  return rows[0] ?? null;
}

// ── Threads ──────────────────────────────────────────────────────────────────

export async function getThreadsForReferral(referralId: string) {
  return db
    .select({
      thread: threads,
      home: homes,
    })
    .from(threads)
    .innerJoin(homes, eq(threads.homeId, homes.id))
    .where(eq(threads.referralId, referralId))
    .orderBy(desc(threads.updatedAt));
}

export async function getThreadsForHome(homeId: string) {
  return db
    .select({
      thread: threads,
      referral: referrals,
      home: homes,
    })
    .from(threads)
    .innerJoin(referrals, eq(threads.referralId, referrals.id))
    .innerJoin(homes, eq(threads.homeId, homes.id))
    .where(eq(threads.homeId, homeId))
    .orderBy(desc(threads.updatedAt));
}

export async function getThreadById(threadId: string) {
  const rows = await db
    .select({
      thread: threads,
      referral: referrals,
      home: homes,
    })
    .from(threads)
    .innerJoin(referrals, eq(threads.referralId, referrals.id))
    .innerJoin(homes, eq(threads.homeId, homes.id))
    .where(eq(threads.id, threadId));
  return rows[0] ?? null;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesForThread(threadId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt));
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEventsForReferral(referralId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.referralId, referralId))
    .orderBy(desc(events.createdAt));
}

// ── Last message per thread ──────────────────────────────────────────────────

export async function getLastMessageForThread(threadId: string) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
