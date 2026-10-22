import { useEffect, useState } from "react";
import { loginWithTelegram, ApiRequestError } from "../services/api";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; isAdmin: boolean; role: string | null; permissions: string[] }
  | { status: "error"; message: string }
  | { status: "not-admin" };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
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
