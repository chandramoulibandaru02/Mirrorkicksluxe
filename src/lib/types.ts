import type { AUDIENCES } from "./brand";

export type Audience = (typeof AUDIENCES)[number];
export type ProductStatus = "draft" | "published" | "archived";

export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Variant {
  size: string;
  color: string;
  sku: string;
  stock: number;
}

/** Product as stored in Firestore (timestamps serialised to ISO strings for the app). */
export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  description: string;
  categoryId: string;
  audience: Audience;
  /** Selling price in whole rupees. */
  price: number;
  /** Optional original price (MRP) in whole rupees; only meaningful when greater than price. */
  originalPrice: number | null;
  images: ProductImage[];
  imagePublicIds: string[];
  variants: Variant[];
  attributes: { key: string; value: string }[];
  status: ProductStatus;
  featured: boolean;
  /** Denormalised for filtering. */
  sizes: string[];
  colors: string[];
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isPublic: boolean;
}

export type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cod";

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  image: string | null;
  unitPrice: number;
  originalUnitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface StatusHistoryEntry {
  kind: "fulfillment" | "payment";
  status: string;
  at: string;
  by: string;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  address: Address;
  contact: { name: string; email: string; phone: string };
  mrpTotal: number;
  subtotal: number;
  savings: number;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  businessName: string;
  supportEmail: string;
  phone: string;
  address: string;
  codEnabled: boolean;
  shippingFlat: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  businessName: "",
  supportEmail: "",
  phone: "",
  address: "",
  codEnabled: false,
  shippingFlat: 0,
  freeShippingThreshold: 0,
  lowStockThreshold: 0,
};

export interface CartItem {
  productId: string;
  sku: string;
  quantity: number;
}

export interface CartLine {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  size: string;
  color: string;
  price: number;
  originalPrice: number;
  stock: number;
  quantity: number;
  /** false when the product/variant is gone or out of stock. */
  available: boolean;
}
