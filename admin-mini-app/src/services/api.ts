import type { ApiError, LoginResult } from "../types";
import { getInitDataAsync } from "./telegram";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "";

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const SESSION_STORAGE_KEY = "admin_auth_session";

export interface StoredSession {
  accessToken: string;
  role: string | null;
  isAdmin: boolean;
  permissions: string[];
  timestamp: number;
}

export function getStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    // Session valid for 12 hours
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
let permissions: Set<string> = new Set();
let loginPromise: Promise<LoginResult> | null = null;

// In-memory response cache for lightning-fast navigation
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
  if (path.includes("/reports/dashboard") || path.includes("/reports/referrals")) {
    return 60 * 1000; // 60 seconds
  }
  if (path.includes("/registrations") || path.includes("/users") || path.includes("/activity-logs")) {
    return 10 * 1000; // 10 seconds
  }
  return 15 * 1000;
}

export function clearApiCache(prefix?: string): void {
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
    clearApiCache("/registrations");
    clearApiCache("/reports");
  } else if (path.includes("/jobs")) {
    clearApiCache("/jobs");
    clearApiCache("/reports");
  } else if (path.includes("/cities") || path.includes("/subcities") || path.includes("/woredas")) {
    clearApiCache("/cities");
    clearApiCache("/subcities");
    clearApiCache("/woredas");
  } else if (path.includes("/notifications")) {
    clearApiCache("/notifications");
    clearApiCache("/reports");
  } else if (path.includes("/admin-management")) {
    clearApiCache("/admin-management");
  } else {
    clearApiCache("/reports");
  }
}

export function setSession(
  token: string,
  perms: string[],
  info?: { role?: string | null; isAdmin?: boolean },
): void {
  accessToken = token;
  permissions = new Set(perms);
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        role: info?.role ?? null,
        isAdmin: info?.isAdmin ?? true,
        permissions: perms,
        timestamp: Date.now(),
      }),
    );
  } catch {}
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
  if (!loginPromise) {
    loginPromise = (async () => {
      let initData = await getInitDataAsync();
      if (!initData && import.meta.env.PROD) {
        throw new ApiRequestError(
          401,
          "missing_telegram_init_data",
          "Telegram did not provide session data. Please reopen this from the bot.",
        );
      }
      initData = initData || "";

      const result = await request<LoginResult>("/api/v1/auth/telegram-login", {
        method: "POST",
        body: { init_data: initData },
        auth: false,
      });
      setSession(result.access_token, result.permissions, {
        role: result.role,
        isAdmin: result.is_admin,
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

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
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
  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await request<T>(path, { method: "PUT", body });
    invalidateCacheOnMutation(path);
    return res;
  },
  delete: async <T>(path: string): Promise<T> => {
    const res = await request<T>(path, { method: "DELETE" });
    invalidateCacheOnMutation(path);
    return res;
  },
};
