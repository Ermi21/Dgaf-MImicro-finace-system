import type { ApiError } from "../types";
import { getInitDataAsync } from "./telegram";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "https://job-platform-backend-nbq3.onrender.com";

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const SESSION_STORAGE_KEY = "user_auth_session";

export interface StoredUserSession {
  accessToken: string;
  isAdmin: boolean;
  role: string | null;
  permissions: string[];
  timestamp: number;
}

export function getStoredUserSession(): StoredUserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUserSession;
    if (Date.now() - parsed.timestamp > 12 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

let accessToken: string | null = null;
let loginPromise:
  | Promise<{
      access_token: string;
      is_admin: boolean;
      role: string | null;
      permissions: string[];
    }>
  | null = null;

// In-memory cache for fast page navigation
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const apiCache = new Map<string, CacheEntry>();

function getTtlForPath(path: string): number {
  if (path.includes("/cities") || path.includes("/subcities") || path.includes("/woredas")) {
    return 5 * 60 * 1000; // 5 minutes
  }
  if (path.includes("/jobs")) {
    return 3 * 60 * 1000; // 3 minutes
  }
  if (path.includes("/registrations/me")) {
    return 10 * 1000; // 10 seconds
  }
  if (path.includes("/users/me")) {
    return 30 * 1000; // 30 seconds
  }
  if (path.includes("/reports/my-referrals") || path.includes("/notifications/me")) {
    return 15 * 1000; // 15 seconds
  }
  return 15 * 1000;
}

export function clearUserApiCache(prefix?: string): void {
  if (!prefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(prefix)) {
      apiCache.delete(key);
    }
  }
}

function invalidateCacheOnMutation(path: string): void {
  if (path.includes("/registrations")) {
    clearUserApiCache("/registrations");
    clearUserApiCache("/reports/my-referrals");
  } else if (path.includes("/users/me")) {
    clearUserApiCache("/users/me");
  } else {
    clearUserApiCache();
  }
}

export function setAccessToken(
  token: string,
  info?: { isAdmin?: boolean; role?: string | null; permissions?: string[] },
): void {
  accessToken = token;
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        isAdmin: info?.isAdmin ?? false,
        role: info?.role ?? null,
        permissions: info?.permissions ?? [],
        timestamp: Date.now(),
      }),
    );
  } catch {}
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
  if (!loginPromise) {
    loginPromise = (async () => {
      let initData = await getInitDataAsync();
      if (!initData) {
        if (import.meta.env.PROD) {
          throw new ApiRequestError(
            401,
            "missing_telegram_init_data",
            "Telegram did not provide session data. Please reopen this from the bot.",
          );
        }
        // Local development or browser preview outside Telegram:
        try {
          const devResult = await request<{
            access_token: string;
            is_admin: boolean;
            role: string | null;
            permissions: string[];
          }>("/api/v1/auth/admin-web-login", {
            method: "POST",
            body: { username: "admin", password: "admin123456" },
            auth: false,
          });
          setAccessToken(devResult.access_token, {
            isAdmin: devResult.is_admin,
            role: devResult.role,
            permissions: devResult.permissions,
          });
          return devResult;
        } catch {
          setAccessToken("dev-token", { isAdmin: false, role: null, permissions: [] });
          return {
            access_token: "dev-token",
            is_admin: false,
            role: null,
            permissions: [],
          };
        }
      }

      const result = await request<{
        access_token: string;
        is_admin: boolean;
        role: string | null;
        permissions: string[];
      }>("/api/v1/auth/telegram-login", {
        method: "POST",
        body: { init_data: initData },
        auth: false,
      });
      setAccessToken(result.access_token, {
        isAdmin: result.is_admin,
        role: result.role,
        permissions: result.permissions,
      });
      return result;
    })();
  }

  try {
    return await loginPromise;
  } catch (error) {
    loginPromise = null;
    throw error;
  }
}

export const api = {
  get: async <T>(
    path: string,
    options?: { bypassCache?: boolean; ttlMs?: number },
  ): Promise<T> => {
    if (!options?.bypassCache) {
      const cached = apiCache.get(path);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
    }
    const data = await request<T>(path);
    const ttl = options?.ttlMs ?? getTtlForPath(path);
    apiCache.set(path, { data, expiresAt: Date.now() + ttl });
    return data;
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await request<T>(path, { method: "POST", body });
    invalidateCacheOnMutation(path);
    return res;
  },
  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await request<T>(path, { method: "PATCH", body });
    invalidateCacheOnMutation(path);
    return res;
  },
};
