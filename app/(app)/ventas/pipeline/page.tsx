import { fetchLeads } from "@/lib/queries";
import { Kanban } from "@/components/leads/Kanban";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const leads = await fetchLeads({ limit: 500 }).catch(() => []);
  return (
    <div className="-mx-6 px-6">
      <Kanban initialLeads={leads} />
    </div>
  );
}
