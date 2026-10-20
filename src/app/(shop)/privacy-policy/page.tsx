import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EDITABLE_PAGES } from "@/lib/pages";
import { getPageContent } from "@/lib/server/pages";
import { RichText } from "@/components/rich-text";

const SLUG = "privacy-policy";

export async function generateMetadata(): Promise<Metadata> {
  const def = EDITABLE_PAGES[SLUG];
  return { title: def.title, description: def.description, alternates: { canonical: `/${SLUG}` } };
}

export default async function Page() {
  const page = await getPageContent(SLUG);
  if (!page) notFound();
  return (
    <div className="container-x max-w-3xl py-6">
      <article className="card p-5 sm:p-8">
        <h1 className="mb-4 text-2xl font-bold">{page.title}</h1>
        <RichText body={page.body} />
      </article>
    </div>
  );
}
