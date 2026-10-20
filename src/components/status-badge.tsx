const TONE: Record<string, string> = {
  placed: "bg-brand-soft text-brand",
  confirmed: "bg-brand-soft text-brand",
  packed: "bg-brand-soft text-brand",
  shipped: "bg-amber-50 text-warn",
  delivered: "bg-green-50 text-ok",
  cancelled: "bg-red-50 text-danger",
  pending: "bg-amber-50 text-warn",
  paid: "bg-green-50 text-ok",
  failed: "bg-red-50 text-danger",
  refunded: "bg-page text-muted",
  published: "bg-green-50 text-ok",
  draft: "bg-amber-50 text-warn",
  archived: "bg-page text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-[3px] px-2 py-0.5 text-xs font-semibold capitalize ${TONE[status] ?? "bg-page text-muted"}`}>{status}</span>;
}
