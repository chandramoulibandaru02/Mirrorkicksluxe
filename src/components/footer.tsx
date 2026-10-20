import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { getSettings } from "@/lib/server/settings";

export async function Footer() {
  const s = await getSettings();
  const name = s.businessName || SITE_NAME;
  return (
    <footer className="mt-10 bg-ink text-sm text-white/85">
      <div className="container-x grid gap-8 py-8 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-base font-semibold text-white">{name}</p>
          {s.address && <p className="whitespace-pre-line">{s.address}</p>}
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">Customer service</p>
          <ul className="space-y-1.5">
            {s.supportEmail && (
              <li>
                <a href={`mailto:${s.supportEmail}`} className="hover:underline">
                  {s.supportEmail}
                </a>
              </li>
            )}
            {s.phone && (
              <li>
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {s.phone}
                </a>
              </li>
            )}
            <li>
              <Link href="/contact" className="hover:underline">
                Contact us
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:underline">
                Your orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-white">Legal</p>
          <ul className="space-y-1.5">
            <li>
              <Link href="/privacy-policy" className="hover:underline">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms-and-conditions" className="hover:underline">
                Terms and conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 py-3 text-center text-xs text-white/70">
        &copy; {new Date().getFullYear()} {name}
      </div>
    </footer>
  );
}
