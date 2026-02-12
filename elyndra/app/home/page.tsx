import { getAllHomes, getThreadsForHome } from "@/lib/queries";
import { HomeInbox } from "./home-inbox";

export const dynamic = "force-dynamic";

export default async function HomeManagerPage() {
  const allHomes = await getAllHomes();

  // Pre-fetch threads for all homes so the client component can use them
  const homeThreads = await Promise.all(
    allHomes.map(async (home) => {
      const threadRows = await getThreadsForHome(home.id);
      return {
        homeId: home.id,
        threads: threadRows.map((row) => ({
          threadId: row.thread.id,
          referralId: row.thread.referralId,
          waitingOn: row.thread.waitingOn,
          decision: row.thread.decision,
          updatedAt: row.thread.updatedAt,
          createdAt: row.thread.createdAt,
          childProfile: row.referral.childProfile as Record<string, unknown>,
          needs: row.referral.needs as Record<string, unknown>,
          priority: row.referral.priority,
          externalCaseRef: row.referral.externalCaseRef,
        })),
      };
    })
  );

  return <HomeInbox homeThreads={homeThreads} />;
}
