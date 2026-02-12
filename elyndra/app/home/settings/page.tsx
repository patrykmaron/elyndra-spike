import { getAllHomes } from "@/lib/queries";
import { HomeSettingsForm } from "@/components/home-settings-form";
import type { HomeConstraints, HomeCapabilities } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function HomeSettingsPage() {
  const allHomes = await getAllHomes();

  const homesForClient = allHomes.map((h) => ({
    id: h.id,
    name: h.name,
    location: h.location,
    freeBeds: h.freeBeds,
    constraints: h.constraints as HomeConstraints,
    capabilities: h.capabilities as HomeCapabilities,
  }));

  return <HomeSettingsForm homes={homesForClient} />;
}
