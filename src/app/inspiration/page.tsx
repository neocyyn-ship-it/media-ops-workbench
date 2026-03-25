import { InspirationLibraryClient } from "@/components/inspiration-library-client";
import { listInspirationItems } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function InspirationPage() {
  return <InspirationLibraryClient initialItems={listInspirationItems()} />;
}
