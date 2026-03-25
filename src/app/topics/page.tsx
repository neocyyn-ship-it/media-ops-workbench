import { HotTopicsClient } from "@/components/hot-topics-client";
import { listHotTopics } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function TopicsPage() {
  return <HotTopicsClient initialItems={listHotTopics()} />;
}
