import type { RegistrationStatus, NotificationStatus } from "../types";
import { useI18n } from "../i18n";
import { Button } from "./Button";

export function LoadingSpinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="error-banner">{message}</div>
      {onRetry && (
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={onRetry}>
            {t.common.retry}
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      {hint && <div>{hint}</div>}
    </div>
  );
}

const REGISTRATION_STATUS_KEY: Record<RegistrationStatus, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  SUSPENDED: "statusSuspended",
  CANCELLED: "statusCancelled",
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const { t } = useI18n();
  const label = t.registrations[REGISTRATION_STATUS_KEY[status] as keyof typeof t.registrations];
  return <span className={`badge badge-${status.toLowerCase()}`}>{label}</span>;
}

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const { t } = useI18n();
  const map: Record<NotificationStatus, { key: keyof typeof t.notifications; cls: string }> = {
    PENDING: { key: "pending", cls: "badge-pending" },
    SENT: { key: "sent", cls: "badge-approved" },
    FAILED: { key: "failed", cls: "badge-rejected" },
  };
  const entry = map[status];
  return <span className={`badge ${entry.cls}`}>{t.notifications[entry.key]}</span>;
}

export function AccessDenied() {
  const { t } = useI18n();
  return <EmptyState title={t.common.accessDenied} />;
}
