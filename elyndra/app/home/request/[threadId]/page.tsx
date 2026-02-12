import { getThreadById, getMessagesForThread } from "@/lib/queries";
import { notFound } from "next/navigation";
import { RequestDetailView } from "./request-detail-view";
import type { ChildProfile, ChildNeeds, HomeConstraints, HomeCapabilities, LegalStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const threadData = await getThreadById(threadId);
  if (!threadData) notFound();

  const msgs = await getMessagesForThread(threadId);

  return (
    <RequestDetailView
      thread={{
        id: threadData.thread.id,
        referralId: threadData.thread.referralId,
        waitingOn: threadData.thread.waitingOn,
        decision: threadData.thread.decision,
        decisionReason: threadData.thread.decisionReason,
        updatedAt: threadData.thread.updatedAt,
      }}
      referral={{
        externalCaseRef: threadData.referral.externalCaseRef,
        priority: threadData.referral.priority,
        childProfile: threadData.referral.childProfile as ChildProfile,
        needs: threadData.referral.needs as ChildNeeds,
        missingInfo: threadData.referral.missingInfo as string[],
        legalStatus: (threadData.referral.legalStatus as LegalStatus) ?? null,
      }}
      home={{
        name: threadData.home.name,
        location: threadData.home.location,
        freeBeds: threadData.home.freeBeds,
        constraints: threadData.home.constraints as HomeConstraints,
        capabilities: threadData.home.capabilities as HomeCapabilities,
      }}
      messages={msgs.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        type: m.type,
        body: m.body,
        metadata: m.metadata as Record<string, string> | null,
        createdAt: m.createdAt,
      }))}
    />
  );
}
