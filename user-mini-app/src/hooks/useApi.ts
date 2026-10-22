import { useCallback, useEffect, useState } from "react";
import { ApiRequestError } from "../services/api";

type FetchState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; code?: string };

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): FetchState<T> & { reload: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetcher()
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setState({ status: "error", message: err.message, code: err.code });
        } else {
          setState({ status: "error", message: "Something went wrong." });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { ...state, reload: () => setReloadKey((k) => k + 1) } as FetchState<T> & {
    reload: () => void;
  };
}
