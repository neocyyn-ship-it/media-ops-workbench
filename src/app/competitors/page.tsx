import { CompetitorTrackerClient } from "@/components/competitor-tracker-client";
import { listCompetitorObservations } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function CompetitorsPage() {
  return <CompetitorTrackerClient initialItems={listCompetitorObservations()} />;
}
