import { useEffect, useState } from "react";
import { loginWithTelegram, ApiRequestError, setSession, getStoredSession } from "../services/api";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; isAdmin: boolean; role: string | null; permissions: string[] }
  | { status: "error"; message: string }
  | { status: "not-admin" };

const DEV_PERMISSIONS = [
  "dashboard.view", "registration.view", "registration.approve",
  "registration.reject", "registration.suspend", "user.view",
  "job.view", "job.create", "job.update", "job.activate",
  "location.view", "location.create", "location.update",
  "notification.view", "notification.send", "report.view",
  "activity_log.view", "admin.manage", "role.manage", "settings.manage",
];

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
    const isDev = import.meta.env.DEV && !window.Telegram?.WebApp?.initData;
    if (isDev) {
      setSession("dev-token", DEV_PERMISSIONS, { role: "SUPER_ADMIN", isAdmin: true });
      return { status: "ready", isAdmin: true, role: "SUPER_ADMIN", permissions: DEV_PERMISSIONS };
    }

    const cached = getStoredSession();
    if (cached) {
      setSession(cached.accessToken, cached.permissions, { role: cached.role, isAdmin: cached.isAdmin });
      return {
        status: "ready",
        isAdmin: cached.isAdmin,
        role: cached.role,
        permissions: cached.permissions,
      };
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
        // If we already had a valid stored session, don't crash on background re-check
        const cached = getStoredSession();
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
