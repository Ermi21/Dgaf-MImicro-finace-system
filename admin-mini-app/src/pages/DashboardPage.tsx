import { useI18n } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { DashboardStats } from "../types";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";
import { StatCard } from "../components/StatCard";

export function DashboardPage() {
  const { t } = useI18n();
  const state = useApi<DashboardStats>(() => api.get<DashboardStats>("/api/v1/reports/dashboard"), []);

  return (
    <div className="screen">
      <h1 className="page-title">{t.dashboard.title}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && (
        <div className="stat-grid">
          <StatCard label={t.dashboard.totalUsers} value={state.data.total_users} />
          <StatCard label={t.dashboard.totalRegistrations} value={state.data.total_registrations} />
          <StatCard label={t.dashboard.pending} value={state.data.pending_registrations} />
          <StatCard label={t.dashboard.approved} value={state.data.approved_registrations} />
          <StatCard label={t.dashboard.rejected} value={state.data.rejected_registrations} />
          <StatCard label={t.dashboard.suspended} value={state.data.suspended_registrations} />
          <StatCard label={t.dashboard.activeJobs} value={state.data.active_jobs} />
          <StatCard label={t.dashboard.activeCities} value={state.data.active_cities} />
          <StatCard label={t.dashboard.notificationsSent} value={state.data.notifications_sent} />
          <StatCard label={t.dashboard.notificationsFailed} value={state.data.notifications_failed} />
        </div>
      )}
    </div>
  );
}
