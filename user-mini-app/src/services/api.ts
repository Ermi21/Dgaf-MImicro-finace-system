import type { ApiError } from "../types";
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

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
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

export async function loginWithTelegram(): Promise<{
  access_token: string;
  is_admin: boolean;
  role: string | null;
  permissions: string[];
}> {
  const initData = getInitData();
  const result = await request<{
    access_token: string;
    is_admin: boolean;
    role: string | null;
    permissions: string[];
  }>("/api/v1/auth/telegram-login", { method: "POST", body: { init_data: initData }, auth: false });
  setAccessToken(result.access_token);
  return result;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
};
