import { useI18n, type Language } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { UserProfile } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";

export function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const state = useApi<UserProfile>(() => api.get<UserProfile>("/api/v1/users/me"), []);

  async function changeLanguage(next: Language) {
    setLang(next);
    try {
      await api.patch("/api/v1/users/me", { language: next });
    } catch {
      // Best-effort - the UI has already switched; a failed persist just
      // means it'll ask again next session. Not worth blocking the user.
    }
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.profile.title}</h1>

      {state.status === "loading" && <LoadingSpinner />}

      {state.status === "error" && (
        <>
          {state.code === "not_found" ? (
            <EmptyState title={t.profile.empty} hint={t.profile.emptyHint} />
          ) : (
            <ErrorBanner message={state.message} onRetry={state.reload} />
          )}
        </>
      )}

      {state.status === "success" && (
        <div className="card">
          <ReviewRow label={t.register.firstName} value={state.data.first_name} />
          <ReviewRow label={t.register.secondName} value={state.data.second_name} />
          <ReviewRow label={t.profile.phone} value={state.data.phone} />
          <ReviewRow
            label={t.profile.memberSince}
            value={new Date(state.data.created_at).toLocaleDateString()}
          />
        </div>
      )}

      <div className="card">
        <div className="field">
          <label>{t.profile.language}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <LangButton active={lang === "en"} onClick={() => changeLanguage("en")} label="English" />
            <LangButton active={lang === "am"} onClick={() => changeLanguage("am")} label="አማርኛ" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item" style={{ padding: "8px 0" }}>
      <div className="list-item-meta">{label}</div>
      <div className="list-item-title">{value}</div>
    </div>
  );
}

function LangButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        width: "auto",
        flex: 1,
        background: active ? "var(--color-primary)" : "transparent",
        color: active ? "#fff" : "var(--tg-text)",
        border: active ? "none" : "1.5px solid var(--color-border)",
      }}
    >
      {label}
    </button>
  );
}
