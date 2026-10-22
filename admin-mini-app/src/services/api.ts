import type { ApiError, LoginResult } from "../types";
import { getInitData } from "./telegram";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;
let permissions: Set<string> = new Set();

export function setSession(token: string, perms: string[]): void {
  accessToken = token;
  permissions = new Set(perms);
}

export function hasPermission(code: string): boolean {
  return permissions.has(code);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    if (!accessToken) {
      throw new ApiRequestError(401, "not_authenticated", "Not logged in yet");
    }
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let parsed: ApiError | null = null;
    try {
      parsed = await response.json();
    } catch {
      // response wasn't JSON - fall through to the generic error below
    }
    throw new ApiRequestError(
      response.status,
      parsed?.error.code ?? "request_failed",
      parsed?.error.message ?? `Request failed (${response.status})`,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function loginWithTelegram(): Promise<LoginResult> {
  const initData = getInitData();
  const result = await request<LoginResult>("/api/v1/auth/telegram-login", {
    method: "POST",
    body: { init_data: initData },
    auth: false,
  });
  setSession(result.access_token, result.permissions);
  return result;
}

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
};
