"use client";

import { useState } from "react";
import { ChildProfile } from "@/components/child-profile";
import { SuggestedHomes } from "@/components/suggested-homes";
import { ThreadList } from "@/components/thread-list";
import { ActivityFeed } from "@/components/activity-feed";
import { SuggestedActionsPanel } from "@/components/suggested-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Loader2, AlertTriangle, X, RotateCcw, Scale, ArrowRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS } from "@/components/referral-card";
import { generateComplianceAdvice, type ComplianceAdvice } from "@/lib/generate-compliance";
import type { Priority, Status, ChildProfile as ChildProfileType, ChildNeeds, WaitingOn, Decision, Role, MessageType, LegalStatus } from "@/lib/db/types";
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
  legalStatus: LegalStatus | null;
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

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: "High Risk", className: "bg-red-100 text-red-800 border-red-200" },
  medium: { label: "Medium Risk", className: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "Low Risk", className: "bg-green-100 text-green-800 border-green-200" },
};

export function ReferralDetailView({
  referral,
  threads,
  matches,
  events,
}: ReferralDetailViewProps) {
  const [complianceData, setComplianceData] = useState<ComplianceAdvice | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);

  const hasDoL = referral.legalStatus?.applicable === true;

  const handleComplianceCheck = async () => {
    if (!referral.legalStatus?.applicable) return;
    setComplianceLoading(true);
    setComplianceOpen(true);
    try {
      const homeSummaries = matches.map((m) => ({
        name: m.homeName,
        location: m.location,
        isRegistered: m.eligible, // approximation - we know ineligible ones are unregistered for DoL
        hasThread: m.existingThreadId !== null,
        decision: threads.find((t) => t.homeId === m.homeId)?.decision ?? null,
      }));
      const result = await generateComplianceAdvice({
        referral: {
          externalCaseRef: referral.externalCaseRef,
          priority: referral.priority,
          childProfile: referral.childProfile,
          needs: referral.needs,
          missingInfo: referral.missingInfo,
          legalStatus: referral.legalStatus,
        },
        homes: homeSummaries,
      });
      setComplianceData(result);
    } catch (err) {
      console.error("Compliance check failed:", err);
      setComplianceData({
        riskLevel: "medium",
        obligations: [],
        warnings: ["Unable to generate compliance advice. Please try again."],
        recommendations: [],
      });
    } finally {
      setComplianceLoading(false);
    }
  };

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
        {hasDoL && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="h-3 w-3 mr-1" />
            DoL
          </Badge>
        )}
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
        <div className="lg:col-span-2 space-y-4">
          <ChildProfile
            externalCaseRef={referral.externalCaseRef}
            priority={referral.priority}
            triageScore={referral.triageScore}
            childProfile={referral.childProfile}
            needs={referral.needs}
            missingInfo={referral.missingInfo}
            legalStatus={referral.legalStatus}
          />

          {/* AI Compliance Check */}
          {hasDoL && (
            <div>
              {!complianceOpen ? (
                <Button
                  onClick={handleComplianceCheck}
                  variant="outline"
                  className="w-full gap-2 border-dashed border-red-300 text-red-700 hover:bg-red-50"
                  disabled={complianceLoading}
                >
                  <Scale className="h-4 w-4" />
                  AI Compliance Check
                </Button>
              ) : (
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                        <Scale className="h-4 w-4" />
                        AI Compliance Check
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {complianceData && (
                          <Badge variant="outline" className={`text-[10px] ${RISK_CONFIG[complianceData.riskLevel]?.className ?? ""}`}>
                            {RISK_CONFIG[complianceData.riskLevel]?.label ?? complianceData.riskLevel}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={handleComplianceCheck}
                          disabled={complianceLoading}
                        >
                          {complianceLoading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-1" />
                          )}
                          Refresh
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setComplianceOpen(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    {complianceLoading && !complianceData ? (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analysing compliance requirements...
                      </div>
                    ) : complianceData ? (
                      <>
                        {/* Obligations */}
                        {complianceData.obligations.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                              Legal Obligations
                            </p>
                            <ul className="space-y-1">
                              {complianceData.obligations.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs">
                                  <Scale className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Warnings */}
                        {complianceData.warnings.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                              Compliance Warnings
                            </p>
                            <div className="space-y-1.5">
                              {complianceData.warnings.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 rounded-md border bg-amber-50 border-amber-200 px-3 py-2 text-xs"
                                >
                                  <CircleAlert className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {complianceData.recommendations.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                              Recommendations
                            </p>
                            <ul className="space-y-1">
                              {complianceData.recommendations.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs">
                                  <ArrowRight className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
