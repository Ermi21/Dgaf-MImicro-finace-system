import { useI18n } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { MyNotificationItem } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";

export function NotificationsPage() {
  const { t } = useI18n();
  const state = useApi<MyNotificationItem[]>(
    () => api.get<MyNotificationItem[]>("/api/v1/notifications/me"),
    [],
  );

  return (
    <div className="screen">
      <h1 className="page-title">{t.notifications.title}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t.notifications.empty} />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div className="card">
          {state.data.map((n) => (
            <div className="list-item" key={n.id}>
              <div className="list-item-title">{n.message}</div>
              <div className="list-item-meta">
                {new Date(n.sent_at ?? n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
