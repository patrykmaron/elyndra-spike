"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Send,
  MessageSquare,
  ArrowRightLeft,
  HelpCircle,
  Check,
  Play,
  X,
} from "lucide-react";
import {
  generateSuggestedActions,
  type SuggestedAction,
} from "@/lib/generate-actions";
import { createThread, sendMessage, updateReferralStatus } from "@/lib/actions";
import { STATUS_LABELS } from "@/components/referral-card";
import type {
  Priority,
  Status,
  ChildProfile,
  ChildNeeds,
  WaitingOn,
  Decision,
  Role,
  MessageType,
} from "@/lib/db/types";
import type { HomeMatch } from "@/lib/matching";
import { useRole } from "@/lib/role-context";

// ── Props ────────────────────────────────────────────────────────────────────

interface ThreadForActions {
  id: string;
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

interface SuggestedActionsProps {
  referral: {
    id: string;
    externalCaseRef: string;
    priority: Priority;
    status: Status;
    triageScore: number;
    childProfile: ChildProfile;
    needs: ChildNeeds;
    missingInfo: string[];
  };
  matches: HomeMatch[];
  threads: ThreadForActions[];
}

// ── Icons per action type ────────────────────────────────────────────────────

const ACTION_ICON: Record<SuggestedAction["type"], React.ReactNode> = {
  send_request: <Send className="h-4 w-4 text-blue-600" />,
  follow_up: <MessageSquare className="h-4 w-4 text-amber-600" />,
  update_status: <ArrowRightLeft className="h-4 w-4 text-purple-600" />,
  request_info: <HelpCircle className="h-4 w-4 text-teal-600" />,
};

const ACTION_BADGE: Record<SuggestedAction["type"], { label: string; className: string }> = {
  send_request: { label: "Send Request", className: "bg-blue-50 text-blue-700 border-blue-200" },
  follow_up: { label: "Follow Up", className: "bg-amber-50 text-amber-700 border-amber-200" },
  update_status: { label: "Status Update", className: "bg-purple-50 text-purple-700 border-purple-200" },
  request_info: { label: "Request Info", className: "bg-teal-50 text-teal-700 border-teal-200" },
};

// ── Component ────────────────────────────────────────────────────────────────

export function SuggestedActionsPanel({
  referral,
  matches,
  threads,
}: SuggestedActionsProps) {
  const { currentUser } = useRole();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [executedIds, setExecutedIds] = useState<Set<number>>(new Set());
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [executingAll, setExecutingAll] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setVisible(true);
    setActions([]);
    setExecutedIds(new Set());

    try {
      const threadSummaries = threads.map((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        return {
          id: t.id,
          homeName: t.homeName,
          homeLocation: t.homeLocation,
          waitingOn: t.waitingOn,
          decision: t.decision,
          decisionReason: t.decisionReason,
          updatedAt: t.updatedAt,
          lastMessage: lastMsg
            ? { senderRole: lastMsg.senderRole, body: lastMsg.body, createdAt: lastMsg.createdAt }
            : undefined,
        };
      });

      const result = await generateSuggestedActions({
        referral,
        matches: matches.map((m) => ({
          homeId: m.homeId,
          homeName: m.homeName,
          location: m.location,
          score: m.score,
          eligible: m.eligible,
          reasons: m.reasons,
          existingThreadId: m.existingThreadId,
        })),
        threads: threadSummaries,
        coordinatorName: currentUser?.name ?? "Coordinator",
      });

      setActions(result);
    } catch (err) {
      console.error("Failed to generate actions:", err);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: SuggestedAction, index: number) => {
    setExecutingId(index);
    try {
      const coordinatorName = currentUser?.name ?? "Coordinator";

      switch (action.type) {
        case "send_request":
          if (action.homeId && action.message) {
            await createThread(referral.id, action.homeId, action.message, coordinatorName);
          }
          break;
        case "follow_up":
          if (action.threadId && action.message) {
            await sendMessage(action.threadId, "COORDINATOR", action.message);
          }
          break;
        case "update_status":
          if (action.newStatus) {
            await updateReferralStatus(referral.id, action.newStatus, coordinatorName);
          }
          break;
        case "request_info":
          // For now, request_info is informational — no direct action
          break;
      }

      setExecutedIds((prev) => new Set(prev).add(index));
    } catch (err) {
      console.error("Failed to execute action:", err);
    } finally {
      setExecutingId(null);
    }
  };

  const executeAll = async () => {
    setExecutingAll(true);
    for (let i = 0; i < actions.length; i++) {
      if (executedIds.has(i)) continue;
      if (actions[i].type === "request_info") continue;
      await executeAction(actions[i], i);
    }
    setExecutingAll(false);
  };

  const pendingCount = actions.filter(
    (a, i) => !executedIds.has(i) && a.type !== "request_info"
  ).length;

  return (
    <div className="mb-4">
      {/* Trigger button */}
      {!visible && (
        <Button
          onClick={handleGenerate}
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={loading}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Suggest Actions
        </Button>
      )}

      {/* Panel */}
      {visible && (
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-sm font-semibold text-indigo-900">
                  AI Suggested Actions
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {actions.length > 0 && pendingCount > 0 && (
                  <Button
                    onClick={executeAll}
                    size="sm"
                    variant="default"
                    className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700"
                    disabled={executingAll || executingId !== null}
                  >
                    {executingAll ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Execute All ({pendingCount})
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => setVisible(false)}
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-white/60 animate-pulse"
                  />
                ))}
                <p className="text-xs text-indigo-600 text-center pt-1">
                  Analysing referral context...
                </p>
              </div>
            )}

            {!loading && actions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                No actions suggested. Try again later.
              </p>
            )}

            {!loading &&
              actions.map((action, index) => {
                const executed = executedIds.has(index);
                const executing = executingId === index;
                const badge = ACTION_BADGE[action.type];

                return (
                  <div
                    key={index}
                    className={`rounded-lg border bg-white p-3 transition-all ${
                      executed ? "opacity-60 border-green-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ACTION_ICON[action.type]}
                          <span className="font-medium text-sm">
                            {action.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${badge.className}`}
                          >
                            {badge.label}
                          </Badge>
                          {executed && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.reasoning}
                        </p>
                        {action.type === "update_status" && action.newStatus && (
                          <div className="flex items-center gap-2 mt-1.5 text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {STATUS_LABELS[referral.status]}
                            </Badge>
                            <ArrowRightLeft className="h-3 w-3 text-purple-500" />
                            <Badge variant="outline" className="text-[10px] border-purple-300 bg-purple-50 text-purple-700">
                              {STATUS_LABELS[action.newStatus]}
                            </Badge>
                          </div>
                        )}
                        {action.message && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] text-indigo-600 cursor-pointer hover:underline">
                              Preview message
                            </summary>
                            <p className="mt-1 text-xs text-muted-foreground bg-gray-50 rounded p-2 whitespace-pre-wrap">
                              {action.message}
                            </p>
                          </details>
                        )}
                      </div>

                      {!executed && action.type !== "request_info" && (
                        <Button
                          onClick={() => executeAction(action, index)}
                          size="sm"
                          variant="outline"
                          className="text-xs shrink-0 h-7"
                          disabled={executing || executingAll}
                        >
                          {executing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Execute"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Re-generate button */}
            {!loading && actions.length > 0 && (
              <div className="text-center pt-1">
                <Button
                  onClick={handleGenerate}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Re-analyse
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
