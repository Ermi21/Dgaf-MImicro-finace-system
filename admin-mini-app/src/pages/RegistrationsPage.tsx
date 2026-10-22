import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError, toQuery, clearApiCache } from "../services/api";
import { useApi } from "../hooks/useApi";
import type {
  City,
  Gender,
  Job,
  Page,
  ReferralType,
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
  const [gender, setGender] = useState<Gender | "">("");
  const [referralType, setReferralType] = useState<ReferralType | "">("");
  const [jobId, setJobId] = useState("");
  const [cityId, setCityId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const jobsState = useApi<Job[]>(() => api.get<Job[]>("/api/v1/jobs?include_inactive=true"), []);
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities"), []);

  const query = toQuery({
    name: name || undefined,
    status: status || undefined,
    gender: gender || undefined,
    referral_type: referralType || undefined,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t.registrations.title}</h1>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 13, padding: "6px 14px" }}
          onClick={() => {
            clearApiCache("/api/v1/registrations");
            listState.reload();
          }}
          title="Refresh list"
        >
          ↻ Refresh
        </button>
      </div>

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
        <SelectField
          label={t.registrations.filterGender}
          value={gender}
          placeholder={t.registrations.allGenders}
          options={[
            { value: "MALE", label: t.registrations.genderMale },
            { value: "FEMALE", label: t.registrations.genderFemale },
          ]}
          onChange={(v) => setGender(v as Gender | "")}
        />
        <SelectField
          label={t.registrations.filterReferral}
          value={referralType}
          placeholder={t.registrations.allReferrals}
          options={[
            { value: "NONE", label: t.registrations.referralDirect },
            { value: "ADMIN", label: t.registrations.referralAdmin },
            { value: "PERSON", label: t.registrations.referralPerson },
          ]}
          onChange={(v) => setReferralType(v as ReferralType | "")}
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
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.1fr 0.8fr 1fr 1.2fr 1fr 1fr",
              gap: "0 8px",
              padding: "10px 16px",
              background: "var(--color-surface-raised, #f5f5f5)",
              borderBottom: "1px solid var(--color-border, #e0e0e0)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-text-secondary, #666)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              <span>{t.registrations.columnName}</span>
              <span>{t.registrations.columnPhone}</span>
              <span>{t.registrations.columnGender}</span>
              <span>{t.registrations.columnJob}</span>
              <span>{t.registrations.columnReferral}</span>
              <span>{t.registrations.columnLocation}</span>
              <span>{t.registrations.columnStatus}</span>
            </div>

            {listState.data.items.map((reg) => {
              const referralInfo =
                reg.referral_type === "ADMIN"
                  ? `Admin: ${reg.referral_admin_name || reg.referral_name || "Admin"}`
                  : reg.referral_type === "PERSON"
                    ? `${reg.referral_name || "Person"}`
                    : "—";

              return (
                <button
                  key={reg.id}
                  className="list-item list-item-clickable"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.8fr 1.1fr 0.8fr 1fr 1.2fr 1fr 1fr",
                    gap: "0 8px",
                    padding: "12px 16px",
                    alignItems: "center",
                    textAlign: "left",
                    width: "100%",
                    borderRadius: 0,
                  }}
                  onClick={() => setSelectedId(reg.id)}
                >
                  <span className="list-item-title" style={{ fontWeight: 600 }}>
                    {reg.user_first_name} {reg.user_second_name}
                  </span>
                  <span className="list-item-meta">{reg.user_phone}</span>
                  <span className="list-item-meta">
                    {reg.gender === "MALE" || reg.sex === "MALE"
                      ? t.registrations.genderMale
                      : reg.gender === "FEMALE" || reg.sex === "FEMALE"
                        ? t.registrations.genderFemale
                        : "—"}
                  </span>
                  <span className="list-item-meta">{reg.job_name}</span>
                  <span className="list-item-meta" style={{ color: reg.referral_type !== "NONE" ? "var(--color-primary)" : "inherit" }}>
                    {referralInfo}
                  </span>
                  <span className="list-item-meta">
                    {reg.city_name} / {reg.subcity_name}
                  </span>
                  <RegistrationStatusBadge status={reg.status} />
                </button>
              );
            })}
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function runAction(action: string, body?: unknown) {
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post(`/api/v1/registrations/${id}/${action}`, body);
      state.reload();
      setShowRejectDialog(false);
      setRejectReason("");
      setActionSuccess("Action completed successfully.");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  async function deleteRegistration() {
    setBusy(true);
    setActionError(null);
    try {
      await api.delete(`/api/v1/registrations/${id}`);
      setShowDeleteDialog(false);
      onBack(); // go back to list and refresh
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button className="btn btn-secondary back-link" onClick={onBack}>
          ← {t.common.back}
        </button>
        {state.status === "success" && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: "6px 14px", marginLeft: "auto" }}
            onClick={() => state.reload()}
          >
            ↻ Refresh
          </button>
        )}
      </div>
      <h1 className="page-title">{t.registrations.detailTitle}</h1>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}

      {state.status === "success" && (
        <>
          <div className="card">
            <Row label={t.registrations.columnName} value={`${state.data.user.first_name} ${state.data.user.second_name}`} />
            <Row label={t.registrations.columnPhone} value={state.data.user.phone} />
            {state.data.national_id && (
              <Row label={t.registrations.columnNationalId} value={state.data.national_id} />
            )}
            <Row
              label={t.registrations.columnGender}
              value={
                state.data.gender === "MALE" || state.data.sex === "MALE"
                  ? t.registrations.genderMale
                  : state.data.gender === "FEMALE" || state.data.sex === "FEMALE"
                    ? t.registrations.genderFemale
                    : t.registrations.genderNotSpecified
              }
            />
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
            <Row
              label={t.registrations.columnReferral}
              value={
                state.data.referral_type === "ADMIN"
                  ? `Admin: ${state.data.referral_admin_name || state.data.referral_name || "Admin"}`
                  : state.data.referral_type === "PERSON"
                    ? `Person: ${state.data.referral_name || "—"}`
                    : t.registrations.referralDirect
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
          {actionSuccess && (
            <div className="success-banner" style={{ marginBottom: 8 }}>{actionSuccess}</div>
          )}

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

            {/* Delete button — only for REJECTED or CANCELLED */}
            {(state.data.status === "REJECTED" || state.data.status === "CANCELLED") && (
              <IfPermitted permission={Permissions.REGISTRATION_REJECT}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={busy}
                  style={{ color: "#c0392b", borderColor: "#c0392b", marginLeft: "auto" }}
                >
                  🗑 Delete Record
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

      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Registration"
          confirmLabel="Delete permanently"
          confirmDisabled={false}
          busy={busy}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={deleteRegistration}
        >
          <p style={{ margin: "8px 0", color: "#c0392b" }}>
            ⚠️ This will permanently delete this registration record. This cannot be undone.
          </p>
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
