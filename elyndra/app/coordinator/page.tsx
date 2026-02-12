import { getAllReferrals } from "@/lib/queries";
import { CoordinatorBoard } from "./coordinator-board";

export const dynamic = "force-dynamic";

export default async function CoordinatorPage() {
  const referrals = await getAllReferrals();
  return <CoordinatorBoard referrals={referrals} />;
}
