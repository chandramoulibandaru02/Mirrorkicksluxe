import { z } from "zod";
import { AUDIENCES } from "./brand";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "./order-rules";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "";

export const imageSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => {
      try {
        const x = new URL(u);
        return x.protocol === "https:" && x.hostname === "res.cloudinary.com" && (!cloudName || x.pathname.startsWith(`/${cloudName}/`));
      } catch {
        return false;
      }
    }, "Image must be hosted on this store's Cloudinary account"),
  publicId: z.string().min(1).max(300).regex(/^footwear\/products\//, "Unexpected image folder"),
  alt: z.string().trim().max(200).default(""),
  sortOrder: z.number().int().min(0),
  isPrimary: z.boolean(),
});

export const variantSchema = z.object({
  size: z.string().trim().min(1, "Size is required").max(10),
  color: z.string().trim().min(1, "Colour is required").max(40),
  sku: z.string().trim().min(1, "Variant SKU is required").max(60),
  stock: z.number().int("Stock must be a whole number").min(0).max(100000),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(150),
    brand: z.string().trim().min(1, "Brand is required").max(80),
    sku: z.string().trim().min(1, "SKU is required").max(60),
    description: z.string().trim().max(5000).default(""),
    categoryId: z.string().min(1, "Choose a category"),
    audience: z.enum(AUDIENCES),
    price: z.number().int("Price must be a whole number of rupees").min(1, "Price is required").max(10_000_000),
    originalPrice: z.number().int().min(1).max(10_000_000).nullable().default(null),
    images: z.array(imageSchema).max(12, "At most 12 images"),
    variants: z.array(variantSchema).max(200),
    attributes: z
      .array(z.object({ key: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(120) }))
      .max(12)
      .default([]),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (p.originalPrice !== null && p.originalPrice <= p.price) {
      ctx.addIssue({ code: "custom", path: ["originalPrice"], message: "Original price must be higher than the selling price (or left empty)" });
    }
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      const k = v.sku.toLowerCase();
      if (skus.has(k)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate variant SKU" });
      skus.add(k);
    });
    const combos = new Set<string>();
    p.variants.forEach((v, i) => {
      const k = `${v.size.toLowerCase()}|${v.color.toLowerCase()}`;
      if (combos.has(k)) ctx.addIssue({ code: "custom", path: ["variants", i, "size"], message: "Duplicate size and colour" });
      combos.add(k);
    });
    if (p.status === "published") {
      if (p.images.length === 0) ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one image before publishing" });
      if (p.variants.length === 0) ctx.addIssue({ code: "custom", path: ["variants"], message: "Add at least one size/colour variant before publishing" });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isPublic: z.boolean().default(true),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().trim().min(3, "Address is required").max(150),
  line2: z.string().trim().max(150).default(""),
  city: z.string().trim().min(2, "City is required").max(60),
  state: z.string().trim().min(2, "State is required").max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
});

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(100),
      sku: z.string().min(1).max(60),
      quantity: z.number().int().min(1).max(10),
    }),
  )
  .max(50);

export const createOrderSchema = z.object({
  items: cartItemsSchema.min(1, "Your cart is empty"),
  address: addressSchema,
  contactPhone: z.string().trim().regex(/^[6-9]\d{9}$/),
  paymentMethod: z.literal("cod"),
  idempotencyKey: z.string().min(16).max(80).regex(/^[A-Za-z0-9_-]+$/),
});

export const orderUpdateSchema = z
  .object({
    status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES as [string, ...string[]]).optional(),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.status || v.paymentStatus, "Nothing to update");

export const settingsSchema = z.object({
  businessName: z.string().trim().max(80),
  supportEmail: z.union([z.literal(""), z.string().trim().email()]),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(300),
  codEnabled: z.boolean(),
  shippingFlat: z.number().int().min(0).max(100000),
  freeShippingThreshold: z.number().int().min(0).max(10_000_000),
  lowStockThreshold: z.number().int().min(0).max(1000),
});

export const pageContentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().max(40000),
});
