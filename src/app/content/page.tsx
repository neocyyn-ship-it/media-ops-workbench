import { ContentPlannerClient } from "@/components/content-planner-client";
import { listContentPlans } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function ContentPage() {
  return <ContentPlannerClient initialPlans={listContentPlans()} />;
}
