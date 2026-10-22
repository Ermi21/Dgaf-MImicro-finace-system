import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "../services/api";

export type FetchState<T> =
  | { status: "loading"; data?: T; isRevalidating?: boolean }
  | { status: "success"; data: T; isRevalidating?: boolean }
  | { status: "error"; message: string; code?: string; data?: T; isRevalidating?: boolean };

/**
 * Generic data-fetching hook with Stale-While-Revalidate support.
 * Keeps existing data when revalidating to ensure page transitions and reloads
 * are fast and don't flicker blank screens.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): FetchState<T> & { reload: () => void } {
  const dataRef = useRef<T | undefined>(undefined);
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(() => {
    if (dataRef.current !== undefined) {
      setState({ status: "success", data: dataRef.current, isRevalidating: true });
    } else {
      setState({ status: "loading" });
    }

    fetcherRef.current()
      .then((data) => {
        dataRef.current = data;
        setState({ status: "success", data, isRevalidating: false });
      })
      .catch((err: unknown) => {
        if (dataRef.current !== undefined) {
          setState({ status: "success", data: dataRef.current, isRevalidating: false });
        } else if (err instanceof ApiRequestError) {
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
