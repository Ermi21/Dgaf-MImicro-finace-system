import { useState } from "react";
import { useI18n } from "../i18n";
import { api, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Page, UserRead } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";

const PAGE_SIZE = 20;

export function UsersPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const query = toQuery({ q: q || undefined, page, page_size: PAGE_SIZE });
  const state = useApi<Page<UserRead>>(() => api.get<Page<UserRead>>(`/api/v1/users${query}`), [query]);

  return (
    <div className="screen">
      <h1 className="page-title">{t.users.title}</h1>

      <div className="card filter-bar">
        <TextField
          label={t.users.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setPage(1)}
        />
        <Button onClick={() => setPage(1)}>{t.common.search}</Button>
      </div>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}
      {state.status === "success" && state.data.items.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {state.status === "success" && state.data.items.length > 0 && (
        <>
          <div className="card">
            {state.data.items.map((u) => (
              <div className="list-item" key={u.id}>
                <div className="list-item-header">
                  <span className="list-item-title">
                    {u.first_name} {u.second_name}
                  </span>
                  <span className={`badge ${u.is_active ? "badge-approved" : "badge-cancelled"}`}>
                    {u.is_active ? t.common.active : t.common.inactive}
                  </span>
                </div>
                <div className="list-item-meta">
                  {u.phone} · {u.language.toUpperCase()}
                </div>
                <div className="list-item-meta">
                  {t.users.columnJoined}: {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={state.data.total_pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
