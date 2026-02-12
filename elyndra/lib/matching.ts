import { db } from "@/lib/db";
import { homes, referrals, threads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { HomeConstraints, HomeCapabilities, ChildProfile, ChildNeeds, LegalStatus } from "@/lib/db/types";

export type ReasonLevel = "pass" | "warn" | "fail";

export interface MatchReason {
  level: ReasonLevel;
  text: string;
}

export interface HomeMatch {
  homeId: string;
  homeName: string;
  location: string;
  freeBeds: number;
  score: number;        // 0–100
  eligible: boolean;    // false if any hard filter fails
  reasons: MatchReason[];
  existingThreadId: string | null;
}

export async function getMatchingSuggestions(
  referralId: string
): Promise<HomeMatch[]> {
  // Fetch referral
  const refRows = await db
    .select()
    .from(referrals)
    .where(eq(referrals.id, referralId));
  if (!refRows[0]) return [];
  const ref = refRows[0];
  const profile = ref.childProfile as ChildProfile;
  const needs = ref.needs as ChildNeeds;
  const legalStatus = ref.legalStatus as LegalStatus | null;
  const hasDoL = legalStatus?.applicable === true;

  // Fetch all homes
  const allHomes = await db.select().from(homes);

  // Fetch existing threads for this referral to mark already-contacted homes
  const existingThreads = await db
    .select()
    .from(threads)
    .where(eq(threads.referralId, referralId));
  const threadByHome = new Map(
    existingThreads.map((t) => [t.homeId, t.id])
  );

  const results: HomeMatch[] = allHomes.map((home) => {
    const constraints = home.constraints as HomeConstraints;
    const capabilities = home.capabilities as HomeCapabilities;
    const reasons: MatchReason[] = [];
    let eligible = true;
    let score = 50; // base score

    // ── Hard filters ─────────────────────────────────────────────────────

    // Free beds
    if (home.freeBeds <= 0) {
      eligible = false;
      reasons.push({ level: "fail", text: "No free beds" });
    } else {
      reasons.push({
        level: "pass",
        text: `${home.freeBeds} bed${home.freeBeds > 1 ? "s" : ""} available`,
      });
    }

    // Gender
    if (!constraints.genderAllowed.includes(profile.gender)) {
      eligible = false;
      reasons.push({
        level: "fail",
        text: `Cannot accept ${profile.gender} aged ${profile.age}`,
      });
    } else {
      reasons.push({
        level: "pass",
        text: `Accepts ${profile.gender} children`,
      });
    }

    // Age range
    if (profile.age < constraints.minAge || profile.age > constraints.maxAge) {
      eligible = false;
      reasons.push({
        level: "fail",
        text: `Age ${profile.age} outside range (${constraints.minAge}–${constraints.maxAge})`,
      });
    } else {
      reasons.push({
        level: "pass",
        text: `Age ${profile.age} within range (${constraints.minAge}–${constraints.maxAge})`,
      });
    }

    // ── Soft scoring ─────────────────────────────────────────────────────

    // Capability matching
    if (needs.diabetes) {
      if (capabilities.diabetesTrained) {
        score += 15;
        reasons.push({ level: "pass", text: "Has diabetes-trained staff" });
      } else {
        score -= 10;
        reasons.push({ level: "warn", text: "No diabetes-trained staff" });
      }
    }

    if (needs.trauma) {
      if (capabilities.traumaInformed) {
        score += 15;
        reasons.push({ level: "pass", text: "Trauma-informed care available" });
      } else {
        score -= 10;
        reasons.push({ level: "warn", text: "Not trauma-informed" });
      }
    }

    if (needs.adhd) {
      if (capabilities.adhdSupport) {
        score += 15;
        reasons.push({ level: "pass", text: "ADHD support programme" });
      } else {
        score -= 10;
        reasons.push({ level: "warn", text: "No dedicated ADHD support" });
      }
    }

    if (needs.specialistStaff) {
      if (capabilities.specialistStaff) {
        score += 10;
        reasons.push({ level: "pass", text: "Specialist staff on-site" });
      } else {
        score -= 5;
        reasons.push({ level: "warn", text: "No specialist staff" });
      }
    }

    if (needs.mentalHealth) {
      if (capabilities.mentalHealth) {
        score += 10;
        reasons.push({ level: "pass", text: "Mental health support available" });
      } else {
        score -= 5;
        reasons.push({ level: "warn", text: "Limited mental health support" });
      }
    }

    // Location bonus
    if (
      home.location.toLowerCase() === profile.location.toLowerCase()
    ) {
      score += 10;
      reasons.push({ level: "pass", text: `Same area (${home.location})` });
    }

    // DoL / registration checks
    if (hasDoL) {
      if (home.isRegistered === false) {
        eligible = false;
        reasons.push({
          level: "fail",
          text: "Home is unregistered (DoL placement requires Ofsted-registered home)",
        });
      } else {
        reasons.push({
          level: "pass",
          text: "Home is Ofsted-registered",
        });
      }
      reasons.push({
        level: "warn",
        text: "DoL restrictions apply — verify home can meet authorised conditions",
      });
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
      homeId: home.id,
      homeName: home.name,
      location: home.location,
      freeBeds: home.freeBeds,
      score: eligible ? score : 0,
      eligible,
      reasons,
      existingThreadId: threadByHome.get(home.id) ?? null,
    };
  });

  // Sort: eligible first (by score desc), then ineligible
  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.score - a.score;
  });
}
