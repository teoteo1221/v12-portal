import { fetchLeads } from "@/lib/queries";
import { LeadsTable } from "@/components/leads/LeadsTable";

export const dynamic = "force-dynamic";

export default async function ListadoPage() {
  const leads = await fetchLeads({ limit: 1000 }).catch(() => []);
  return <LeadsTable initialLeads={leads} />;
}
