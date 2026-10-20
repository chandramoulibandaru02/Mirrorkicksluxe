"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, RotateCcw, Star, Trash2, UploadCloud } from "lucide-react";
import { api } from "@/lib/client-api";
import { cldUrl } from "@/lib/pricing";

export interface ImageItem {
  key: string;
  url: string; // Cloudinary URL once uploaded, empty while uploading
  publicId: string;
  alt: string;
  isPrimary: boolean;
  /** Present only for files uploaded in this session and not yet saved with the product. */
  isNew: boolean;
  status: "done" | "uploading" | "error";
  progress: number;
  error?: string;
  preview?: string; // local object URL for instant preview
  file?: File;
}

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 12;

interface Signature { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; allowedFormats: string }

function uploadToCloudinary(file: File, sig: Signature, onProgress: (pct: number) => void): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    form.append("allowed_formats", sig.allowedFormats);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error("Unexpected response from the image service"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.timeout = 120_000;
    xhr.send(form);
  });
}

export function ImageUploader({ images, onChange, error }: { images: ImageItem[]; onChange: (updater: (cur: ImageItem[]) => ImageItem[]) => void; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);

  const patch = useCallback((key: string, p: Partial<ImageItem>) => onChange((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i))), [onChange]);

  const startUpload = useCallback(
    async (item: ImageItem) => {
      if (!item.file) return;
      patch(item.key, { status: "uploading", progress: 0, error: undefined });
      try {
        const sig = await api<Signature>("/api/admin/uploads/sign", { method: "POST", body: {} });
        const res = await uploadToCloudinary(item.file, sig, (pct) => patch(item.key, { progress: pct }));
        patch(item.key, { status: "done", progress: 100, url: res.secure_url, publicId: res.public_id, file: undefined });
      } catch (e) {
        patch(item.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    },
    [patch],
  );

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const problems: string[] = [];
      const room = Math.max(0, MAX_IMAGES - images.length);
      const accepted: ImageItem[] = [];
      for (const f of files) {
        if (!ALLOWED_TYPES.includes(f.type)) problems.push(`${f.name}: unsupported type. Use JPG, PNG, WebP or AVIF.`);
        else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than ${MAX_BYTES / 1024 / 1024} MB.`);
        else if (accepted.length >= room) problems.push(`${f.name}: skipped, a product can have at most ${MAX_IMAGES} images.`);
        else
          accepted.push({ key: crypto.randomUUID(), url: "", publicId: "", alt: "", isPrimary: false, isNew: true, status: "uploading", progress: 0, preview: URL.createObjectURL(f), file: f });
      }
      setNotices(problems);
      if (accepted.length === 0) return;
      onChange((cur) => {
        const next = [...cur, ...accepted];
        if (!next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
        return next;
      });
      accepted.forEach((a) => void startUpload(a));
    },
    [images.length, onChange, startUpload],
  );

  function move(i: number, dir: -1 | 1) {
    onChange((cur) => {
      const j = i + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function remove(item: ImageItem) {
    onChange((cur) => {
      const next = cur.filter((i) => i.key !== item.key);
      if (item.isPrimary && next.length) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
    if (item.preview) URL.revokeObjectURL(item.preview);
    // Unsaved uploads are removed from Cloudinary right away; the server refuses if any product uses the image.
    if (item.isNew && item.publicId) await api("/api/admin/uploads/delete", { method: "POST", body: { publicId: item.publicId } }).catch(() => undefined);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-2 rounded-[4px] border-2 border-dashed p-6 text-center ${dragging ? "border-brand bg-brand-soft" : "border-line bg-white"}`}
      >
        <UploadCloud size={28} className="text-brand" aria-hidden />
        <p className="text-sm">Drag and drop images here, or</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>Choose images</button>
        <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(",")} multiple className="sr-only" aria-label="Select product images" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <p className="text-xs text-muted">JPG, PNG, WebP or AVIF · up to {MAX_BYTES / 1024 / 1024} MB each · up to {MAX_IMAGES} images · {images.length} added</p>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      {notices.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-sm text-danger">
          {notices.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}

      {images.length > 0 && (
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Product images in display order">
          {images.map((img, i) => (
            <li key={img.key} className="card overflow-hidden">
              <div className="relative aspect-square bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview || cldUrl(img.url, 400)} alt={img.alt || `Image ${i + 1}`} className="size-full object-contain" />
                {img.status === "uploading" && (
                  <div className="absolute inset-x-0 bottom-0 bg-white/90 p-2" role="status">
                    <div className="flex items-center gap-2 text-xs"><Loader2 size={14} className="animate-spin" aria-hidden /> Uploading {img.progress}%</div>
                    <div className="mt-1 h-1.5 bg-line"><div className="h-full bg-brand" style={{ width: `${img.progress}%` }} /></div>
                  </div>
                )}
                {img.status === "error" && (
                  <div className="absolute inset-x-0 bottom-0 space-y-1 bg-white/95 p-2 text-xs" role="alert">
                    <p className="flex items-start gap-1 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden /> {img.error}</p>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => void startUpload(img)}><RotateCcw size={14} aria-hidden /> Retry</button>
                  </div>
                )}
                {img.isPrimary && <span className="absolute top-2 left-2 rounded-[3px] bg-brand px-2 py-0.5 text-xs font-semibold text-white">Primary</span>}
              </div>
              <div className="space-y-2 p-2.5">
                <label className="sr-only" htmlFor={`alt-${img.key}`}>Alt text for image {i + 1}</label>
                <input id={`alt-${img.key}`} className="field min-h-9 text-sm" placeholder="Alt text (describe the image)" value={img.alt} maxLength={200} onChange={(e) => patch(img.key, { alt: e.target.value })} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} earlier`}><ArrowLeft size={16} aria-hidden /></button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} later`}><ArrowRight size={16} aria-hidden /></button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={img.isPrimary} onClick={() => onChange((cur) => cur.map((x) => ({ ...x, isPrimary: x.key === img.key })))}>
                    <Star size={16} aria-hidden /> {img.isPrimary ? "Primary" : "Make primary"}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm ml-auto" onClick={() => void remove(img)} aria-label={`Remove image ${i + 1}`}><Trash2 size={16} aria-hidden /></button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
