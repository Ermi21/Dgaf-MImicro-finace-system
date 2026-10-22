import { useI18n } from "../i18n";
import type { View } from "../App";
import { DigafLogo } from "../components/DigafLogo";
import {
  RegisterIcon,
  ClipboardIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  GiftIcon,
} from "../components/Icons";

export function HomePage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t } = useI18n();

  return (
    <div className="screen home-screen">
      {/* ─── Hero Header ─── */}
      <div className="hero-card">
        <div className="hero-header-top">
          <DigafLogo size={28} />
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <ShieldCheckIcon width={13} height={13} />
            <span>Official Portal</span>
          </div>
        </div>

        <h1 className="hero-title">{t.home.title}</h1>
        <p className="hero-subtitle">{t.home.subtitle}</p>

        {/* ─── Quick Start Action Banner ─── */}
        <button
          type="button"
          onClick={() => onNavigate("register")}
          className="hero-cta-btn"
        >
          <div className="hero-cta-icon">
            <RegisterIcon />
          </div>
          <div className="hero-cta-text">
            <span className="hero-cta-label">New Registration</span>
            <span className="hero-cta-sub">Start your verified application</span>
          </div>
          <div className="hero-cta-arrow">
            <ChevronRightIcon />
          </div>
        </button>
      </div>

      {/* ─── Services Menu ─── */}
      <div className="services-section">
        <div className="section-label">Services & Management</div>
        <div className="nav-menu-group">
          <NavCard
            icon={<ClipboardIcon />}
            title={t.registrations.title}
            desc="View status and submitted applications"
            onClick={() => onNavigate("registrations")}
          />
          <NavCard
            icon={<GiftIcon />}
            title={t.referrals.title}
            desc="Track invited friends and referral earnings"
            onClick={() => onNavigate("referrals")}
            badge="EARN ETB"
          />
          <NavCard
            icon={<UserIcon />}
            title={t.profile.title}
            desc="Personal and contact information"
            onClick={() => onNavigate("profile")}
          />
          <NavCard
            icon={<BellIcon />}
            title={t.notifications.title}
            desc="Important announcements and updates"
            onClick={() => onNavigate("notifications")}
          />
        </div>
      </div>

      {/* ─── Trust Badge ─── */}
      <div className="trust-footer">
        <ShieldCheckIcon width={14} height={14} />
        <span>Verified customer registration & Employment Network</span>
      </div>
    </div>
  );
}

function NavCard({
  icon,
  title,
  desc,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="nav-card"
    >
      <div className="nav-card-icon">
        {icon}
      </div>
      <div className="nav-card-content">
        <div className="nav-card-header-line">
          <span className="nav-card-title">{title}</span>
          {badge && <span className="nav-card-badge">{badge}</span>}
        </div>
        <div className="nav-card-desc">{desc}</div>
      </div>
      <div className="nav-card-arrow">
        <ChevronRightIcon />
      </div>
    </button>
  );
}
