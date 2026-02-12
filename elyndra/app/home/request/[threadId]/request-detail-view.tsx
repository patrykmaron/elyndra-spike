"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
// ScrollArea replaced with plain div for reliable scrolling
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RotateCcw,
  MessageSquare,
  Phone,
  FileText,
  Paperclip,
  StickyNote,
  Sparkles,
  Loader2,
  Info,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Lock,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { sendMessage, makeDecision, reopenThread, addTimelineEntry } from "@/lib/actions";
import { generateCaseSummary, type CaseSummary, type FitItem } from "@/lib/generate-summary";
import type {
  Priority,
  ChildProfile,
  ChildNeeds,
  WaitingOn,
  Decision,
  Role,
  MessageType,
  HomeConstraints,
  HomeCapabilities,
  LegalStatus,
} from "@/lib/db/types";

// ── Types ────────────────────────────────────────────────────────────────────

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
  legalStatus: LegalStatus | null;
}

const LEGAL_BASIS_LABELS: Record<string, string> = {
  NONE: "None",
  COURT_OF_PROTECTION: "Court of Protection",
  HIGH_COURT_INHERENT: "High Court Inherent Jurisdiction",
  SECURE_ACCOMMODATION_S25: "Secure Accommodation (S.25)",
  MHA: "Mental Health Act",
  OTHER: "Other Legal Basis",
};

interface HomeInfo {
  name: string;
  location: string;
  freeBeds: number;
  constraints: HomeConstraints;
  capabilities: HomeCapabilities;
}

interface MessageInfo {
  id: string;
  senderRole: Role;
  type: MessageType;
  body: string;
  metadata: Record<string, string> | null;
  createdAt: Date;
}

interface RequestDetailViewProps {
  thread: ThreadInfo;
  referral: ReferralInfo;
  home: HomeInfo;
  messages: MessageInfo[];
}

// ── Entry type config ────────────────────────────────────────────────────────

const ENTRY_CONFIG: Record<
  MessageType,
  { icon: React.ReactNode; label: string; bgClass: string; borderClass: string }
