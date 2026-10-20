import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Reject cross-site mutation requests (defence in depth on top of SameSite=Lax cookies). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients / same-origin GET-like fetches
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Bad origin");
  }
  if (host && originHost !== host) throw new HttpError(403, "Cross-origin request blocked");
}

export async function readJson(req: Request): Promise<unknown> {
  assertSameOrigin(req);
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of e.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
        return NextResponse.json({ error: "Please correct the highlighted fields.", fields }, { status: 400 });
      }
      console.error("[api] unhandled error", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
