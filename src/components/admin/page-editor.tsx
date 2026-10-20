"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, type ApiError } from "@/lib/client-api";

export function PageEditor({ slug, initialTitle, initialBody, saved }: { slug: string; initialTitle: string; initialBody: string; saved: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pending = (body.match(/\[CONFIRM/g) ?? []).length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/pages/${slug}`, { method: "PUT", body: { title, body } });
      setMsg({ ok: true, text: "Saved. The live page is updated." });
      router.refresh();
    } catch (err) {
      const e2 = err as ApiError;
      setMsg({ ok: false, text: e2.fields ? Object.values(e2.fields)[0] : e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      {!saved && (
        <p className="rounded-[3px] bg-amber-50 p-3 text-sm text-warn">
          This is the built-in starting text, not yet saved. It describes only what the store actually does today; replace every [CONFIRM: …] marker with your real business details and have it reviewed by a legal professional.
        </p>
      )}
      {pending > 0 && (
        <p role="status" className="rounded-[3px] border border-line bg-white p-3 text-sm">
          {pending} unresolved <code>[CONFIRM …]</code> marker{pending === 1 ? "" : "s"} remain. Resolve them before launch.
        </p>
      )}
      <div>
        <label htmlFor="p-title" className="label">Page title</label>
        <input id="p-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </div>
      <div>
        <label htmlFor="p-body" className="label">Content</label>
        <textarea id="p-body" className="field min-h-[24rem] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} maxLength={40000} aria-describedby="p-help" spellCheck />
        <p id="p-help" className="mt-1 text-xs text-muted">Formatting: start a line with <code>## </code> for a heading, <code>- </code> for bullet points, and leave a blank line between paragraphs. HTML is not rendered.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <Loader2 className="animate-spin" size={18} aria-hidden />} Save page
        </button>
        <Link href={`/${slug}`} className="btn btn-outline" target="_blank" rel="noopener">View live page</Link>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
