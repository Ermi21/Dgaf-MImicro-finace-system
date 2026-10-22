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

export type View = "home" | "register" | "profile" | "registrations" | "notifications";

function viewFromUrl(): View {
  const param = new URLSearchParams(window.location.search).get("view");
  const valid: View[] = ["register", "profile", "registrations", "notifications"];
  return (valid as string[]).includes(param ?? "") ? (param as View) : "home";
}

function initialLanguage(): Language {
  const tgLang = getTelegramUser()?.language_code;
  return tgLang?.startsWith("am") ? "am" : "en";
}

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState<View>(viewFromUrl());
  const [lang, setLang] = useState<Language>(initialLanguage());

  useEffect(() => {
    if (view === "home") {
      hideMainButton();
      return;
    }
    return setBackButton(() => setView("home"));
  }, [view]);

  if (auth.status === "loading") {
    return (
      <div className="screen">
        <LoadingSpinner />
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

  return (
    <I18nContext.Provider value={{ lang, setLang, t: getDictionary(lang) }}>
      {view === "home" && <HomePage onNavigate={setView} />}
      {view === "register" && <RegisterPage />}
      {view === "profile" && <ProfilePage />}
      {view === "registrations" && <MyRegistrationsPage />}
      {view === "notifications" && <NotificationsPage />}
    </I18nContext.Provider>
  );
}
