"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Info,
  FileWarning,
} from "lucide-react";
import Link from "next/link";
import type { Status, Priority, ChildProfile, ChildNeeds } from "@/lib/db/types";
import { updateReferralStatus } from "@/lib/actions";
import { useRole } from "@/lib/role-context";

interface ReferralCardProps {
  id: string;
  externalCaseRef: string;
  priority: Priority;
  status: Status;
  triageScore: number;
  childProfile: ChildProfile;
  needs: ChildNeeds;
  missingInfo: string[];
  createdAt: Date;
  waitingOnHome?: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  EMERGENCY: {
    label: "Emergency",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  HIGH: {
    label: "High",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  NORMAL: {
    label: "Normal",
    className: "bg-green-100 text-green-800 border-green-200",
  },
};

const STATUSES: Status[] = [
  "NEW",
  "TRIAGED",
  "OUTREACH",
  "AWAITING_RESPONSE",
  "DECISION",
  "PLACED",
  "CLOSED",
];

const STATUS_LABELS: Record<Status, string> = {
  NEW: "New",
  TRIAGED: "Triaged",
  OUTREACH: "Outreach",
  AWAITING_RESPONSE: "Awaiting Response",
  DECISION: "Decision",
  PLACED: "Placed",
  CLOSED: "Closed",
};

function NeedsChips({ needs }: { needs: ChildNeeds }) {
  const chips: { label: string; className: string }[] = [];
  if (needs.diabetes) chips.push({ label: "Diabetes", className: "bg-blue-100 text-blue-700" });
  if (needs.adhd) chips.push({ label: "ADHD", className: "bg-purple-100 text-purple-700" });
  if (needs.trauma) chips.push({ label: "Trauma", className: "bg-rose-100 text-rose-700" });
  if (needs.specialistStaff) chips.push({ label: "Specialist", className: "bg-teal-100 text-teal-700" });
  if (needs.mentalHealth) chips.push({ label: "Mental Health", className: "bg-indigo-100 text-indigo-700" });
  if (needs.selfHarm) chips.push({ label: "Self-harm", className: "bg-red-100 text-red-700" });
  if (needs.violence) chips.push({ label: "Violence", className: "bg-orange-100 text-orange-700" });
  if (needs.absconding) chips.push({ label: "Absconding", className: "bg-yellow-100 text-yellow-700" });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function ReferralCard({
  id,
  externalCaseRef,
  priority,
  status,
  triageScore,
  childProfile,
  needs,
  missingInfo,
  createdAt,
  waitingOnHome,
}: ReferralCardProps) {
  const { currentUser } = useRole();
  const priorityConfig = PRIORITY_CONFIG[priority];

  const handleStatusChange = async (newStatus: Status) => {
    await updateReferralStatus(id, newStatus, currentUser?.name ?? "Unknown");
  };

  const timeAgo = getTimeAgo(createdAt);

  return (
    <Link href={`/coordinator/referral/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 py-0"
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
              {waitingOnHome && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Awaiting Home
                </Badge>
              )}
              {missingInfo.length > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <FileWarning className="h-3 w-3 mr-1" />
                  {missingInfo.length} missing
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="h-7 text-xs" />}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                Move to <ChevronDown className="h-3 w-3 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                {STATUSES.filter((s) => s !== status).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mb-1.5">
            <div className="font-semibold text-sm">{childProfile.name}</div>
            <div className="text-xs text-muted-foreground">
              {externalCaseRef} &middot;{" "}
              {childProfile.age}y {childProfile.gender === "male" ? "M" : "F"} &middot;{" "}
              {childProfile.location}
            </div>
          </div>

          <NeedsChips needs={needs} />

          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                Score: {triageScore}
                <Info className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs">Triage score (0–100) based on priority, care needs, and risk flags. Higher = more urgent.</p>
              </TooltipContent>
            </Tooltip>
            <span>{timeAgo}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export { NeedsChips, PRIORITY_CONFIG, STATUS_LABELS, STATUSES };
