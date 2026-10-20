import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLoginPage() {
  const s = await getSession();
  if (s?.isAdmin) redirect("/admin");
  return <AdminLoginForm signedInNonAdmin={Boolean(s)} />;
}
