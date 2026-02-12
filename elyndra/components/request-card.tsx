"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NeedsChips, PRIORITY_CONFIG } from "@/components/referral-card";
import {
  Clock,
  AlertTriangle,
  Check,
  X,
  Eye,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type {
  Priority,
  ChildProfile,
  ChildNeeds,
  WaitingOn,
  Decision,
} from "@/lib/db/types";
import { getCoordinatorActivityStats } from "@/lib/activity-stats";

interface RequestCardProps {
  threadId: string;
  childProfile: ChildProfile;
  needs: ChildNeeds;
  priority: Priority;
  externalCaseRef: string;
  waitingOn: WaitingOn | null;
  decision: Decision | null;
  updatedAt: Date;
  createdAt: Date;
}

export function RequestCard({
  threadId,
  childProfile,
  needs,
  priority,
  externalCaseRef,
  waitingOn,
  decision,
  updatedAt,
  createdAt,
}: RequestCardProps) {
  const priorityConfig = PRIORITY_CONFIG[priority];
  const waitingTime = getWaitingTime(updatedAt);
  const coordStats = getCoordinatorActivityStats();

  return (
    <Card
      className="border-l-4 py-0"
      style={{
        borderLeftColor:
          priority === "EMERGENCY"
            ? "#ef4444"
            : priority === "HIGH"
            ? "#f59e0b"
            : "#22c55e",
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={priorityConfig.className}>
              {priority === "EMERGENCY" && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {priorityConfig.label}
            </Badge>
            {decision === "ACCEPTED" && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Accepted
              </Badge>
            )}
            {decision === "REJECTED" && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <X className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
            {!decision && waitingOn === "HOME" && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                Your Response Needed
              </Badge>
            )}
            {!decision && waitingOn === "COORDINATOR" && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Coordinator
              </Badge>
            )}
          </div>
          {waitingOn === "HOME" && !decision && (
            <span className="text-[10px] text-orange-600 font-medium shrink-0">
              Waiting {waitingTime}
            </span>
          )}
        </div>

        <div className="mb-2">
          <div className="font-semibold text-sm">{childProfile.name}</div>
          <div className="text-xs text-muted-foreground">
            {externalCaseRef} &middot;{" "}
            {childProfile.age}y {childProfile.gender === "male" ? "M" : "F"} &middot;{" "}
            {childProfile.location}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Coordinator online {coordStats.lastOnline}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Avg reply {coordStats.avgResponseTime}
          </span>
        </div>

        <NeedsChips needs={needs} />

        <div className="mt-3">
          <Link href={`/home/request/${threadId}`}>
            <Button variant="outline" size="sm" className="w-full text-xs">
              <Eye className="h-3 w-3 mr-1.5" />
              View Details & Respond
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function getWaitingTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "<1h";
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
