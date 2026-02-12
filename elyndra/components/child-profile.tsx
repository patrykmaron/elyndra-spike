import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NeedsChips, PRIORITY_CONFIG } from "@/components/referral-card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AlertTriangle, FileWarning, Info, MapPin, User, Shield, Calendar, Lock } from "lucide-react";
import type { Priority, ChildProfile as ChildProfileType, ChildNeeds, LegalStatus } from "@/lib/db/types";

const LEGAL_BASIS_LABELS: Record<string, string> = {
  NONE: "None",
  COURT_OF_PROTECTION: "Court of Protection",
  HIGH_COURT_INHERENT: "High Court Inherent Jurisdiction",
  SECURE_ACCOMMODATION_S25: "Secure Accommodation (S.25)",
  MHA: "Mental Health Act",
  OTHER: "Other Legal Basis",
};

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface ChildProfileProps {
  externalCaseRef: string;
  priority: Priority;
  triageScore: number;
  childProfile: ChildProfileType;
  needs: ChildNeeds;
  missingInfo: string[];
  legalStatus?: LegalStatus | null;
}

export function ChildProfile({
  externalCaseRef,
  priority,
  triageScore,
  childProfile,
  needs,
  missingInfo,
  legalStatus,
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

      {/* Legal / Restrictions (DoL) */}
      {legalStatus?.applicable && (
        <Card className="border-red-300 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-800">
              <Shield className="h-4 w-4" />
              Deprivation of Liberty &mdash; {LEGAL_BASIS_LABELS[legalStatus.legalBasis] ?? legalStatus.legalBasis}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Order details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {legalStatus.orderRef && (
                <div>
                  <span className="text-muted-foreground">Order Ref:</span>{" "}
                  <span className="font-medium">{legalStatus.orderRef}</span>
                </div>
              )}
              {legalStatus.court && (
                <div>
                  <span className="text-muted-foreground">Court:</span>{" "}
                  <span className="font-medium">{legalStatus.court}</span>
                </div>
              )}
              {legalStatus.dateMade && (
                <div>
                  <span className="text-muted-foreground">Date Made:</span>{" "}
                  <span className="font-medium">
                    {new Date(legalStatus.dateMade).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
              {legalStatus.expiryDate && (
                <div>
                  <span className="text-muted-foreground">Expires:</span>{" "}
                  <span className="font-medium">
                    {new Date(legalStatus.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {/* Review countdown */}
            {legalStatus.reviewDue && (() => {
              const daysUntil = getDaysUntil(legalStatus.reviewDue!);
              const isUrgent = daysUntil <= 14;
              const isPast = daysUntil < 0;
              return (
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium border ${
                  isPast
                    ? "bg-red-100 text-red-800 border-red-300"
                    : isUrgent
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}>
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {isPast
                    ? `Review overdue by ${Math.abs(daysUntil)} days (was ${new Date(legalStatus.reviewDue!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`
                    : `Review due in ${daysUntil} days (${new Date(legalStatus.reviewDue!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`}
                </div>
              );
            })()}

            {/* Authorised restrictions */}
            {legalStatus.authorisedRestrictions && legalStatus.authorisedRestrictions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Authorised Restrictions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {legalStatus.authorisedRestrictions.map((restriction, i) => (
                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      {restriction}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Placement registration warnings */}
            {legalStatus.placementRegistered === false && (
              <div className="flex items-start gap-2 rounded-md bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Placement is unregistered &mdash; Ofsted notification required within 7 days</span>
              </div>
            )}
            {legalStatus.placementRegistered === null && (
              <div className="flex items-start gap-2 rounded-md bg-amber-100 border border-amber-300 px-3 py-2 text-xs text-amber-800 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Registration status not confirmed &mdash; verify before proceeding</span>
              </div>
            )}

            {/* Notes */}
            {legalStatus.notes && (
              <p className="text-xs text-red-700 italic">{legalStatus.notes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
