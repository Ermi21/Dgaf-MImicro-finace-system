import { useI18n } from "../i18n";
import type { View } from "../App";

export function HomePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t } = useI18n();
  return (
    <div className="screen">
      <h1 className="page-title">{t.home.title}</h1>
      <p className="page-subtitle">{t.home.subtitle}</p>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <NavButton label={t.register.title} onClick={() => onNavigate("register")} />
        <NavButton label={t.profile.title} onClick={() => onNavigate("profile")} />
        <NavButton label={t.registrations.title} onClick={() => onNavigate("registrations")} />
        <NavButton label={t.notifications.title} onClick={() => onNavigate("notifications")} />
      </div>
    </div>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-secondary"
      style={{ justifyContent: "space-between" }}
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}
