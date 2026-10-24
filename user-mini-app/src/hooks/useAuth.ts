import { useEffect, useState } from "react";
import { loginWithTelegram, ApiRequestError, setAccessToken, getStoredUserSession } from "../services/api";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; isAdmin: boolean; role: string | null }
  | { status: "error"; message: string };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
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
    let cancelled = false;

    loginWithTelegram()
      .then((result) => {
        if (cancelled) return;
        setState({ status: "ready", isAdmin: result.is_admin, role: result.role });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const cached = getStoredUserSession();
        if (cached) return;

        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Couldn't verify your session. Please reopen.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
