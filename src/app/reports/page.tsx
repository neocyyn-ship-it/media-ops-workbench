import { ReportGeneratorClient } from "@/components/report-generator-client";
import { listReportDrafts } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return <ReportGeneratorClient initialDrafts={listReportDrafts(8)} />;
}
