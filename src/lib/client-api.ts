export interface ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
}

export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.fields = data.fields;
    throw err;
  }
  return data as T;
}
