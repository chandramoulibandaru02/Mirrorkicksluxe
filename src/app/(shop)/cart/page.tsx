import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x py-4 sm:py-6">
      <h1 className="mb-3 text-xl font-bold">Your cart</h1>
      <CartView />
    </div>
  );
}
