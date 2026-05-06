import { notFound } from "next/navigation";
import { fetchLandingPageBySlug } from "@/lib/marketing-queries";
import { LandingRenderer } from "@/components/marketing/LandingRenderer";
import type { Data } from "@measured/puck";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchLandingPageBySlug(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description ?? undefined,
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = await fetchLandingPageBySlug(slug);
  if (!page) notFound();

  return (
    <LandingRenderer
      landingId={page.id}
      data={(page.content as Data) ?? { content: [], root: { props: {} } }}
    />
  );
}
