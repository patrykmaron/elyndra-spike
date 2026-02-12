"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// ScrollArea replaced with plain div for reliable scrolling
import {
  Clock,
  Check,
  X,
  MessageSquare,
  Send,
  Zap,
  Phone,
  FileText,
  Paperclip,
  StickyNote,
} from "lucide-react";
import { sendMessage } from "@/lib/actions";
import { useRole } from "@/lib/role-context";
import { useState } from "react";
import type { WaitingOn, Decision, Role, MessageType } from "@/lib/db/types";
import { getHomeActivityStats } from "@/lib/activity-stats";

// ── Entry type config (shared with request-detail-view) ──────────────────────

const ENTRY_ICON: Record<MessageType, React.ReactNode> = {
  message: <MessageSquare className="h-3 w-3" />,
  phone_call: <Phone className="h-3 w-3" />,
  meeting_note: <FileText className="h-3 w-3" />,
  document: <Paperclip className="h-3 w-3" />,
  note: <StickyNote className="h-3 w-3" />,
};

const ENTRY_LABEL: Record<MessageType, string> = {
  message: "Message",
  phone_call: "Phone Call",
  meeting_note: "Meeting",
  document: "Document",
  note: "Note",
};

const ENTRY_BG: Record<MessageType, string> = {
  message: "bg-blue-50",
  phone_call: "bg-amber-50",
  meeting_note: "bg-purple-50",
  document: "bg-green-50",
  note: "bg-gray-50",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ThreadMessage {
  id: string;
  senderRole: Role;
  type: MessageType;
  body: string;
  metadata: Record<string, string> | null;
  createdAt: Date;
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
  messages: ThreadMessage[];
}

interface ThreadListProps {
  threads: ThreadData[];
}

// ── Components ───────────────────────────────────────────────────────────────

export function ThreadList({ threads }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Communication Threads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No threads yet. Send a placement request to start a conversation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Communication Threads ({threads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </CardContent>
    </Card>
  );
}

function ThreadCard({ thread }: { thread: ThreadData }) {
  const { currentUser } = useRole();
  const [expanded, setExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const activityStats = getHomeActivityStats(thread.homeId);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await sendMessage(thread.id, "COORDINATOR", newMessage);
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div id={`thread-${thread.id}`} className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div>
          <div className="font-medium text-sm">{thread.homeName}</div>
          <div className="text-xs text-muted-foreground">
            {thread.homeLocation} &middot; {thread.messages.length} entr
            {thread.messages.length !== 1 ? "ies" : "y"}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Online {activityStats.lastOnline}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" />
              Avg reply {activityStats.avgResponseTime}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {thread.decision === "ACCEPTED" && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              Accepted
            </Badge>
          )}
          {thread.decision === "REJECTED" && (
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <X className="h-3 w-3 mr-1" />
              Rejected
            </Badge>
          )}
          {!thread.decision && thread.waitingOn === "HOME" && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              Awaiting Home
            </Badge>
          )}
          {!thread.decision && thread.waitingOn === "COORDINATOR" && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <Clock className="h-3 w-3 mr-1" />
              Awaiting You
            </Badge>
          )}
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          <div className="max-h-64 overflow-y-auto p-3">
            <div className="space-y-3">
              {thread.messages.map((msg) => {
                const entryType = msg.type || "message";
                return (
                  <div
                    key={msg.id}
                    className={`text-sm rounded-lg p-2 ${
                      msg.senderRole === "COORDINATOR" ? "ml-4" : "mr-4"
                    } ${ENTRY_BG[entryType]}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
                      {ENTRY_ICON[entryType]}
                      <span>{ENTRY_LABEL[entryType]}</span>
                      <span>&middot;</span>
                      <span>
                        {msg.senderRole === "COORDINATOR"
                          ? "Coordinator"
                          : "Home Manager"}
                      </span>
                      <span>&middot;</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p>{msg.body}</p>
                    {msg.metadata && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {msg.metadata.duration && (
                          <Badge variant="outline" className="text-[10px]">
                            Duration: {msg.metadata.duration}
                          </Badge>
                        )}
                        {msg.metadata.attendees && (
                          <Badge variant="outline" className="text-[10px]">
                            Attendees: {msg.metadata.attendees}
                          </Badge>
                        )}
                        {msg.metadata.documentName && (
                          <Badge variant="outline" className="text-[10px]">
                            <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                            {msg.metadata.documentName}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {thread.decision === "REJECTED" && thread.decisionReason && (
            <div className="border-t p-3 bg-red-50/50">
              <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-600">{thread.decisionReason}</p>
            </div>
          )}

          {!thread.decision && (
            <div className="border-t p-3 flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="self-end"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
