import { useEffect, useState } from "react";
import { loginWithTelegram, ApiRequestError, setAccessToken, getStoredUserSession } from "../services/api";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; isAdmin: boolean; role: string | null }
  | { status: "error"; message: string };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
    const isDev = import.meta.env.DEV && !window.Telegram?.WebApp?.initData;
    if (isDev) {
      setAccessToken("dev-token", { isAdmin: false, role: null, permissions: [] });
      return { status: "ready", isAdmin: false, role: null };
    }

    const cached = getStoredUserSession();
    if (cached) {
      setAccessToken(cached.accessToken, {
        isAdmin: cached.isAdmin,
        role: cached.role,
        permissions: cached.permissions,
      });
      return { status: "ready", isAdmin: cached.isAdmin, role: cached.role };
    }

    return { status: "loading" };
  });

  useEffect(() => {
    const isDev = import.meta.env.DEV && !window.Telegram?.WebApp?.initData;
    if (isDev) {
      return;
    }

    let cancelled = false;

    loginWithTelegram()
      .then((result) => {
        if (cancelled) return;
        setState({ status: "ready", isAdmin: result.is_admin, role: result.role });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // If we already had a valid stored session, don't crash on background re-check
        const cached = getStoredUserSession();
        if (cached) return;

        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Couldn't verify your Telegram session. Please reopen this from the bot.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
