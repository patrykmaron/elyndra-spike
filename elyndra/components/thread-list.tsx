"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Check, X, MessageSquare, Send } from "lucide-react";
import { sendMessage } from "@/lib/actions";
import { useRole } from "@/lib/role-context";
import { useState } from "react";
import type { WaitingOn, Decision, Role } from "@/lib/db/types";

interface ThreadMessage {
  id: string;
  senderRole: Role;
  body: string;
  createdAt: Date;
}

interface ThreadData {
  id: string;
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
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div>
          <div className="font-medium text-sm">{thread.homeName}</div>
          <div className="text-xs text-muted-foreground">
            {thread.homeLocation} &middot; {thread.messages.length} message
            {thread.messages.length !== 1 ? "s" : ""}
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
          <ScrollArea className="max-h-64 p-3">
            <div className="space-y-3">
              {thread.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm ${
                    msg.senderRole === "COORDINATOR"
                      ? "ml-4 bg-blue-50 rounded-lg p-2"
                      : "mr-4 bg-green-50 rounded-lg p-2"
                  }`}
                >
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">
                    {msg.senderRole === "COORDINATOR" ? "Coordinator" : "Home Manager"}
                    {" · "}
                    {new Date(msg.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p>{msg.body}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

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
