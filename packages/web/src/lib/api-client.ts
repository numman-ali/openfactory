// SPDX-License-Identifier: AGPL-3.0

/**
 * Typed API client for the OpenFactory backend.
 * Uses fetch with JSON request/response handling and auth token injection.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(
      Object.entries(extraHeaders ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  };

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
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

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),
};
