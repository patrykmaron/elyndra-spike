"use client";

import { useRole } from "@/lib/role-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestCard } from "@/components/request-card";
import { Inbox } from "lucide-react";
import type { ChildProfile, ChildNeeds, Priority, WaitingOn, Decision } from "@/lib/db/types";

interface ThreadInfo {
  threadId: string;
  referralId: string;
  waitingOn: WaitingOn | null;
  decision: Decision | null;
  updatedAt: Date;
  createdAt: Date;
  childProfile: Record<string, unknown>;
  needs: Record<string, unknown>;
  priority: Priority;
  externalCaseRef: string;
}

interface HomeInboxProps {
  homeThreads: {
    homeId: string;
    threads: ThreadInfo[];
  }[];
}

export function HomeInbox({ homeThreads }: HomeInboxProps) {
  const { currentUser } = useRole();

  if (!currentUser || currentUser.role !== "HOME_MANAGER") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please switch to a Home Manager user to view this page.</p>
      </div>
    );
  }

  const homeData = homeThreads.find((h) => h.homeId === currentUser.homeId);
  const threads = homeData?.threads ?? [];

  const awaitingResponse = threads.filter(
    (t) => t.waitingOn === "HOME" && !t.decision
  );
  const allRequests = threads;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Requests Inbox</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {awaitingResponse.length} request{awaitingResponse.length !== 1 ? "s" : ""} awaiting
          your response
        </p>
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList className="mb-4">
          <TabsTrigger value="awaiting" className="text-xs">
            Awaiting Your Response
            {awaitingResponse.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 text-[10px]">
                {awaitingResponse.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All Requests
            <span className="ml-1.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
              {allRequests.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting">
          {awaitingResponse.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No requests waiting for your response.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {awaitingResponse.map((t) => (
                <RequestCard
                  key={t.threadId}
                  threadId={t.threadId}
                  childProfile={t.childProfile as unknown as ChildProfile}
                  needs={t.needs as unknown as ChildNeeds}
                  priority={t.priority}
                  externalCaseRef={t.externalCaseRef}
                  waitingOn={t.waitingOn}
                  decision={t.decision}
                  updatedAt={t.updatedAt}
                  createdAt={t.createdAt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {allRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No placement requests yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allRequests.map((t) => (
                <RequestCard
                  key={t.threadId}
                  threadId={t.threadId}
                  childProfile={t.childProfile as unknown as ChildProfile}
                  needs={t.needs as unknown as ChildNeeds}
                  priority={t.priority}
                  externalCaseRef={t.externalCaseRef}
                  waitingOn={t.waitingOn}
                  decision={t.decision}
                  updatedAt={t.updatedAt}
                  createdAt={t.createdAt}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
