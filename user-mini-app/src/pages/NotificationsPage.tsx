import { useEffect } from "react";
import { useI18n } from "../i18n";
import { api, clearUserApiCache } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { MyNotificationItem } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";

export function NotificationsPage({ isActive = true }: { isActive?: boolean }) {
  const { t } = useI18n();
  const state = useApi<MyNotificationItem[]>(
    () => api.get<MyNotificationItem[]>("/api/v1/notifications/me"),
    [],
  );

  // Auto-reload whenever tab becomes active
  useEffect(() => {
    if (isActive) {
      clearUserApiCache("/notifications/me");
      state.reload();
    }
  }, [isActive]);

  function handleManualRefresh() {
    clearUserApiCache("/notifications/me");
    state.reload();
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t.notifications.title}</h1>
        <button
          onClick={handleManualRefresh}
          className="btn btn-secondary"
          style={{ fontSize: 13, padding: "6px 12px", minHeight: "auto" }}
          title="Refresh notifications"
        >
          ↻ Refresh
        </button>
      </div>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={handleManualRefresh} />}

      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t.notifications.empty} />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div className="card">
          {state.data.map((n) => (
            <div className="list-item" key={n.id} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div className="list-item-title" style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 600, color: "var(--tg-text, #ffffff)" }}>
                {n.message}
              </div>
              <div className="list-item-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: "var(--tg-hint, #94a3b8)" }}>
                <span>📅 {new Date(n.sent_at ?? n.created_at).toLocaleString()}</span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: n.status === "SENT" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: n.status === "SENT" ? "#34d399" : "#fbbf24",
                }}>
                  {n.status === "SENT" ? "Delivered" : n.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
