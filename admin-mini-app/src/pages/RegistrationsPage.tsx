import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type {
  City,
  Job,
  Page,
  RegistrationDetail,
  RegistrationListItem,
  RegistrationStatus,
} from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState, RegistrationStatusBadge } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

const PAGE_SIZE = 20;

export function RegistrationsPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RegistrationStatus | "">("");
  const [jobId, setJobId] = useState("");
  const [cityId, setCityId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const jobsState = useApi<Job[]>(() => api.get<Job[]>("/api/v1/jobs?include_inactive=true"), []);
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities"), []);

  const query = toQuery({
    name: name || undefined,
    status: status || undefined,
    job_id: jobId || undefined,
    city_id: cityId || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const listState = useApi<Page<RegistrationListItem>>(
    () => api.get<Page<RegistrationListItem>>(`/api/v1/registrations${query}`),
    [query],
  );

  function resetAndSearch() {
    setPage(1);
  }

  if (selectedId) {
    return (
      <RegistrationDetailView
        id={selectedId}
        onBack={() => {
          setSelectedId(null);
          listState.reload();
        }}
      />
    );
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.registrations.title}</h1>

      <div className="card filter-bar">
        <TextField
          label={t.registrations.searchPlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && resetAndSearch()}
        />
        <SelectField
          label={t.registrations.filterStatus}
          value={status}
          placeholder={t.registrations.allStatuses}
          options={[
            { value: "PENDING", label: t.registrations.statusPending },
            { value: "APPROVED", label: t.registrations.statusApproved },
            { value: "REJECTED", label: t.registrations.statusRejected },
            { value: "SUSPENDED", label: t.registrations.statusSuspended },
            { value: "CANCELLED", label: t.registrations.statusCancelled },
          ]}
          onChange={(v) => setStatus(v as RegistrationStatus | "")}
        />
        {jobsState.status === "success" && (
          <SelectField
            label={t.registrations.filterJob}
            value={jobId}
            placeholder={t.registrations.allJobs}
            options={jobsState.data.map((j) => ({ value: j.id, label: j.name }))}
            onChange={setJobId}
          />
        )}
        {citiesState.status === "success" && (
          <SelectField
            label={t.registrations.filterCity}
            value={cityId}
            placeholder={t.registrations.allCities}
            options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
            onChange={setCityId}
          />
        )}
        <Button onClick={resetAndSearch}>{t.common.search}</Button>
      </div>

      {listState.status === "loading" && <LoadingSpinner />}
      {listState.status === "error" && (
        <ErrorBanner message={listState.message} onRetry={listState.reload} />
      )}

      {listState.status === "success" && listState.data.items.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {listState.status === "success" && listState.data.items.length > 0 && (
        <>
          <div className="card">
            {listState.data.items.map((reg) => (
              <button
                key={reg.id}
                className="list-item list-item-clickable"
                onClick={() => setSelectedId(reg.id)}
              >
                <div className="list-item-header">
                  <span className="list-item-title">
                    {reg.user_first_name} {reg.user_second_name}
                  </span>
                  <RegistrationStatusBadge status={reg.status} />
                </div>
                <div className="list-item-meta">
                  {reg.job_name} · {reg.user_phone}
                </div>
                <div className="list-item-meta">
                  {reg.city_name} / {reg.subcity_name} / {reg.woreda_name}
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={listState.data.total_pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function RegistrationDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useI18n();
  const state = useApi<RegistrationDetail>(
    () => api.get<RegistrationDetail>(`/api/v1/registrations/${id}`),
    [id],
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function runAction(action: string, body?: unknown) {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/api/v1/registrations/${id}/${action}`, body);
      state.reload();
      setShowRejectDialog(false);
      setRejectReason("");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn btn-secondary back-link" onClick={onBack}>
        ← {t.common.back}
      </button>
      <h1 className="page-title">{t.registrations.detailTitle}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && (
        <>
          <div className="card">
            <Row label={t.registrations.columnName} value={`${state.data.user.first_name} ${state.data.user.second_name}`} />
            <Row label={t.registrations.columnPhone} value={state.data.user.phone} />
            <Row label={t.registrations.columnJob} value={state.data.job.name} />
            <Row
              label={t.registrations.columnLocation}
              value={`${state.data.city.name} / ${state.data.subcity.name} / ${state.data.woreda.name}`}
            />
            <Row
              label={t.registrations.filterEmploymentType}
              value={
                state.data.employment_type === "EMPLOYEE"
                  ? t.registrations.employmentEmployee
                  : t.registrations.employmentSelfEmployed
              }
            />
            <div className="list-item-header" style={{ padding: "8px 0" }}>
              <span className="list-item-meta">{t.registrations.columnStatus}</span>
              <RegistrationStatusBadge status={state.data.status} />
            </div>
            {state.data.rejection_reason && (
              <Row label={t.registrations.rejectReasonLabel} value={state.data.rejection_reason} />
            )}
          </div>

          {actionError && <ErrorBanner message={actionError} />}

          <div className="card action-row">
            {state.data.status === "PENDING" && (
              <>
                <IfPermitted permission={Permissions.REGISTRATION_APPROVE}>
                  <Button onClick={() => runAction("approve")} disabled={busy}>
                    {t.registrations.approve}
                  </Button>
                </IfPermitted>
                <IfPermitted permission={Permissions.REGISTRATION_REJECT}>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={busy}
                  >
                    {t.registrations.reject}
                  </Button>
                </IfPermitted>
              </>
            )}
            {state.data.status === "APPROVED" && (
              <IfPermitted permission={Permissions.REGISTRATION_SUSPEND}>
                <Button variant="secondary" onClick={() => runAction("suspend")} disabled={busy}>
                  {t.registrations.suspend}
                </Button>
              </IfPermitted>
            )}
            {state.data.status === "SUSPENDED" && (
              <IfPermitted permission={Permissions.REGISTRATION_APPROVE}>
                <Button onClick={() => runAction("resume")} disabled={busy}>
                  {t.registrations.resume}
                </Button>
              </IfPermitted>
            )}
            {state.data.status === "REJECTED" && (
              <IfPermitted permission={Permissions.REGISTRATION_APPROVE}>
                <Button variant="secondary" onClick={() => runAction("reset-to-pending")} disabled={busy}>
                  {t.registrations.resetToPending}
                </Button>
              </IfPermitted>
            )}
          </div>
        </>
      )}

      {showRejectDialog && (
        <ConfirmDialog
          title={t.registrations.reject}
          confirmLabel={t.registrations.reject}
          confirmDisabled={rejectReason.trim().length < 3}
          busy={busy}
          onCancel={() => setShowRejectDialog(false)}
          onConfirm={() => runAction("reject", { reason: rejectReason.trim() })}
        >
          <TextField
            label={t.registrations.rejectReasonLabel}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          {rejectReason.trim().length > 0 && rejectReason.trim().length < 3 && (
            <span className="field-error">{t.registrations.rejectReasonRequired}</span>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item" style={{ padding: "8px 0" }}>
      <div className="list-item-meta">{label}</div>
      <div className="list-item-title">{value}</div>
    </div>
  );
}
