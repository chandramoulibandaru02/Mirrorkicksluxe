import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/server/session";
import { getPageContent } from "@/lib/server/pages";
import { PageEditor } from "@/components/admin/page-editor";

export const metadata = { title: "Edit page" };

export default async function AdminEditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminPage();
  const { slug } = await params;
  const page = await getPageContent(slug);
  if (!page) notFound();
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/pages" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> All pages</Link>
      <h1 className="text-xl font-bold">Edit: {page.title}</h1>
      <PageEditor key={`${slug}-${page.custom}`} slug={slug} initialTitle={page.title} initialBody={page.body} saved={page.custom} />
    </div>
  );
}
