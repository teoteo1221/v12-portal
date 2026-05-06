import { fetchLandingPage } from "@/lib/marketing-queries";
import { notFound } from "next/navigation";
import { PuckEditor } from "@/components/marketing/PuckEditor";
import type { Data } from "@measured/puck";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const page = await fetchLandingPage(id);
  return { title: page ? `Editar: ${page.title}` : "Editor" };
}

export default async function EditarLandingPage({ params }: Props) {
  const { id } = await params;
  const page = await fetchLandingPage(id);
  if (!page) notFound();

  return (
    <PuckEditor
      landingId={page.id}
      initialData={(page.content as Data) ?? null}
      published={page.published}
    />
  );
}
