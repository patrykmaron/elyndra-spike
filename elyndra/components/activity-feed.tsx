import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Link2,
} from "lucide-react";

interface EventData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

interface ActivityFeedProps {
  events: EventData[];
}

const EVENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: (payload: Record<string, unknown>) => string }
> = {
  STATUS_CHANGE: {
    icon: <ArrowRight className="h-3.5 w-3.5 text-blue-500" />,
    label: (p) =>
      `Status changed from ${p.from} to ${p.to}${p.changedBy ? ` by ${p.changedBy}` : ""}`,
  },
  THREAD_CREATED: {
    icon: <Link2 className="h-3.5 w-3.5 text-purple-500" />,
    label: (p) =>
      `Placement request sent to ${p.homeName}${p.createdBy ? ` by ${p.createdBy}` : ""}`,
  },
  MESSAGE_SENT: {
    icon: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
    label: (p) =>
      `Message from ${p.senderRole === "COORDINATOR" ? "Coordinator" : "Home Manager"}${
        p.preview ? `: "${p.preview}..."` : ""
      }`,
  },
  DECISION_MADE: {
    icon:
      null, // set dynamically
    label: (p) => {
      const d = p.decision === "ACCEPTED" ? "Accepted" : "Rejected";
      return `${p.homeName}: ${d}${p.reason ? ` — ${p.reason}` : ""}`;
    },
  },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const config = EVENT_CONFIG[event.type];
            const payload = event.payload as Record<string, unknown>;

            let icon = config?.icon;
            if (event.type === "DECISION_MADE") {
              icon =
                payload.decision === "ACCEPTED" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                );
            }

            return (
              <div key={event.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    {config?.label(payload) ?? event.type}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(event.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