> = {
  message: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: "Message",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-100",
  },
  phone_call: {
    icon: <Phone className="h-3.5 w-3.5" />,
    label: "Phone Call",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-100",
  },
  meeting_note: {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "Meeting Note",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-100",
  },
  document: {
    icon: <Paperclip className="h-3.5 w-3.5" />,
    label: "Document",
    bgClass: "bg-green-50",
    borderClass: "border-green-100",
  },
  note: {
    icon: <StickyNote className="h-3.5 w-3.5" />,
    label: "Note",
    bgClass: "bg-gray-50",
    borderClass: "border-gray-200",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export function RequestDetailView({
  thread,
  referral,
  home,
  messages,
}: RequestDetailViewProps) {
  const [newMessage, setNewMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Timeline entry form state
  const [entryBody, setEntryBody] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [documentName, setDocumentName] = useState("");

  // Smart Summary state
  const [summaryData, setSummaryData] = useState<CaseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[referral.priority];
  const isResolved = !!thread.decision;

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

  const handleReopen = async () => {
    setReopening(true);
    try {
      await reopenThread(thread.id);
    } finally {
      setReopening(false);
    }
  };

  const handleAddEntry = async (type: MessageType) => {
    if (!entryBody.trim()) return;
    setSending(true);

    let metadata: Record<string, string> | null = null;
    if (type === "phone_call" && callDuration) {
      metadata = { duration: callDuration };
    } else if (type === "meeting_note" && meetingAttendees) {
      metadata = { attendees: meetingAttendees };
    } else if (type === "document" && documentName) {
      metadata = { documentName };
    }

    try {
      await addTimelineEntry(thread.id, "HOME_MANAGER", type, entryBody, metadata);
      setEntryBody("");
      setCallDuration("");
      setMeetingAttendees("");
      setDocumentName("");
    } finally {
      setSending(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const result = await generateCaseSummary({
        referral: {
          externalCaseRef: referral.externalCaseRef,
          priority: referral.priority,
          childProfile: referral.childProfile,
          needs: referral.needs,
          missingInfo: referral.missingInfo,
          legalStatus: referral.legalStatus,
        },
        home: {
          name: home.name,
          location: home.location,
          freeBeds: home.freeBeds,
          constraints: home.constraints,
          capabilities: home.capabilities,
        },
        thread: {
          waitingOn: thread.waitingOn,
          decision: thread.decision,
          decisionReason: thread.decisionReason,
        },
        messages: messages.map((m) => ({
          senderRole: m.senderRole,
          type: m.type,
          body: m.body,
          createdAt: m.createdAt,
        })),
      });
      setSummaryData(result);
    } catch (err) {
      console.error("Summary generation failed:", err);
      setSummaryData({
        summary: "Unable to generate summary. Please try again.",
        missingInfo: [],
        fitAssessment: [],
        nextSteps: [],
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const FIT_ICON: Record<FitItem["status"], React.ReactNode> = {
    good: <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
    concern: <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />,
  };

  const FIT_BG: Record<FitItem["status"], string> = {
    good: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    concern: "bg-red-50 border-red-200",
  };

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

        {/* Reopen button */}
        {isResolved && (
          <Button
            onClick={handleReopen}
            variant="outline"
            size="sm"
            className="ml-auto text-xs"
            disabled={reopening}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {reopening ? "Reopening..." : "Reopen Request"}
          </Button>
        )}
      </div>

      {/* DoL Alert Banner */}
      {referral.legalStatus?.applicable && (
        <Card className="mb-4 border-red-300 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Deprivation of Liberty &mdash; {LEGAL_BASIS_LABELS[referral.legalStatus.legalBasis] ?? referral.legalStatus.legalBasis}
                  </p>
                  <div className="text-xs text-red-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {referral.legalStatus.orderRef && (
                      <span>Order: {referral.legalStatus.orderRef}</span>
                    )}
                    {referral.legalStatus.court && (
                      <span>Court: {referral.legalStatus.court}</span>
                    )}
                  </div>
                </div>

                {/* Restrictions */}
                {referral.legalStatus.authorisedRestrictions && referral.legalStatus.authorisedRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {referral.legalStatus.authorisedRestrictions.map((r, i) => (
                      <Badge key={i} variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Review date */}
                {referral.legalStatus.reviewDue && (
                  <div className="flex items-center gap-1.5 text-xs text-red-700">
                    <Calendar className="h-3 w-3" />
                    Review due: {new Date(referral.legalStatus.reviewDue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Smart Summary */}
      <div className="mb-4">
        {!summaryOpen ? (
          <Button
            onClick={handleGenerateSummary}
            variant="outline"
            className="w-full gap-2 border-dashed border-violet-300 text-violet-700 hover:bg-violet-50"
            disabled={summaryLoading}
          >
            <Sparkles className="h-4 w-4" />
            AI Case Summary
          </Button>
        ) : (
          <Card className="border-violet-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-violet-700">
                  <Sparkles className="h-4 w-4" />
                  AI Case Summary
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? (
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
                    onClick={() => setSummaryOpen(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {summaryLoading && !summaryData ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing case details...
                </div>
              ) : summaryData ? (
                <>
                  {/* Summary */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Summary
                    </p>
                    <p className="text-sm leading-relaxed">{summaryData.summary}</p>
                  </div>

                  {/* Missing Information */}
                  {summaryData.missingInfo.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Missing Information
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {summaryData.missingInfo.map((item, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                          >
                            <Info className="h-3 w-3 mr-1" />
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fit Assessment */}
                  {summaryData.fitAssessment.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Fit Assessment
                      </p>
                      <div className="space-y-1.5">
                        {summaryData.fitAssessment.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${FIT_BG[item.status]}`}
                          >
                            {FIT_ICON[item.status]}
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {summaryData.nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Recommended Next Steps
                      </p>
                      <ul className="space-y-1">
                        {summaryData.nextSteps.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                            <span>{step}</span>
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

      {/* Rejection reason display */}
      {thread.decision === "REJECTED" && thread.decisionReason && (
        <Card className="mb-4 border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
            <p className="text-sm text-red-600">{thread.decisionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Activity Timeline ({messages.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[28rem] overflow-y-auto pr-1">
            <div className="space-y-3">
              {messages.map((msg) => {
                const entryType = msg.type || "message";
                const config = ENTRY_CONFIG[entryType];
                const isOwn = msg.senderRole === "HOME_MANAGER";

                return (
                  <div
                    key={msg.id}
                    className={`text-sm rounded-lg p-3 border ${
                      isOwn ? "ml-8" : "mr-8"
                    } ${config.bgClass} ${config.borderClass}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1">
                      {config.icon}
                      <span>{config.label}</span>
                      <span>&middot;</span>
                      <span>
                        {msg.senderRole === "COORDINATOR"
                          ? "Coordinator"
                          : "You (Home Manager)"}
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
                    <p className="leading-relaxed">{msg.body}</p>

                    {/* Metadata display */}
                    {msg.metadata && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
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
                            <Paperclip className="h-2.5 w-2.5 mr-1" />
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
        </CardContent>
      </Card>

      {/* Action Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Tabbed entry input */}
          <Tabs defaultValue="message">
            <TabsList className="mb-3">
              <TabsTrigger value="message" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Message
              </TabsTrigger>
              <TabsTrigger value="phone_call" className="text-xs">
                <Phone className="h-3 w-3 mr-1" />
                Phone Call
              </TabsTrigger>
              <TabsTrigger value="meeting_note" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Meeting
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                Document
              </TabsTrigger>
              <TabsTrigger value="note" className="text-xs">
                <StickyNote className="h-3 w-3 mr-1" />
                Note
              </TabsTrigger>
            </TabsList>

            {/* Message tab */}
            <TabsContent value="message">
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
            </TabsContent>

            {/* Phone Call tab */}
            <TabsContent value="phone_call">
              <div className="space-y-2">
                <Input
                  placeholder="Call duration (e.g. 15min)"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Phone call notes..."
                    value={entryBody}
                    onChange={(e) => setEntryBody(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    onClick={() => handleAddEntry("phone_call")}
                    disabled={!entryBody.trim() || sending}
                    className="self-end"
                    variant="outline"
                  >
                    <Phone className="h-4 w-4 mr-1.5" />
                    Log
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Meeting Note tab */}
            <TabsContent value="meeting_note">
              <div className="space-y-2">
                <Input
                  placeholder="Attendees (e.g. Sarah, James, social worker)"
                  value={meetingAttendees}
                  onChange={(e) => setMeetingAttendees(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Meeting notes..."
                    value={entryBody}
                    onChange={(e) => setEntryBody(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    onClick={() => handleAddEntry("meeting_note")}
                    disabled={!entryBody.trim() || sending}
                    className="self-end"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    Log
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Document tab */}
            <TabsContent value="document">
              <div className="space-y-2">
                <Input
                  placeholder="Document name (e.g. safeguarding-plan.pdf)"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Notes about this document..."
                    value={entryBody}
                    onChange={(e) => setEntryBody(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    onClick={() => handleAddEntry("document")}
                    disabled={!entryBody.trim() || sending}
                    className="self-end"
                    variant="outline"
                  >
                    <Paperclip className="h-4 w-4 mr-1.5" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Note tab */}
            <TabsContent value="note">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Internal note or log entry..."
                  value={entryBody}
                  onChange={(e) => setEntryBody(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button
                  onClick={() => handleAddEntry("note")}
                  disabled={!entryBody.trim() || sending}
                  className="self-end"
                  variant="outline"
                >
                  <StickyNote className="h-4 w-4 mr-1.5" />
                  Add
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Decision buttons */}
          {!isResolved && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
