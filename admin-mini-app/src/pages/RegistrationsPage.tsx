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
import { exportRegistrationsReportToExcel } from "../utils/excelExport";

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
  const [exporting, setExporting] = useState(false);

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

  async function handleExport() {
    setExporting(true);
    try {
      const exportQs = toQuery({
        name: name || undefined,
        status: status || undefined,
        gender: gender || undefined,
        referral_type: referralType || undefined,
        job_id: jobId || undefined,
        city_id: cityId || undefined,
        page: 1,
        page_size: 1000,
      });
      const fullData = await api.get<Page<RegistrationListItem>>(`/api/v1/registrations${exportQs}`);
      await exportRegistrationsReportToExcel(
        fullData.items,
        null,
        `Registrations Export`
      );
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
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
      {/* Header Row: Title + Total Registrations + Export to Excel + compact Refresh */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t.registrations.title}</h1>
          {listState.status === "success" && (
            <div style={{ fontSize: 13, color: "var(--tg-hint, #94a3b8)", marginTop: 2, fontWeight: 500 }}>
              Total Registrations: <strong style={{ color: "var(--tg-text, #fff)" }}>{listState.data.total}</strong>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Export to Excel button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || listState.status !== "success"}
            title="Export matching records to Excel"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 34, padding: "0 14px",
              fontSize: 13, fontWeight: 700, borderRadius: 8,
              border: "1px solid rgba(16, 185, 129, 0.45)",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.32) 100%)",
              color: exporting ? "#888" : "#34d399",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.15)",
              transition: "all 0.15s ease",
            }}
          >
            📊 {exporting ? "Exporting..." : "Export to Excel"}
          </button>

          {/* Compact icon-only Refresh */}
          <button
            type="button"
            onClick={() => { clearApiCache("/api/v1/registrations"); clearApiCache("/reports"); listState.reload(); }}
            title="Refresh list"
            style={{
              width: 34, height: 34,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "var(--tg-hint, #94a3b8)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Structured Row & Column Filter Grid */}
      <div
        className="card"
        style={{
          padding: "14px 16px",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--color-surface, #1e293b)",
          border: "1px solid var(--color-border, rgba(255, 255, 255, 0.08))",
        }}
      >
        {/* Quick Status Stats / Pills Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tg-hint, #94a3b8)", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 4 }}>
              Status:
            </span>
            {[
              { val: "", label: "All" },
              { val: "PENDING", label: t.registrations.statusPending, color: "#f59e0b" },
              { val: "APPROVED", label: t.registrations.statusApproved, color: "#10b981" },
              { val: "REJECTED", label: t.registrations.statusRejected, color: "#ef4444" },
              { val: "SUSPENDED", label: t.registrations.statusSuspended, color: "#8b5cf6" },
              { val: "CANCELLED", label: t.registrations.statusCancelled, color: "#64748b" },
            ].map((p) => {
              const active = status === p.val;
              return (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setStatus(p.val as RegistrationStatus | "");
                    setPage(1);
                  }}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    border: active
                      ? `1.5px solid ${p.color || "var(--color-primary, #3b82f6)"}`
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    background: active
                      ? (p.color ? `${p.color}25` : "rgba(59, 130, 246, 0.2)")
                      : "rgba(255, 255, 255, 0.04)",
                    color: active ? (p.color || "#60a5fa") : "var(--tg-hint, #94a3b8)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {(name || status || gender || referralType || jobId || cityId) && (
            <button
              type="button"
              onClick={() => {
                setName("");
                setStatus("");
                setGender("");
                setReferralType("");
                setJobId("");
                setCityId("");
                setPage(1);
              }}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Row 1: Search Applicant + Status + Gender */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <div>
            <TextField
              label={t.registrations.searchPlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resetAndSearch()}
            />
          </div>
          <div>
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
          </div>
          <div>
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
          </div>
        </div>

        {/* Row 2: Referral + Job + City + Search Button */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr)) 120px",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          <div>
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
          </div>
          {jobsState.status === "success" && (
            <div>
              <SelectField
                label={t.registrations.filterJob}
                value={jobId}
                placeholder={t.registrations.allJobs}
                options={jobsState.data
                  .filter((j) => ["Employee", "Self-employed"].includes(j.name))
                  .map((j) => ({ value: j.id, label: j.name }))}
                onChange={setJobId}
              />
            </div>
          )}
          {citiesState.status === "success" && (
            <div>
              <SelectField
                label={t.registrations.filterCity}
                value={cityId}
                placeholder={t.registrations.allCities}
                options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
                onChange={setCityId}
              />
            </div>
          )}
          <div style={{ paddingBottom: 2 }}>
            <Button onClick={resetAndSearch} style={{ width: "100%", height: 38 }}>
              🔍 {t.common.search}
            </Button>
          </div>
        </div>
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
              gridTemplateColumns: "1.4fr 1.1fr 1fr 0.6fr 0.9fr 0.8fr 1fr 1fr 0.8fr",
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
              <span>{t.registrations.columnNationalId}</span>
              <span>{t.registrations.columnPhone}</span>
              <span>{t.registrations.columnGender}</span>
              <span>{t.registrations.columnJob}</span>
              <span>Doc</span>
              <span>{t.registrations.columnReferral}</span>
              <span>{t.registrations.columnLocation}</span>
              <span>{t.registrations.columnStatus}</span>
            </div>

            {listState.data.items.map((reg) => {
              const referralInfo =
                reg.referral_type === "ADMIN"
                  ? `Admin: ${reg.referral_admin_name || reg.referral_name || "Admin"}`
                  : reg.referral_type === "PERSON"
                    ? `${reg.referral_name || "Customer"}`
                    : "—";

              return (
                <button
                  key={reg.id}
                  className="list-item list-item-clickable"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1.1fr 1fr 0.6fr 0.9fr 0.8fr 1fr 1fr 0.8fr",
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
                  <span
                    className="list-item-meta"
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      fontWeight: 500,
                      color: reg.national_id ? "var(--color-primary, #60a5fa)" : "var(--tg-hint, #888)",
                    }}
                  >
                    {reg.national_id || "—"}
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
                  <span className="list-item-meta">
                    {reg.document_name ? (
                      <span style={{ color: "#34d399", fontWeight: 700, fontSize: 11.5 }}>
                        📄 Doc
                      </span>
                    ) : (
                      <span style={{ color: "#f59e0b", fontSize: 11.5 }}>
                        ⚠️ None
                      </span>
                    )}
                  </span>
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
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveMessage, setApproveMessage] = useState("");
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [customNotifyMessage, setCustomNotifyMessage] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // If document was saved in browser localStorage (during dev/testing), fallback to it
  const localDoc = useMemo(() => {
    if (state.status !== "success") return null;
    if (state.data.document_data) return null;
    try {
      const stored = localStorage.getItem(`reg_doc_${state.data.user.phone}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  }, [state]);

  const activeDocData = state.status === "success" ? (state.data.document_data || localDoc?.fileData || null) : null;
  const activeDocName = state.status === "success" ? (state.data.document_name || localDoc?.fileName || null) : null;

  async function sendDirectNotification() {
    if (!customNotifyMessage.trim()) return;
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post(`/api/v1/registrations/${id}/notify`, { message: customNotifyMessage.trim() });
      setShowNotifyDialog(false);
      setCustomNotifyMessage("");
      setActionSuccess("Notification delivered successfully to the applicant.");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post(`/api/v1/registrations/${id}/approve`, {
        message: approveMessage.trim() || undefined,
      });
      state.reload();
      setShowApproveDialog(false);
      setApproveMessage("");
      setActionSuccess("Registration approved and notification delivered successfully.");
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

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
      clearApiCache("/registrations");
      clearApiCache("/reports");
      clearApiCache("/users");
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
            <Row
              label={t.registrations.columnNationalId}
              value={state.data.national_id || "—"}
            />
            <Row label={t.registrations.columnPhone} value={state.data.user.phone} />
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

          {/* Verification Document Audit Card */}
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              border: activeDocData
                ? "1.5px solid rgba(16, 185, 129, 0.4)"
                : "1.5px solid rgba(245, 158, 11, 0.4)",
              background: activeDocData
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>
                  {state.data.employment_type === "EMPLOYEE" ? "🪪" : "🏢"}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {state.data.employment_type === "EMPLOYEE"
                    ? "Required Document: Employee ID / የሰራተኛ መታወቂያ"
                    : "Required Document: Renewed Business License / የታደሰ ንግድ ፈቃድ"}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: activeDocData
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(245, 158, 11, 0.2)",
                  color: activeDocData ? "#10b981" : "#f59e0b",
                  border: `1px solid ${activeDocData ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                }}
              >
                {activeDocData ? "✓ Document Uploaded" : "⚠️ Document Not Uploaded"}
              </span>
            </div>

            {activeDocData ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {activeDocData.startsWith("data:image/") && (
                    <div
                      onClick={() => setShowDocumentModal(true)}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1.5px solid rgba(255, 255, 255, 0.2)",
                        cursor: "pointer",
                        position: "relative",
                        flexShrink: 0,
                      }}
                      title="Click to zoom / inspect"
                    >
                      <img
                        src={activeDocData}
                        alt="Applicant Verification Document"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--tg-text, #fff)" }}>
                      {activeDocName || (state.data.employment_type === "EMPLOYEE" ? "Employee_ID.jpg" : "Business_License.jpg")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--tg-hint, #94a3b8)", marginTop: 2 }}>
                      Verified applicant submission. Inspect document carefully before approving or rejecting.
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setShowDocumentModal(true)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        👁️ View Full Document
                      </button>
                      <a
                        href={activeDocData}
                        download={activeDocName || "applicant_document"}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "var(--tg-text, #fff)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        📥 Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12.5, color: "#fbbf24", lineHeight: 1.5 }}>
                Applicant skipped document upload during registration ("Without this information you may be rejected").
                You can reject this application for missing proof or approve if verified offline.
              </div>
            )}
          </div>

          {actionError && <ErrorBanner message={actionError} />}
          {actionSuccess && (
            <div className="success-banner" style={{ marginBottom: 8 }}>{actionSuccess}</div>
          )}

          <div className="card action-row" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {state.data.status === "PENDING" && (
              <>
                <IfPermitted permission={Permissions.REGISTRATION_APPROVE}>
                  <Button
                    onClick={() => {
                      setApproveMessage(`You are qualified for ${state.data.job.name}. Your registration has been approved.`);
                      setShowApproveDialog(true);
                    }}
                    disabled={busy}
                  >
                    ✓ {t.registrations.approve}
                  </Button>
                </IfPermitted>
                <IfPermitted permission={Permissions.REGISTRATION_REJECT}>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={busy}
                  >
                    ✕ {t.registrations.reject}
                  </Button>
                </IfPermitted>
              </>
            )}

            {/* Direct message button for any status */}
            <IfPermitted permission={Permissions.NOTIFICATION_SEND}>
              <Button
                variant="secondary"
                onClick={() => {
                  setCustomNotifyMessage("");
                  setShowNotifyDialog(true);
                }}
                disabled={busy}
              >
                💬 Send Notification
              </Button>
            </IfPermitted>
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

      {showApproveDialog && (
        <ConfirmDialog
          title="Approve Registration"
          confirmLabel="Approve & Send Notification"
          confirmDisabled={false}
          busy={busy}
          onCancel={() => setShowApproveDialog(false)}
          onConfirm={handleApprove}
        >
          <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--tg-hint, #94a3b8)" }}>
            The applicant will be marked as APPROVED and this message will be delivered to their Telegram chat and notification inbox.
          </p>
          <TextField
            label="Message (e.g. You are qualified for this job or position)"
            value={approveMessage}
            onChange={(e) => setApproveMessage(e.target.value)}
          />
        </ConfirmDialog>
      )}

      {showNotifyDialog && (
        <ConfirmDialog
          title="Send Notification to Applicant"
          confirmLabel="Deliver Message"
          confirmDisabled={customNotifyMessage.trim().length === 0}
          busy={busy}
          onCancel={() => setShowNotifyDialog(false)}
          onConfirm={sendDirectNotification}
        >
          <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--tg-hint, #94a3b8)" }}>
            Send a custom message directly to this applicant:
          </p>
          <TextField
            label="Message text"
            value={customNotifyMessage}
            onChange={(e) => setCustomNotifyMessage(e.target.value)}
          />
        </ConfirmDialog>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setRejectReason("Missing required Employee ID")}
            >
              + Missing Employee ID
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setRejectReason("Missing required renewed Business License")}
            >
              + Missing Business License
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setRejectReason("Invalid or illegible document image")}
            >
              + Illegible Document
            </button>
          </div>
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

      {/* Full Resolution Document Viewer Lightbox Modal */}
      {showDocumentModal && activeDocData && (
        <div
          onClick={() => setShowDocumentModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1e293b",
              borderRadius: 14,
              maxWidth: "92vw",
              maxHeight: "92vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                📄 {activeDocName || "Verification Document"} ({state.data.employment_type === "EMPLOYEE" ? "Employee ID" : "Business License"})
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 16,
                  cursor: "pointer",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 12, overflow: "auto", display: "flex", justifyContent: "center", maxHeight: "calc(92vh - 65px)" }}>
              {activeDocData.startsWith("data:image/") ? (
                <img
                  src={activeDocData}
                  alt="Verification Document"
                  style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }}
                />
              ) : (
                <iframe
                  src={activeDocData}
                  style={{ width: "80vw", height: "70vh", border: "none" }}
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
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
