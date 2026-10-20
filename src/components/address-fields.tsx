"use client";

import type { Address } from "@/lib/types";

export const emptyAddress: Address = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

export function validateAddress(a: Address): Record<string, string> {
  const e: Record<string, string> = {};
  if (a.fullName.trim().length < 2) e.fullName = "Full name is required";
  if (!/^[6-9]\d{9}$/.test(a.phone.trim())) e.phone = "Enter a valid 10-digit Indian mobile number";
  if (a.line1.trim().length < 3) e.line1 = "Address is required";
  if (a.city.trim().length < 2) e.city = "City is required";
  if (a.state.trim().length < 2) e.state = "State is required";
  if (!/^[1-9]\d{5}$/.test(a.pincode.trim())) e.pincode = "Enter a valid 6-digit PIN code";
  return e;
}

export function AddressFields({ value, onChange, errors, idPrefix = "addr" }: { value: Address; onChange: (a: Address) => void; errors: Record<string, string>; idPrefix?: string }) {
  const f = (key: keyof Address, label: string, opts: { autoComplete?: string; inputMode?: "numeric" | "tel"; maxLength?: number; optional?: boolean; wide?: boolean } = {}) => (
    <div className={opts.wide ? "sm:col-span-2" : ""}>
      <label htmlFor={`${idPrefix}-${key}`} className="label">
        {label}
        {opts.optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <input
        id={`${idPrefix}-${key}`}
        className="field"
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        maxLength={opts.maxLength}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${idPrefix}-${key}-err` : undefined}
      />
      {errors[key] && (
        <p id={`${idPrefix}-${key}-err`} className="mt-1 text-sm text-danger">
          {errors[key]}
        </p>
      )}
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {f("fullName", "Full name", { autoComplete: "name" })}
      {f("phone", "Mobile number", { autoComplete: "tel-national", inputMode: "tel", maxLength: 10 })}
      {f("line1", "Address (house no., street, area)", { autoComplete: "address-line1", wide: true })}
      {f("line2", "Landmark / address line 2", { autoComplete: "address-line2", optional: true, wide: true })}
      {f("city", "City", { autoComplete: "address-level2" })}
      {f("state", "State", { autoComplete: "address-level1" })}
      {f("pincode", "PIN code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6 })}
    </div>
  );
}
