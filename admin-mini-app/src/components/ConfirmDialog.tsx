import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { Button } from "./Button";

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  confirmDisabled,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {children && <div className="modal-body">{children}</div>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button onClick={onConfirm} disabled={busy || confirmDisabled}>
            {confirmLabel ?? t.common.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
