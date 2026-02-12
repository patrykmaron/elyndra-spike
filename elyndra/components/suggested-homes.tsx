"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  AlertTriangle,
  X,
  Send,
  MessageSquare,
  Sparkles,
  Loader2,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { HomeMatch, ReasonLevel } from "@/lib/matching";
import { createThread } from "@/lib/actions";
import { generatePlacementMessage } from "@/lib/generate-message";
import { useRole } from "@/lib/role-context";
import { useState } from "react";
import Link from "next/link";
import type { ChildProfile, ChildNeeds, Priority } from "@/lib/db/types";
import { getHomeActivityStats } from "@/lib/activity-stats";

interface ReferralContext {
  childProfile: ChildProfile;
  needs: ChildNeeds;
  priority: Priority;
  triageScore: number;
  missingInfo: string[];
}

interface SuggestedHomesProps {
  matches: HomeMatch[];
  referralId: string;
  referralContext: ReferralContext;
}

const REASON_ICON: Record<ReasonLevel, React.ReactNode> = {
  pass: <Check className="h-3.5 w-3.5 text-green-600" />,
  warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  fail: <X className="h-3.5 w-3.5 text-red-500" />,
};

export function SuggestedHomes({
  matches,
  referralId,
  referralContext,
}: SuggestedHomesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Suggested Homes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No homes available.</p>
        ) : (
          matches.map((match) => (
            <HomeMatchCard
              key={match.homeId}
              match={match}
              referralId={referralId}
              referralContext={referralContext}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HomeMatchCard({
  match,
  referralId,
  referralContext,
}: {
  match: HomeMatch;
  referralId: string;
  referralContext: ReferralContext;
}) {
  const { currentUser } = useRole();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const activityStats = getHomeActivityStats(match.homeId);

  const handleSendRequest = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await createThread(
        referralId,
        match.homeId,
        message,
        currentUser?.name ?? "Coordinator"
      );
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const draft = await generatePlacementMessage({
        childProfile: referralContext.childProfile,
        needs: referralContext.needs,
        priority: referralContext.priority,
        triageScore: referralContext.triageScore,
        missingInfo: referralContext.missingInfo,
        homeName: match.homeName,
        homeLocation: match.location,
        matchReasons: match.reasons,
        coordinatorName: currentUser?.name ?? "Coordinator",
      });
      setMessage(draft);
    } catch (err) {
      console.error("Failed to generate message:", err);
      setMessage("[AI draft failed — please write your message manually]");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        !match.eligible ? "opacity-60 bg-muted/30" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium text-sm">{match.homeName}</div>
          <div className="text-xs text-muted-foreground">
            {match.location} &middot; {match.freeBeds} bed
            {match.freeBeds !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="text-right">
          {match.eligible ? (
            <div
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{
                color:
                  match.score >= 75
                    ? "#15803d"
                    : match.score >= 50
                    ? "#a16207"
                    : "#dc2626",
                backgroundColor:
                  match.score >= 75
                    ? "#dcfce7"
                    : match.score >= 50
                    ? "#fef3c7"
                    : "#fef2f2",
              }}
            >
              {match.score}%
            </div>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] bg-red-50 text-red-600 border-red-200"
            >
              Not Eligible
            </Badge>
          )}
        </div>
      </div>

      {/* Activity stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {activityStats.lastOnline}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Avg reply {activityStats.avgResponseTime}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Accepts {activityStats.acceptanceRate}%
        </span>
      </div>

      {/* Score bar */}
      {match.eligible && (
        <div className="w-full bg-muted rounded-full h-1.5 mb-2">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${match.score}%`,
              backgroundColor:
                match.score >= 75
                  ? "#22c55e"
                  : match.score >= 50
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          />
        </div>
      )}

      {/* Reasons */}
      <div className="space-y-1 mb-3">
        {match.reasons.map((reason, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            {REASON_ICON[reason.level]}
            <span>{reason.text}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {match.eligible && (
        <div>
          {match.existingThreadId ? (
            <Link href={`/coordinator/referral/${referralId}`}>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <MessageSquare className="h-3 w-3 mr-1.5" />
                View Thread
              </Button>
            </Link>
          ) : (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs"
                  />
                }
              >
                <Send className="h-3 w-3 mr-1.5" />
                Send Request
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    Send Placement Request to {match.homeName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Write an initial message to the home manager.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={handleGenerateDraft}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Drafting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1.5" />
                          Draft with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Hi, we have a referral we think could be a good fit for your home..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="text-sm"
                  />
                  {message && (
                    <p className="text-[10px] text-muted-foreground">
                      You can edit the draft before sending.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <DialogClose
                    render={
                      <Button
                        onClick={handleSendRequest}
                        disabled={!message.trim() || sending}
                      />
                    }
                  >
                    {sending ? "Sending..." : "Send Request"}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
