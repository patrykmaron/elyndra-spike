import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NeedsChips, PRIORITY_CONFIG } from "@/components/referral-card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AlertTriangle, FileWarning, Info, MapPin, User } from "lucide-react";
import type { Priority, ChildProfile as ChildProfileType, ChildNeeds } from "@/lib/db/types";

interface ChildProfileProps {
  externalCaseRef: string;
  priority: Priority;
  triageScore: number;
  childProfile: ChildProfileType;
  needs: ChildNeeds;
  missingInfo: string[];
}

export function ChildProfile({
  externalCaseRef,
  priority,
  triageScore,
  childProfile,
  needs,
  missingInfo,
}: ChildProfileProps) {
  const priorityConfig = PRIORITY_CONFIG[priority];

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{childProfile.name}</CardTitle>
            <Badge variant="outline" className={priorityConfig.className}>
              {priority === "EMERGENCY" && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {priorityConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{externalCaseRef}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {childProfile.age} years, {childProfile.gender === "male" ? "Male" : "Female"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{childProfile.location}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            LA: {childProfile.localAuthority}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground cursor-help">
                Triage Score
                <Info className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[220px] text-xs">Urgency score (0–100) derived from priority level, number of care needs, and risk flags. Higher scores indicate cases needing faster action.</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${triageScore}%`,
                  backgroundColor:
                    triageScore >= 80
                      ? "#ef4444"
                      : triageScore >= 60
                      ? "#f59e0b"
                      : "#22c55e",
                }}
              />
            </div>
            <span className="text-xs font-semibold">{triageScore}</span>
          </div>
        </CardContent>
      </Card>

      {/* Needs & Flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Care Needs & Risk Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <NeedsChips needs={needs} />
          {Object.values(needs).every((v) => !v) && (
            <p className="text-xs text-muted-foreground">No specific care needs flagged</p>
          )}
        </CardContent>
      </Card>

      {/* Missing Info */}
      {missingInfo.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-800">
              <FileWarning className="h-4 w-4" />
              Missing Information ({missingInfo.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {missingInfo.map((info, i) => (
                <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                  {info}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
