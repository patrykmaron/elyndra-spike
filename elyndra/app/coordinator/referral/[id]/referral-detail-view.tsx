"use client";

import { ChildProfile } from "@/components/child-profile";
import { SuggestedHomes } from "@/components/suggested-homes";
import { ThreadList } from "@/components/thread-list";
import { ActivityFeed } from "@/components/activity-feed";
import { SuggestedActionsPanel } from "@/components/suggested-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS } from "@/components/referral-card";
import type { Priority, Status, ChildProfile as ChildProfileType, ChildNeeds, WaitingOn, Decision, Role, MessageType } from "@/lib/db/types";
import type { HomeMatch } from "@/lib/matching";

interface ReferralData {
  id: string;
  externalCaseRef: string;
  priority: Priority;
  status: Status;
  triageScore: number;
  childProfile: ChildProfileType;
  needs: ChildNeeds;
  missingInfo: string[];
}

interface ThreadData {
  id: string;
  homeId: string;
  homeName: string;
  homeLocation: string;
  waitingOn: WaitingOn | null;
  decision: Decision | null;
  decisionReason: string | null;
  updatedAt: Date;
  messages: {
    id: string;
    senderRole: Role;
    type: MessageType;
    body: string;
    metadata: Record<string, string> | null;
    createdAt: Date;
  }[];
}

interface EventData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

interface ReferralDetailViewProps {
  referral: ReferralData;
  threads: ThreadData[];
  matches: HomeMatch[];
  events: EventData[];
}

export function ReferralDetailView({
  referral,
  threads,
  matches,
  events,
}: ReferralDetailViewProps) {
  return (
    <div>
      {/* Back button + status header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/coordinator">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <Badge variant="outline" className="text-xs">
          {STATUS_LABELS[referral.status]}
        </Badge>
      </div>

      {/* AI Suggested Actions */}
      <SuggestedActionsPanel
        referral={referral}
        matches={matches}
        threads={threads}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Child Profile (2 cols) */}
        <div className="lg:col-span-2">
          <ChildProfile
            externalCaseRef={referral.externalCaseRef}
            priority={referral.priority}
            triageScore={referral.triageScore}
            childProfile={referral.childProfile}
            needs={referral.needs}
            missingInfo={referral.missingInfo}
          />
        </div>

        {/* Right: Placement Workflow (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <SuggestedHomes
            matches={matches}
            referralId={referral.id}
            referralContext={{
              childProfile: referral.childProfile,
              needs: referral.needs,
              priority: referral.priority,
              triageScore: referral.triageScore,
              missingInfo: referral.missingInfo,
            }}
          />
          <ThreadList threads={threads} />
          <ActivityFeed events={events} />
        </div>
      </div>
    </div>
  );
}
