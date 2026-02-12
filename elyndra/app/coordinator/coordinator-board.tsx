"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReferralCard, STATUS_LABELS } from "@/components/referral-card";
import { simulateReferral } from "@/lib/actions";
import type { Status, Priority, ChildProfile, ChildNeeds, LegalStatus } from "@/lib/db/types";
import { Inbox, Plus, Sparkles } from "lucide-react";

interface Referral {
  id: string;
  externalCaseRef: string;
  priority: Priority;
  status: Status;
  triageScore: number;
  childProfile: unknown;
  needs: unknown;
  missingInfo: unknown;
  legalStatus: unknown;
  createdAt: Date;
}

interface CoordinatorBoardProps {
  referrals: Referral[];
}

const TAB_STATUSES: Status[] = [
  "NEW",
  "TRIAGED",
  "OUTREACH",
  "AWAITING_RESPONSE",
  "DECISION",
  "PLACED",
  "CLOSED",
];

const PRIORITY_ORDER: Record<Priority, number> = {
  EMERGENCY: 0,
  HIGH: 1,
  NORMAL: 2,
};

export function CoordinatorBoard({ referrals }: CoordinatorBoardProps) {
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const handleSimulate = () => {
    setFlash(null);
    startTransition(async () => {
      const result = await simulateReferral();
      setFlash(`New referral: ${result.name} (${result.priority})`);
      setTimeout(() => setFlash(null), 4000);
    });
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Referral Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {referrals.length} active referrals across all stages
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button
            onClick={handleSimulate}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {isPending ? (
              "Generating..."
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Simulate Referral
              </>
            )}
          </Button>
          {flash && (
            <span className="text-xs text-green-600 animate-in fade-in slide-in-from-top-1">
              {flash}
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="NEW">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {TAB_STATUSES.map((status) => {
            const count = referrals.filter((r) => r.status === status).length;
            return (
              <TabsTrigger key={status} value={status} className="text-xs">
                {STATUS_LABELS[status]}
                {count > 0 && (
                  <span className="ml-1.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_STATUSES.map((status) => {
          const filtered = referrals
            .filter((r) => r.status === status)
            .sort((a, b) => {
              const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
              if (pDiff !== 0) return pDiff;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

          return (
            <TabsContent key={status} value={status}>
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No referrals in &ldquo;{STATUS_LABELS[status]}&rdquo;</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((ref) => (
                    <ReferralCard
                      key={ref.id}
                      id={ref.id}
                      externalCaseRef={ref.externalCaseRef}
                      priority={ref.priority}
                      status={ref.status}
                      triageScore={ref.triageScore}
                      childProfile={ref.childProfile as ChildProfile}
                      needs={ref.needs as ChildNeeds}
                      missingInfo={ref.missingInfo as string[]}
                      legalStatus={ref.legalStatus as LegalStatus | null}
                      createdAt={ref.createdAt}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
