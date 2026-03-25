import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function Home() {
  const snapshot = getDashboardSnapshot();
  return <DashboardClient initialSnapshot={snapshot} />;
}
