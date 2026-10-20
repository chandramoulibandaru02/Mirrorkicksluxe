import Link from "next/link";
import { requireAdminPage } from "@/lib/server/session";
import { getPageContent } from "@/lib/server/pages";
import { EDITABLE_PAGES } from "@/lib/pages";

export const metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireAdminPage();
  const entries = await Promise.all(
    Object.entries(EDITABLE_PAGES).map(async ([slug, def]) => {
      const c = await getPageContent(slug);
      return { slug, def, custom: c?.custom ?? false, pending: (c?.body.match(/\[CONFIRM/g) ?? []).length };
    }),
  );
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Pages</h1>
      <p className="text-sm text-muted">Legal pages shown in the store footer. Contact details come from Settings.</p>
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.slug} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{e.def.title}</p>
              <p className="text-sm text-muted">/{e.slug} · {e.custom ? "Edited" : "Built-in starting text"}{e.pending > 0 ? ` · ${e.pending} item${e.pending === 1 ? "" : "s"} to confirm` : ""}</p>
            </div>
            <Link href={`/admin/pages/${e.slug}`} className="btn btn-primary btn-sm">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
