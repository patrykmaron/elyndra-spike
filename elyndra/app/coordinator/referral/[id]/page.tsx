import { getReferralById, getThreadsForReferral, getMessagesForThread, getEventsForReferral } from "@/lib/queries";
import { getMatchingSuggestions } from "@/lib/matching";
import { notFound } from "next/navigation";
import { ReferralDetailView } from "./referral-detail-view";
import type { ChildProfile, ChildNeeds } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const referral = await getReferralById(id);
  if (!referral) notFound();

  const [threadRows, matches, eventRows] = await Promise.all([
    getThreadsForReferral(id),
    getMatchingSuggestions(id),
    getEventsForReferral(id),
  ]);

  // Enrich threads with messages
  const threadsWithMessages = await Promise.all(
    threadRows.map(async (row) => {
      const msgs = await getMessagesForThread(row.thread.id);
      return {
        id: row.thread.id,
        homeName: row.home.name,
        homeLocation: row.home.location,
        waitingOn: row.thread.waitingOn,
        decision: row.thread.decision,
        decisionReason: row.thread.decisionReason,
        updatedAt: row.thread.updatedAt,
        messages: msgs.map((m) => ({
          id: m.id,
          senderRole: m.senderRole,
          body: m.body,
          createdAt: m.createdAt,
        })),
      };
    })
  );

  const events = eventRows.map((e) => ({
    id: e.id,
    type: e.type,
    payload: e.payload as Record<string, unknown>,
    createdAt: e.createdAt,
  }));

  return (
    <ReferralDetailView
      referral={{
        id: referral.id,
        externalCaseRef: referral.externalCaseRef,
        priority: referral.priority,
        status: referral.status,
        triageScore: referral.triageScore,
        childProfile: referral.childProfile as ChildProfile,
        needs: referral.needs as ChildNeeds,
        missingInfo: referral.missingInfo as string[],
      }}
      threads={threadsWithMessages}
      matches={matches}
      events={events}
    />
  );
}
