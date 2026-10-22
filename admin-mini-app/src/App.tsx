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
import { DigafLogo } from "./components/DigafLogo";

import {
  DashboardIcon,
  RegistrationsIcon,
  UsersIcon,
  JobsIcon,
  LocationsIcon,
  NotificationsIcon,
  ReportsIcon,
  ActivityLogsIcon,
  AdminManagementIcon,
} from "./components/AdminIcons";

/** True only in `npm run dev` AND outside a real Telegram client (initData is empty). */
const DEV_BYPASS = import.meta.env.DEV && !window.Telegram?.WebApp?.initData;

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

const NAV_ITEMS: { view: View; permission: string; labelKey: string; icon: React.ReactNode }[] = [
  { view: "dashboard",        permission: Permissions.DASHBOARD_VIEW,    labelKey: "dashboard",       icon: <DashboardIcon /> },
  { view: "registrations",    permission: Permissions.REGISTRATION_VIEW, labelKey: "registrations",   icon: <RegistrationsIcon /> },
  { view: "users",            permission: Permissions.USER_VIEW,         labelKey: "users",           icon: <UsersIcon /> },
  { view: "jobs",             permission: Permissions.JOB_VIEW,          labelKey: "jobs",            icon: <JobsIcon /> },
  { view: "locations",        permission: Permissions.LOCATION_VIEW,     labelKey: "locations",       icon: <LocationsIcon /> },
  { view: "notifications",    permission: Permissions.NOTIFICATION_VIEW, labelKey: "notifications",   icon: <NotificationsIcon /> },
  { view: "reports",          permission: Permissions.REPORT_VIEW,       labelKey: "reports",         icon: <ReportsIcon /> },
  { view: "activity-logs",    permission: Permissions.ACTIVITY_LOG_VIEW, labelKey: "activityLogs",    icon: <ActivityLogsIcon /> },
  { view: "admin-management", permission: Permissions.ADMIN_MANAGE,      labelKey: "adminManagement", icon: <AdminManagementIcon /> },
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
  const [visited, setVisited] = useState<Set<View>>(() => new Set([viewFromUrl()]));
  const [lang] = useState<Language>(initialLanguage());

  function navigateTo(nextView: View) {
    setVisited((prev) => new Set(prev).add(nextView));
    setView(nextView);
  }

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
      {DEV_BYPASS && <DevBanner />}
      <div className="admin-shell">
        <nav className="admin-nav">
          <div className="admin-nav-brand" style={{ padding: "4px 8px" }}>
            <DigafLogo size={26} adminBadge={true} />
          </div>
          <div className="admin-nav-divider" />
          {visibleNav.map((item) => (
            <button
              key={item.view}
              className={`admin-nav-item ${view === item.view ? "admin-nav-item-active" : ""}`}
              onClick={() => navigateTo(item.view)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">
                {getDictionary(lang).nav[item.labelKey as keyof ReturnType<typeof getDictionary>["nav"]]}
              </span>
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
              {visited.has("dashboard") && (
                <div style={{ display: view === "dashboard" ? "block" : "none" }}>
                  <DashboardPage />
                </div>
              )}
              {visited.has("registrations") && (
                <div style={{ display: view === "registrations" ? "block" : "none" }}>
                  <RegistrationsPage />
                </div>
              )}
              {visited.has("users") && (
                <div style={{ display: view === "users" ? "block" : "none" }}>
                  <UsersPage />
                </div>
              )}
              {visited.has("jobs") && (
                <div style={{ display: view === "jobs" ? "block" : "none" }}>
                  <JobsPage />
                </div>
              )}
              {visited.has("locations") && (
                <div style={{ display: view === "locations" ? "block" : "none" }}>
                  <LocationsPage />
                </div>
              )}
              {visited.has("notifications") && (
                <div style={{ display: view === "notifications" ? "block" : "none" }}>
                  <NotificationsPage />
                </div>
              )}
              {visited.has("reports") && (
                <div style={{ display: view === "reports" ? "block" : "none" }}>
                  <ReportsPage />
                </div>
              )}
              {visited.has("activity-logs") && (
                <div style={{ display: view === "activity-logs" ? "block" : "none" }}>
                  <ActivityLogsPage />
                </div>
              )}
              {visited.has("admin-management") && (
                <div style={{ display: view === "admin-management" ? "block" : "none" }}>
                  <AdminManagementPage />
                </div>
              )}
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

/** Shown only in browser dev mode — never rendered inside a real Telegram WebApp. */
function DevBanner() {
  return (
    <div
      style={{
        background: "#0f1a14",
        color: "#4ade80",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textAlign: "center",
        padding: "6px 12px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      ⚠️ DEV PREVIEW — Open from the bot for full functionality.
    </div>
  );
}
