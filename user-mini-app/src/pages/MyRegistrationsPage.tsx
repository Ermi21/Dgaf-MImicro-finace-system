import { useI18n } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { MyRegistrationItem } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState, StatusBadge } from "../components/Feedback";

export function MyRegistrationsPage() {
  const { t } = useI18n();
  const state = useApi<MyRegistrationItem[]>(
    () => api.get<MyRegistrationItem[]>("/api/v1/registrations/me"),
    [],
  );

  return (
    <div className="screen">
      <h1 className="page-title">{t.registrations.title}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t.registrations.empty} hint={t.registrations.emptyHint} />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div className="card">
          {state.data.map((reg) => (
            <div className="list-item" key={reg.id}>
              <div className="list-item-header">
                <span className="list-item-title">{reg.job_name}</span>
                <StatusBadge status={reg.status} />
              </div>
              <div className="list-item-meta">
                {reg.city_name} / {reg.subcity_name} / {reg.woreda_name}
              </div>
              <div className="list-item-meta">
                {t.registrations.submittedOn}: {new Date(reg.created_at).toLocaleDateString()}
              </div>
              {reg.status === "REJECTED" && reg.rejection_reason && (
                <div className="list-item-meta">
                  {t.registrations.rejectionReason}: {reg.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
