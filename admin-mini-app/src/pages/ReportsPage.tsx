import { useState } from "react";
import { useI18n } from "../i18n";
import { api, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type {
  City,
  Job,
  Page,
  RegistrationListItem,
  RegistrationStatus,
  RegistrationTrends,
} from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState, RegistrationStatusBadge } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { SelectField } from "../components/SelectField";
import { exportRegistrationsReportToExcel } from "../utils/excelExport";

function BarList({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-row-label">{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <div className="bar-row-count">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 20;

export function ReportsPage() {
  const { t } = useI18n();

  // Search input vs applied search query
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [status, setStatus] = useState<RegistrationStatus | "">("");
  const [jobId, setJobId] = useState("");
  const [cityId, setCityId] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const trendsState = useApi<RegistrationTrends>(
    () => api.get<RegistrationTrends>("/api/v1/reports/registrations"),
    [],
  );
  const jobsState = useApi<Job[]>(() => api.get<Job[]>("/api/v1/jobs?include_inactive=true"), []);
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities?include_inactive=true"), []);

  // Filter jobs to strictly contain only Employee and Self-employed
  const allowedJobs = jobsState.status === "success"
    ? jobsState.data.filter((j) => ["Employee", "Self-employed"].includes(j.name))
    : [];

  const query = toQuery({
    name: appliedSearch || undefined,
    status: status || undefined,
    job_id: jobId || undefined,
    city_id: cityId || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const registrationsState = useApi<Page<RegistrationListItem>>(
    () => api.get<Page<RegistrationListItem>>(`/api/v1/registrations${query}`),
    [query],
  );

  function handleTriggerSearch() {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setStatus("");
    setJobId("");
    setCityId("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(appliedSearch || status || jobId || cityId);

  async function handleExport() {
    setExporting(true);
    try {
      // Fetch up to 1000 items matching current filter for full Excel dump
      const exportQs = toQuery({
        name: appliedSearch || undefined,
        status: status || undefined,
        job_id: jobId || undefined,
        city_id: cityId || undefined,
        page: 1,
        page_size: 1000,
      });
      const fullData = await api.get<Page<RegistrationListItem>>(`/api/v1/registrations${exportQs}`);

      const filterLabels = [];
      if (status) filterLabels.push(`Status: ${status}`);
      if (appliedSearch) filterLabels.push(`Search: "${appliedSearch}"`);
      if (cityId && citiesState.status === "success") {
        const c = citiesState.data.find((x) => x.id === cityId);
        if (c) filterLabels.push(`City: ${c.name}`);
      }
      if (jobId && jobsState.status === "success") {
        const j = jobsState.data.find((x) => x.id === jobId);
        if (j) filterLabels.push(`Job: ${j.name}`);
      }

      exportRegistrationsReportToExcel(
        fullData.items,
        trendsState.status === "success" ? trendsState.data : null,
        filterLabels.length > 0 ? filterLabels.join(", ") : "All Registrations"
      );
    } catch (err) {
      console.error("Export error:", err);
      if (registrationsState.status === "success") {
        exportRegistrationsReportToExcel(
          registrationsState.data.items,
          trendsState.status === "success" ? trendsState.data : null,
          "Current View"
        );
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header with Title and Sleek Compact Export Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t.reports.title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--tg-hint, #888)" }}>
            Real-time analytics and detailed applicant records exportable to Excel
          </p>
        </div>

        {/* Compact, professional Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || (registrationsState.status === "success" && registrationsState.data.items.length === 0)}
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 12px",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 8,
            border: "1px solid rgba(16, 185, 129, 0.4)",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.28) 100%)",
            color: "#34d399",
            cursor: exporting ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
          title="Export matching records to Excel (.xlsx)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>{exporting ? "Exporting..." : "Export Excel"}</span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 4,
              background: "rgba(16, 185, 129, 0.3)",
              color: "#a7f3d0",
              letterSpacing: 0.5,
            }}
          >
            .XLSX
          </span>
        </button>
      </div>

      {/* Analytics Overview Cards */}
      {trendsState.status === "loading" && <LoadingSpinner />}
      {trendsState.status === "error" && (
        <ErrorBanner message={trendsState.message} onRetry={trendsState.reload} />
      )}
      {trendsState.status === "success" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ margin: 0 }}>
            <h2 className="section-title">{t.reports.byJob}</h2>
            {trendsState.data.by_job.length === 0 ? (
              <EmptyState title={t.common.noResults} />
            ) : (
              <BarList items={trendsState.data.by_job.map((r) => ({ label: r.job, count: r.count }))} />
            )}
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h2 className="section-title">{t.reports.byCity}</h2>
            {trendsState.data.by_city.length === 0 ? (
              <EmptyState title={t.common.noResults} />
            ) : (
              <BarList items={trendsState.data.by_city.map((r) => ({ label: r.city, count: r.count }))} />
            )}
          </div>
        </div>
      )}

      {/* Applicant Registrations Data Section */}
      <div className="card" style={{ marginBottom: 16, padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Applicant Registrations Report</h2>
            {registrationsState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--tg-hint, #94a3b8)",
                }}
              >
                {registrationsState.data.total} records found
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              type="button"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ Clear All Filters
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            alignItems: "flex-end",
            padding: "12px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: 10,
            border: "1px solid rgba(255, 255, 255, 0.06)",
            marginBottom: 12,
          }}
        >
          {/* Search Field with explicit Search Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--tg-hint, #94a3b8)", marginBottom: "4px" }}>
              Search Applicant / Fayda ID / Phone
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder="Name, National ID, Phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTriggerSearch();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "#162032",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 7,
                  padding: "8px 10px",
                  fontSize: 13,
                  color: "inherit",
                }}
              />
              <button
                type="button"
                onClick={handleTriggerSearch}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "0 12px",
                  background: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Status Filter */}
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
              onChange={(v) => {
                setStatus(v as RegistrationStatus | "");
                setPage(1);
              }}
            />
          </div>

          {/* Job Dropdown (Contains strictly Employee and Self-employed) */}
          <div>
            <SelectField
              label={t.registrations.filterJob}
              value={jobId}
              placeholder={t.registrations.allJobs}
              options={allowedJobs.map((j) => ({ value: j.id, label: j.name }))}
              onChange={(v) => {
                setJobId(v);
                setPage(1);
              }}
            />
          </div>

          {/* City Filter */}
          {citiesState.status === "success" && (
            <div>
              <SelectField
                label={t.registrations.filterCity}
                value={cityId}
                placeholder={t.registrations.allCities}
                options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(v) => {
                  setCityId(v);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>

        {/* Active Filters Summary Chips */}
        {hasActiveFilters && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: "var(--tg-hint, #888)", fontWeight: 600 }}>Active Filters:</span>
            {appliedSearch && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Search: "{appliedSearch}"
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setAppliedSearch("");
                    setPage(1);
                  }}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11 }}
                >
                  ✕
                </button>
              </span>
            )}
            {status && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Status: {status}
                <button
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setPage(1);
                  }}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11 }}
                >
                  ✕
                </button>
              </span>
            )}
            {jobId && jobsState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#c084fc",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Job: {jobsState.data.find((j) => j.id === jobId)?.name || jobId}
                <button
                  type="button"
                  onClick={() => {
                    setJobId("");
                    setPage(1);
                  }}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11 }}
                >
                  ✕
                </button>
              </span>
            )}
            {cityId && citiesState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                City: {citiesState.data.find((c) => c.id === cityId)?.name || cityId}
                <button
                  type="button"
                  onClick={() => {
                    setCityId("");
                    setPage(1);
                  }}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 11 }}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}

        {/* Content Table */}
        {registrationsState.status === "loading" && <LoadingSpinner />}
        {registrationsState.status === "error" && (
          <ErrorBanner message={registrationsState.message} onRetry={registrationsState.reload} />
        )}

        {registrationsState.status === "success" && registrationsState.data.items.length === 0 && (
          <EmptyState title={hasActiveFilters ? "No registrations match your search filters" : t.common.noResults} />
        )}

        {registrationsState.status === "success" && registrationsState.data.items.length > 0 && (
          <>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--color-border, rgba(255, 255, 255, 0.08))" }}>
              <div
                style={{
                  minWidth: 880,
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1.2fr 1.1fr 1fr 1fr 1fr 0.9fr 0.8fr",
                  gap: "0 8px",
                  padding: "10px 14px",
                  background: "var(--color-surface-raised, rgba(30, 41, 59, 0.7))",
                  borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.08))",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--color-text-secondary, #94a3b8)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <span>{t.registrations.columnName}</span>
                <span>{t.registrations.columnNationalId}</span>
                <span>{t.registrations.columnPhone}</span>
                <span>{t.registrations.columnJob}</span>
                <span>{t.registrations.columnLocation}</span>
                <span>{t.registrations.columnReferral}</span>
                <span>{t.registrations.columnStatus}</span>
                <span>Date</span>
              </div>

              {registrationsState.data.items.map((reg) => {
                const referralInfo =
                  reg.referral_type === "ADMIN"
                    ? `Admin: ${reg.referral_admin_name || reg.referral_name || "Admin"}`
                    : reg.referral_type === "PERSON"
                      ? `${reg.referral_name || "Person"}`
                      : "—";

                return (
                  <div
                    key={reg.id}
                    className="list-item"
                    style={{
                      minWidth: 880,
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1.2fr 1.1fr 1fr 1fr 1fr 0.9fr 0.8fr",
                      gap: "0 8px",
                      padding: "10px 14px",
                      alignItems: "center",
                      textAlign: "left",
                      width: "100%",
                      borderRadius: 0,
                      borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.05))",
                    }}
                  >
                    <span className="list-item-title" style={{ fontWeight: 600, fontSize: 13 }}>
                      {reg.user_first_name} {reg.user_second_name}
                    </span>
                    <span
                      className="list-item-meta"
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: reg.national_id ? "#60a5fa" : "var(--tg-hint, #888)",
                      }}
                    >
                      {reg.national_id || "—"}
                    </span>
                    <span className="list-item-meta" style={{ fontSize: 12 }}>{reg.user_phone}</span>
                    <span className="list-item-meta" style={{ fontSize: 12 }}>{reg.job_name}</span>
                    <span className="list-item-meta" style={{ fontSize: 12 }}>
                      {reg.city_name} / {reg.subcity_name}
                    </span>
                    <span className="list-item-meta" style={{ fontSize: 11.5, color: reg.referral_type !== "NONE" ? "var(--color-primary)" : "inherit" }}>
                      {referralInfo}
                    </span>
                    <div>
                      <RegistrationStatusBadge status={reg.status} />
                    </div>
                    <span className="list-item-meta" style={{ fontSize: 11 }}>
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} totalPages={registrationsState.data.total_pages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
