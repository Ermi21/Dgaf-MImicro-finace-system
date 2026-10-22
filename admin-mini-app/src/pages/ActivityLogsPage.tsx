import { useState } from "react";
import { useI18n } from "../i18n";
import { api, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { ActivityLogItem } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { TextField } from "../components/TextField";

export function ActivityLogsPage() {
  const { t } = useI18n();
  const [entityType, setEntityType] = useState("");

  const query = toQuery({ entity_type: entityType || undefined, limit: 100 });
  const state = useApi<ActivityLogItem[]>(
    () => api.get<ActivityLogItem[]>(`/api/v1/activity-logs${query}`),
    [query],
  );

  return (
    <div className="screen">
      <h1 className="page-title">{t.activityLogs.title}</h1>

      <div className="card filter-bar">
        <TextField
          label={t.activityLogs.filterEntityType}
          placeholder="registration, job, admin..."
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
      </div>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div className="card">
          {state.data.map((log) => (
            <div className="list-item" key={log.id}>
              <div className="list-item-header">
                <span className="list-item-title">{log.action}</span>
                <span className="list-item-meta">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div className="list-item-meta">
                {log.entity_type} · {log.entity_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
