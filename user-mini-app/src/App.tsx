import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { I18nContext, getDictionary, type Language } from "./i18n";
import { getTelegramUser, hideMainButton, setBackButton } from "./services/telegram";
import { LoadingSpinner, ErrorBanner } from "./components/Feedback";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyRegistrationsPage } from "./pages/MyRegistrationsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MyReferralsPage } from "./pages/MyReferralsPage";
import { DigafLogo } from "./components/DigafLogo";

/** True only in `npm run dev` AND outside a real Telegram client (initData is empty). */
const DEV_BYPASS = import.meta.env.DEV && !window.Telegram?.WebApp?.initData;

export type View = "home" | "register" | "profile" | "registrations" | "notifications" | "referrals";

function viewFromUrl(): View {
  const param = new URLSearchParams(window.location.search).get("view");
  const valid: View[] = ["register", "profile", "registrations", "notifications", "referrals"];
  return (valid as string[]).includes(param ?? "") ? (param as View) : "home";
}

function initialLanguage(): Language {
  const tgLang = getTelegramUser()?.language_code;
  return tgLang?.startsWith("am") ? "am" : "en";
}

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState<View>(viewFromUrl());
  const [visited, setVisited] = useState<Set<View>>(() => new Set([viewFromUrl()]));
  const [lang, setLang] = useState<Language>(initialLanguage());
  const i18nValue = { lang, setLang, t: getDictionary(lang) };

  function handleNavigate(nextView: View) {
    setVisited((prev) => new Set(prev).add(nextView));
    setView(nextView);
  }

  useEffect(() => {
    if (view === "home") {
      hideMainButton();
      // Always return a cleanup function so React never tries to call void.
      return () => {};
    }
    // setBackButton returns its own cleanup (offClick + hide).
    return setBackButton(() => handleNavigate("home"));
  }, [view]);

  if (auth.status === "loading") {
    return (
      <I18nContext.Provider value={i18nValue}>
        <div className="screen">
          <LoadingSpinner />
        </div>
      </I18nContext.Provider>
    );
  }

  if (auth.status === "error") {
    return (
      <I18nContext.Provider value={i18nValue}>
        <div className="screen">
          <ErrorBanner message={auth.message} onRetry={() => window.location.reload()} />
        </div>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={i18nValue}>
      {DEV_BYPASS && <DevBanner />}
      {view !== "home" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px 4px" }}>
          <DigafLogo size={24} />
        </div>
      )}
      {visited.has("home") && (
        <div style={{ display: view === "home" ? "block" : "none" }}>
          <HomePage onNavigate={handleNavigate} />
        </div>
      )}
      {visited.has("register") && (
        <div style={{ display: view === "register" ? "block" : "none" }}>
          <RegisterPage onNavigate={handleNavigate} isActive={view === "register"} />
        </div>
      )}
      {visited.has("profile") && (
        <div style={{ display: view === "profile" ? "block" : "none" }}>
          <ProfilePage />
        </div>
      )}
      {visited.has("registrations") && (
        <div style={{ display: view === "registrations" ? "block" : "none" }}>
          <MyRegistrationsPage />
        </div>
      )}
      {visited.has("notifications") && (
        <div style={{ display: view === "notifications" ? "block" : "none" }}>
          <NotificationsPage isActive={view === "notifications"} />
        </div>
      )}
      {visited.has("referrals") && (
        <div style={{ display: view === "referrals" ? "block" : "none" }}>
          <MyReferralsPage />
        </div>
      )}
    </I18nContext.Provider>
  );
}

/** Shown only in browser dev mode — never rendered inside a real Telegram WebApp. */
function DevBanner() {
  return (
    <div
      style={{
        background: "#1c1b19",
        color: "#f5c542",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textAlign: "center",
        padding: "6px 12px",
        position: "sticky",
        top: 0,
        zIndex: 9999,
      }}
    >
      ⚠️ DEV PREVIEW — No Telegram session. API calls will return errors. Open from the bot for full functionality.
    </div>
  );
}
