"use client";

import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useCart } from "./cart-provider";

export function AccountLink() {
  const { user, loading } = useAuth();
  const cls = "flex min-h-11 items-center gap-1.5 px-2.5 text-sm font-semibold hover:bg-white/10 rounded-[3px]";
  if (loading) return <span className={cls} aria-hidden><User size={20} /></span>;
  return user ? (
    <Link href="/account" className={cls}>
      <User size={20} aria-hidden />
      <span className="max-w-24 truncate">{user.name ? user.name.split(" ")[0] : "Account"}</span>
    </Link>
  ) : (
    <Link href="/login" className={cls}>
      <User size={20} aria-hidden />
      <span>Sign in</span>
    </Link>
  );
}

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative flex min-h-11 items-center gap-1.5 rounded-[3px] px-2.5 text-sm font-semibold hover:bg-white/10" aria-label={ready && count > 0 ? `Cart, ${count} items` : "Cart"}>
      <ShoppingCart size={20} aria-hidden />
      <span>Cart</span>
      {ready && count > 0 && <span className="min-w-5 rounded-[3px] bg-cta px-1 text-center text-xs leading-5">{count}</span>}
    </Link>
  );
}
