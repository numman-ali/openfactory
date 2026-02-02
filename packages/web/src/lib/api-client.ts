// SPDX-License-Identifier: AGPL-3.0

/**
 * Typed API client for the OpenFactory backend.
 * Uses fetch with JSON request/response handling and cookie-based auth.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Fastify-style error response shape */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: ApiErrorBody | null
  ) {
    super(body?.message ?? `API ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const base =
    typeof window !== "undefined"
      ? new URL(`${API_BASE}${path}`, window.location.origin)
      : new URL(`${API_BASE}${path}`, "http://localhost:3000");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        base.searchParams.set(key, String(value));
      }
    }
  }
  return base.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...Object.fromEntries(
      Object.entries(extraHeaders ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  };

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // Response body was not JSON
    }
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Convenience methods */
export const api = {
  get: <T>(path: string, params?: RequestOptions["params"]) =>
    apiRequest<T>(path, { method: "GET", params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PUT", body }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),
};

// ─── SWR Fetcher ──────────────────────────────────────────────────────────────

/** Generic SWR fetcher that uses the api client */
export function swrFetcher<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

// ─── SSE Stream Helper ────────────────────────────────────────────────────────

export interface SSEStreamOptions {
  onEvent: (event: unknown) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

/**
 * Opens an SSE connection to a POST endpoint and parses
 * newline-delimited JSON events from the response stream.
 */
export async function streamSSE(
  path: string,
  body: unknown,
  options: SSEStreamOptions
): Promise<void> {
  const url = buildUrl(path);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // not json
    }
    const err = new ApiError(response.status, response.statusText, errorBody);
    options.onError?.(err);
    return;
  }

  if (!response.body) {
    options.onError?.(new Error("Response body is null"));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // SSE format: "data: {...}"
        const dataPrefix = "data: ";
        const jsonStr = trimmed.startsWith(dataPrefix)
          ? trimmed.slice(dataPrefix.length)
          : trimmed;

        if (jsonStr === "[DONE]") {
          options.onDone?.();
          return;
        }

        try {
          const parsed: unknown = JSON.parse(jsonStr);
          options.onEvent(parsed);
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const jsonStr = buffer.trim().startsWith("data: ")
        ? buffer.trim().slice(6)
        : buffer.trim();
      if (jsonStr !== "[DONE]") {
        try {
          const parsed: unknown = JSON.parse(jsonStr);
          options.onEvent(parsed);
        } catch {
          // skip
        }
      }
    }

    options.onDone?.();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    options.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
