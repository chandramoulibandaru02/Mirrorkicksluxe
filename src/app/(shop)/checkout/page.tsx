import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { requireUserPage } from "@/lib/server/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  await requireUserPage("/checkout");
  return (
    <div className="container-x py-4 sm:py-6">
      <h1 className="mb-3 text-xl font-bold">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
