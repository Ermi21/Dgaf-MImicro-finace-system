import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "./hooks/useAuth";
import { I18nContext, getDictionary, type Language } from "./i18n";
import { getTelegramUser } from "./services/telegram";
import { hasPermission } from "./services/api";
import { LoadingSpinner, ErrorBanner, AccessDenied } from "./components/Feedback";
import { Permissions } from "./permissions";
import { DashboardPage } from "./pages/DashboardPage";
import { DigafLogo } from "./components/DigafLogo";

// Lazy-loaded pages to make initial app load instantaneous
const RegistrationsPage = lazy(() => import("./pages/RegistrationsPage").then((m) => ({ default: m.RegistrationsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const JobsPage = lazy(() => import("./pages/JobsPage").then((m) => ({ default: m.JobsPage })));
const LocationsPage = lazy(() => import("./pages/LocationsPage").then((m) => ({ default: m.LocationsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ActivityLogsPage = lazy(() => import("./pages/ActivityLogsPage").then((m) => ({ default: m.ActivityLogsPage })));
const AdminManagementPage = lazy(() => import("./pages/AdminManagementPage").then((m) => ({ default: m.AdminManagementPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));

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
  let param: string | null = null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    param = searchParams.get("view");
  } catch {}

  if (!param && window.location.hash) {
    try {
      const hash = window.location.hash;
      const queryPart = hash.includes("?") ? hash.split("?")[1] : hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(queryPart);
      param = hashParams.get("view") || hashParams.get("tgWebAppStartParam");
    } catch {}
  }

  if (!param && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
    param = window.Telegram.WebApp.initDataUnsafe.start_param;
  }

  // Handle aliases
  if (param === "customers") param = "users";

  const valid = NAV_ITEMS.map((n) => n.view);
  return (valid as string[]).includes(param ?? "") ? (param as View) : "dashboard";
}

function initialLanguage(): Language {
  const tgLang = getTelegramUser()?.language_code;
  return tgLang?.startsWith("am") ? "am" : "en";
}

export default function App() {
  const { state: auth, loginWeb, logout } = useAuth();
  const [view, setView] = useState<View>(viewFromUrl());
  const [visited, setVisited] = useState<Set<View>>(() => new Set([viewFromUrl()]));
  const [lang] = useState<Language>(initialLanguage());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Listen for browser URL/Telegram parameter changes
  useEffect(() => {
    function handleUrlChange() {
      const next = viewFromUrl();
      setView(next);
      setVisited((prev) => new Set(prev).add(next));
    }
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);

  function navigateTo(nextView: View) {
    setVisited((prev) => new Set(prev).add(nextView));
    setView(nextView);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", nextView);
      window.history.pushState({}, "", url.toString());
    } catch {}
  }

  if (auth.status === "loading") {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: 14 }}>
        <DigafLogo size={36} adminBadge={true} />
        <LoadingSpinner />
        <span style={{ fontSize: 13, color: "var(--tg-hint, #888)", fontWeight: 500 }}>
          Opening Admin Portal...
        </span>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <Suspense fallback={<div className="screen" style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><LoadingSpinner /></div>}>
        <LoginPage onLogin={loginWeb} />
      </Suspense>
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
  const currentNav = NAV_ITEMS.find((n) => n.view === view);
  const currentTitle = currentNav
    ? getDictionary(lang).nav[currentNav.labelKey as keyof ReturnType<typeof getDictionary>["nav"]]
    : "Dashboard";

  return (
    <I18nContext.Provider value={{ lang, setLang: () => {}, t: getDictionary(lang) }}>
      {DEV_BYPASS && <DevBanner />}
      <div className="admin-shell">
        {/* Mobile Top Header */}
        <header className="admin-mobile-header">
          <div
            className="admin-mobile-brand"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={{ cursor: "pointer" }}
            title="Tap to switch section"
          >
            <DigafLogo size={20} adminBadge={true} />
            <span className="admin-mobile-divider">/</span>
            <span className="admin-mobile-title">{currentTitle}</span>
            <span style={{ fontSize: 11, color: "#34d399", marginLeft: 2 }}>▾</span>
          </div>

          <div className="admin-mobile-actions">
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              title="All Sections"
            >
              {mobileMenuOpen ? "✕ Close" : "☰ Sections"}
            </button>
            <button className="admin-mobile-logout" onClick={logout} title="Sign Out">
              🚪
            </button>
          </div>
        </header>

        {/* Mobile Sections Drawer */}
        {mobileMenuOpen && (
          <div className="admin-mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="admin-mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="admin-mobile-drawer-header">
                <span>Select Admin Section</span>
                <button onClick={() => setMobileMenuOpen(false)}>✕</button>
              </div>
              <div className="admin-mobile-drawer-grid">
                {visibleNav.map((item) => (
                  <button
                    key={item.view}
                    className={`admin-drawer-item ${view === item.view ? "admin-drawer-item-active" : ""}`}
                    onClick={() => {
                      navigateTo(item.view);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="admin-drawer-icon">{item.icon}</span>
                    <span className="admin-drawer-label">
                      {getDictionary(lang).nav[item.labelKey as keyof ReturnType<typeof getDictionary>["nav"]]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sidebar (Desktop) / Horizontal Tabbar (Mobile) */}
        <nav className="admin-nav">
          <div className="admin-nav-brand">
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
          <div className="admin-nav-footer">
            <button
              className="admin-nav-item admin-nav-logout-btn"
              onClick={logout}
              title="Sign Out"
            >
              <span className="admin-nav-icon">🚪</span>
              <span className="admin-nav-label">Sign Out</span>
            </button>
          </div>
        </nav>
        <main className="admin-main">
          {!hasPermission(NAV_ITEMS.find((n) => n.view === view)?.permission ?? "") ? (
            <div className="screen">
              <AccessDenied />
            </div>
          ) : (
            <Suspense fallback={<div className="screen" style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><LoadingSpinner /></div>}>
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
            </Suspense>
          )}

          {/* Digaf Footer with Logo and Rights Description */}
          <footer className="admin-footer-copyright">
            <div className="admin-footer-logo-row">
              <DigafLogo size={20} adminBadge={false} />
              <span className="admin-footer-brand-title">Digaf Microfinance Institution</span>
            </div>
            <p className="admin-footer-rights-paragraph">
              © {new Date().getFullYear()} Digaf Microfinance Institution. All rights reserved.
            </p>
          </footer>
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
