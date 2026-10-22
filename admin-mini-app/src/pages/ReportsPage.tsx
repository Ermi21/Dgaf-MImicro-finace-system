import { useI18n } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { RegistrationTrends } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";

function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-row-label">{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <div className="bar-row-count">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { t } = useI18n();
  const state = useApi<RegistrationTrends>(
    () => api.get<RegistrationTrends>("/api/v1/reports/registrations"),
    [],
  );

  return (
    <div className="screen">
      <h1 className="page-title">{t.reports.title}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && (
        <>
          <div className="card">
            <h2 className="section-title">{t.reports.byJob}</h2>
            {state.data.by_job.length === 0 ? (
              <EmptyState title={t.common.noResults} />
            ) : (
              <BarList items={state.data.by_job.map((r) => ({ label: r.job, count: r.count }))} />
            )}
          </div>
          <div className="card">
            <h2 className="section-title">{t.reports.byCity}</h2>
            {state.data.by_city.length === 0 ? (
              <EmptyState title={t.common.noResults} />
            ) : (
              <BarList items={state.data.by_city.map((r) => ({ label: r.city, count: r.count }))} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
