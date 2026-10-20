import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";
import { getSettings } from "@/lib/server/settings";
import { EmptyState } from "@/components/product-ui";

export const metadata: Metadata = { title: "Contact us", description: "How to reach our customer support team.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  const has = s.supportEmail || s.phone || s.address;
  return (
    <div className="container-x max-w-3xl py-6">
      <h1 className="mb-4 text-2xl font-bold">Contact {s.businessName || SITE_NAME}</h1>
      {has ? (
        <dl className="card grid gap-4 p-5 text-sm sm:grid-cols-[8rem_1fr]">
          {s.supportEmail && (<><dt className="font-semibold">Email</dt><dd><a className="text-brand underline" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></dd></>)}
          {s.phone && (<><dt className="font-semibold">Phone</dt><dd><a className="text-brand underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></dd></>)}
          {s.address && (<><dt className="font-semibold">Address</dt><dd className="whitespace-pre-line">{s.address}</dd></>)}
        </dl>
      ) : (
        <EmptyState title="Contact details have not been published yet">The store owner can add them in Admin → Settings.</EmptyState>
      )}
    </div>
  );
}
