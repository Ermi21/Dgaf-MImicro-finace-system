import type { RegistrationStatus } from "../types";
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

export function SuccessCheck() {
  return (
    <div className="success-check" aria-hidden="true">
      ✓
    </div>
  );
}

const STATUS_KEY: Record<RegistrationStatus, string> = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  SUSPENDED: "statusSuspended",
  CANCELLED: "statusCancelled",
};

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const { t } = useI18n();
  const label = t.registrations[STATUS_KEY[status] as keyof typeof t.registrations];
  return <span className={`badge badge-${status.toLowerCase()}`}>{label}</span>;
}
