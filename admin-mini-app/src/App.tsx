import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { I18nContext, getDictionary, type Language } from "./i18n";
import { getTelegramUser } from "./services/telegram";
import { hasPermission } from "./services/api";
import { LoadingSpinner, ErrorBanner, AccessDenied } from "./components/Feedback";
import { Permissions } from "./permissions";
import { DashboardPage } from "./pages/DashboardPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { UsersPage } from "./pages/UsersPage";
import { JobsPage } from "./pages/JobsPage";
import { LocationsPage } from "./pages/LocationsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ActivityLogsPage } from "./pages/ActivityLogsPage";
import { AdminManagementPage } from "./pages/AdminManagementPage";

type View =
  | "dashboard"
  | "registrations"
  | "users"
  | "jobs"
  | "locations"
  | "notifications"
  | "reports"
  | "activity-logs"
  | "admin-management";

const NAV_ITEMS: { view: View; permission: string; labelKey: string }[] = [
  { view: "dashboard", permission: Permissions.DASHBOARD_VIEW, labelKey: "dashboard" },
  { view: "registrations", permission: Permissions.REGISTRATION_VIEW, labelKey: "registrations" },
  { view: "users", permission: Permissions.USER_VIEW, labelKey: "users" },
  { view: "jobs", permission: Permissions.JOB_VIEW, labelKey: "jobs" },
  { view: "locations", permission: Permissions.LOCATION_VIEW, labelKey: "locations" },
  { view: "notifications", permission: Permissions.NOTIFICATION_VIEW, labelKey: "notifications" },
  { view: "reports", permission: Permissions.REPORT_VIEW, labelKey: "reports" },
  { view: "activity-logs", permission: Permissions.ACTIVITY_LOG_VIEW, labelKey: "activityLogs" },
  { view: "admin-management", permission: Permissions.ADMIN_MANAGE, labelKey: "adminManagement" },
];

function viewFromUrl(): View {
  const param = new URLSearchParams(window.location.search).get("view");
  const valid = NAV_ITEMS.map((n) => n.view);
  return (valid as string[]).includes(param ?? "") ? (param as View) : "dashboard";
}

function initialLanguage(): Language {
  const tgLang = getTelegramUser()?.language_code;
  return tgLang?.startsWith("am") ? "am" : "en";
}

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState<View>(viewFromUrl());
  const [lang] = useState<Language>(initialLanguage());

  if (auth.status === "loading") {
    return (
      <div className="screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (auth.status === "not-admin") {
    return (
      <div className="screen">
        <AccessDeniedStandalone lang={lang} />
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="screen">
        <ErrorBanner message={auth.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <I18nContext.Provider value={{ lang, setLang: () => {}, t: getDictionary(lang) }}>
      <div className="admin-shell">
        <nav className="admin-nav">
          {visibleNav.map((item) => (
            <button
              key={item.view}
              className={`admin-nav-item ${view === item.view ? "admin-nav-item-active" : ""}`}
              onClick={() => setView(item.view)}
            >
              {getDictionary(lang).nav[item.labelKey as keyof ReturnType<typeof getDictionary>["nav"]]}
            </button>
          ))}
        </nav>
        <main className="admin-main">
          {!hasPermission(NAV_ITEMS.find((n) => n.view === view)?.permission ?? "") ? (
            <div className="screen">
              <AccessDenied />
            </div>
          ) : (
            <>
              {view === "dashboard" && <DashboardPage />}
              {view === "registrations" && <RegistrationsPage />}
              {view === "users" && <UsersPage />}
              {view === "jobs" && <JobsPage />}
              {view === "locations" && <LocationsPage />}
              {view === "notifications" && <NotificationsPage />}
              {view === "reports" && <ReportsPage />}
              {view === "activity-logs" && <ActivityLogsPage />}
              {view === "admin-management" && <AdminManagementPage />}
            </>
          )}
        </main>
      </div>
    </I18nContext.Provider>
  );
}

function AccessDeniedStandalone({ lang }: { lang: Language }) {
  const t = getDictionary(lang);
  return <div className="empty-state-title">{t.common.accessDenied}</div>;
}
