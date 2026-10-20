"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartItem } from "@/lib/types";
import { useAuth } from "./auth-provider";

const KEY = "cart.v1";
const MAX_QTY = 10;

interface CartContextValue {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: CartItem) => void;
  setQuantity: (productId: string, sku: string, quantity: number) => void;
  remove: (productId: string, sku: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartContextValue | null>(null);

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.productId === "string" && typeof i.sku === "string" && Number.isInteger(i.quantity) && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

function merge(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const i of [...a, ...b]) {
    const k = `${i.productId}|${i.sku}`;
    const prev = map.get(k);
    map.set(k, prev ? { ...prev, quantity: Math.min(MAX_QTY, Math.max(prev.quantity, i.quantity)) } : { ...i });
  }
  return [...map.values()];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    // localStorage is only readable after hydration; reading it during render would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // On sign-in, merge the guest basket with the saved server basket once per user.
  useEffect(() => {
    if (!ready || loading || !user || syncedFor.current === user.uid) return;
    syncedFor.current = user.uid;
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: CartItem[] }) => setItems((cur) => merge(d.items ?? [], cur)))
      .catch(() => undefined);
  }, [ready, loading, user]);
  useEffect(() => {
    if (!user) syncedFor.current = null;
  }, [user]);

  // Persist locally always; persist to the server (debounced) for signed-in customers.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage may be unavailable (private mode) */
    }
    if (!user || syncedFor.current !== user.uid) return;
    const t = setTimeout(() => {
      fetch("/api/cart", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [items, ready, user]);

  const add = useCallback((item: CartItem) => {
    setItems((cur) => {
      const k = cur.findIndex((i) => i.productId === item.productId && i.sku === item.sku);
      if (k === -1) return [...cur, { ...item, quantity: Math.min(item.quantity, MAX_QTY) }];
      const next = [...cur];
      next[k] = { ...next[k], quantity: Math.min(MAX_QTY, next[k].quantity + item.quantity) };
      return next;
    });
  }, []);
  const setQuantity = useCallback((productId: string, sku: string, quantity: number) => {
    setItems((cur) => cur.map((i) => (i.productId === productId && i.sku === sku ? { ...i, quantity: Math.min(MAX_QTY, Math.max(1, quantity)) } : i)));
  }, []);
  const remove = useCallback((productId: string, sku: string) => setItems((cur) => cur.filter((i) => !(i.productId === productId && i.sku === sku))), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, count: items.reduce((n, i) => n + i.quantity, 0), ready, add, setQuantity, remove, clear }), [items, ready, add, setQuantity, remove, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
export { MAX_QTY };
