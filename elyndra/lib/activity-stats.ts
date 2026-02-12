// Hardcoded activity/engagement metrics for demo purposes.
// In production these would be computed from real event data.

export interface HomeActivityStats {
  lastOnline: string;       // e.g. "2m ago"
  avgResponseTime: string;  // e.g. "1.5h"
  acceptanceRate: number;   // 0–100
}

export interface CoordinatorActivityStats {
  lastOnline: string;
  avgResponseTime: string;
}

// ── Deterministic pseudo-random picker based on string hash ────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── Pool of realistic home stats ──────────────────────────────────────────

const HOME_STATS_POOL: HomeActivityStats[] = [
  { lastOnline: "2m ago",  avgResponseTime: "1.2h",  acceptanceRate: 82 },
  { lastOnline: "15m ago", avgResponseTime: "2.5h",  acceptanceRate: 74 },
  { lastOnline: "1h ago",  avgResponseTime: "45min", acceptanceRate: 91 },
  { lastOnline: "3h ago",  avgResponseTime: "4h",    acceptanceRate: 68 },
  { lastOnline: "5m ago",  avgResponseTime: "1.8h",  acceptanceRate: 86 },
  { lastOnline: "30m ago", avgResponseTime: "3h",    acceptanceRate: 55 },
  { lastOnline: "just now", avgResponseTime: "50min", acceptanceRate: 93 },
  { lastOnline: "8m ago",  avgResponseTime: "2h",    acceptanceRate: 79 },
];

/**
 * Returns hardcoded activity stats for a given home.
 * Uses a hash of the homeId to deterministically pick from the pool
 * so the same home always gets the same stats within a session.
 */
export function getHomeActivityStats(homeId: string): HomeActivityStats {
  const index = simpleHash(homeId) % HOME_STATS_POOL.length;
  return HOME_STATS_POOL[index];
}

/**
 * Returns hardcoded coordinator activity stats (single persona for demo).
 */
export function getCoordinatorActivityStats(): CoordinatorActivityStats {
  return {
    lastOnline: "5m ago",
    avgResponseTime: "45min",
  };
}
