import { useCallback, useEffect, useState } from "react";
import {
  loginWithTelegram,
  loginWithCredentials,
  clearSession,
  ApiRequestError,
  setSession,
  getStoredSession,
} from "../services/api";

export type AuthState =
  | { status: "loading" }
  | { status: "ready"; isAdmin: boolean; role: string | null; permissions: string[] }
  | { status: "error"; message: string }
  | { status: "unauthenticated" }
  | { status: "not-admin" };

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const cached = getStoredSession();
    if (cached) {
      setSession(cached.accessToken, cached.permissions, {
        role: cached.role,
        isAdmin: cached.isAdmin,
      });
      return {
        status: "ready",
        isAdmin: cached.isAdmin,
        role: cached.role,
        permissions: cached.permissions,
      };
    }

    const hasTg = Boolean(window.Telegram?.WebApp?.initData);
    if (!hasTg) {
      return { status: "unauthenticated" };
    }

    return { status: "loading" };
  });

  useEffect(() => {
    const hasTg = Boolean(window.Telegram?.WebApp?.initData);
    if (!hasTg) {
      return;
    }

    let cancelled = false;

    loginWithTelegram()
      .then((result) => {
        if (cancelled) return;
        if (!result.is_admin) {
          setState({ status: "not-admin" });
          return;
        }
        setState({
          status: "ready",
          isAdmin: result.is_admin,
          role: result.role,
          permissions: result.permissions,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const cached = getStoredSession();
        if (cached) return;

        setState({ status: "unauthenticated" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWeb = useCallback(async (username: string, password: string) => {
    setState({ status: "loading" });
    try {
      const result = await loginWithCredentials(username, password);
      setState({
        status: "ready",
        isAdmin: result.is_admin,
        role: result.role,
        permissions: result.permissions,
      });
    } catch (err: unknown) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Invalid credentials or network error";
      setState({ status: "unauthenticated" });
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState({ status: "unauthenticated" });
  }, []);

  return { state, loginWeb, logout };
}
