"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { NeedsChips, PRIORITY_CONFIG } from "@/components/referral-card";
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Clock,
  AlertTriangle,
  User,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { sendMessage, makeDecision } from "@/lib/actions";
import type {
  Priority,
  ChildProfile,
  ChildNeeds,
  WaitingOn,
  Decision,
  Role,
} from "@/lib/db/types";

interface ThreadInfo {
  id: string;
  referralId: string;
  waitingOn: WaitingOn | null;
  decision: Decision | null;
  decisionReason: string | null;
  updatedAt: Date;
}

interface ReferralInfo {
  externalCaseRef: string;
  priority: Priority;
  childProfile: ChildProfile;
  needs: ChildNeeds;
  missingInfo: string[];
}

interface HomeInfo {
  name: string;
  location: string;
}

interface MessageInfo {
  id: string;
  senderRole: Role;
  body: string;
  createdAt: Date;
}

interface RequestDetailViewProps {
  thread: ThreadInfo;
  referral: ReferralInfo;
  home: HomeInfo;
  messages: MessageInfo[];
}

export function RequestDetailView({
  thread,
  referral,
  home,
  messages,
}: RequestDetailViewProps) {
  const [newMessage, setNewMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [sending, setSending] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[referral.priority];

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await sendMessage(thread.id, "HOME_MANAGER", newMessage);
      setNewMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    setSending(true);
    try {
      await makeDecision(thread.id, "ACCEPTED");
    } finally {
      setSending(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSending(true);
    try {
      await makeDecision(thread.id, "REJECTED", rejectReason);
      setRejectReason("");
    } finally {
      setSending(false);
    }
  };

  const isResolved = !!thread.decision;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/home">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Inbox
          </Button>
        </Link>
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
            Your Response Needed
          </Badge>
        )}
        {!thread.decision && thread.waitingOn === "COORDINATOR" && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Coordinator
          </Badge>
        )}
      </div>

      {/* Child Summary */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{referral.childProfile.name}</h2>
              <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {referral.childProfile.age}y{" "}
                  {referral.childProfile.gender === "male" ? "M" : "F"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {referral.childProfile.location}
                </span>
                <span>{referral.externalCaseRef}</span>
              </div>
              <div className="mt-2">
                <NeedsChips needs={referral.needs} />
              </div>
            </div>
            <Badge variant="outline" className={priorityConfig.className}>
              {referral.priority === "EMERGENCY" && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {priorityConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rejection reason display */}
      {thread.decision === "REJECTED" && thread.decisionReason && (
        <Card className="mb-4 border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
            <p className="text-sm text-red-600">{thread.decisionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Conversation with Coordinator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm rounded-lg p-3 ${
                    msg.senderRole === "HOME_MANAGER"
                      ? "ml-8 bg-green-50 border border-green-100"
                      : "mr-8 bg-blue-50 border border-blue-100"
                  }`}
                >
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">
                    {msg.senderRole === "COORDINATOR"
                      ? "Coordinator"
                      : "You (Home Manager)"}
                    {" · "}
                    {new Date(msg.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="leading-relaxed">{msg.body}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {!isResolved && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Message input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="self-end"
                variant="outline"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Send
              </Button>
            </div>

            {/* Decision buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleAccept}
                disabled={sending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Accept Placement
              </Button>

              <Dialog>
                <DialogTrigger
                  render={<Button variant="destructive" className="flex-1" disabled={sending} />}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Placement Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Please provide a reason for rejecting this placement request.
                      This helps the coordinator find a better match.
                    </p>
                    <Textarea
                      placeholder="e.g., Current mix already has similar profiles, capacity concerns..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <DialogClose
                      render={
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={!rejectReason.trim() || sending}
                        />
                      }
                    >
                      Confirm Rejection
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
