import { useState, useEffect } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type {
  City,
  Job,
  NotificationAudienceType,
  NotificationItem,
  Subcity,
  UserRead,
  Woreda,
} from "../types";
import {
  LoadingSpinner,
  ErrorBanner,
  EmptyState,
  NotificationStatusBadge,
} from "../components/Feedback";
import { SelectField } from "../components/SelectField";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

const EMPLOYMENT_OPTIONS = [
  { value: "EMPLOYEE", labelKey: "employmentEmployee" as const },
  { value: "SELF_EMPLOYED", labelKey: "employmentSelfEmployed" as const },
];

// --------------------------------------------------------------------
// Customer search component for INDIVIDUAL notifications
// --------------------------------------------------------------------
function CustomerSearch({
  selectedUserId,
  selectedUserName,
  onSelect,
}: {
  selectedUserId: string;
  selectedUserName: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const qs = toQuery({ q: query.trim(), page: 1, page_size: 10 });
        const page = await api.get<{ items: UserRead[] }>(`/api/v1/users${qs}`);
        setResults(page.items);
      } catch (e) {
        setSearchError(e instanceof ApiRequestError ? e.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 400); // debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 4, color: "var(--tg-hint)" }}>
        Search Customer by Name or Phone
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) onSelect("", ""); // clear selection
        }}
        placeholder="Type name or phone number..."
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1.5px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "var(--radius-sm)",
          fontSize: 14,
          boxSizing: "border-box",
          background: "#162032",
          color: "#ffffff",
        }}
      />

      {searching && (
        <div style={{ fontSize: 13, color: "var(--tg-hint)", marginTop: 6 }}>Searching…</div>
      )}
      {searchError && (
        <div style={{ fontSize: 13, color: "#fb7185", marginTop: 6 }}>{searchError}</div>
      )}

      {results.length > 0 && !selectedUserId && (
        <div style={{
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 8,
          marginTop: 4,
          overflow: "hidden",
          background: "#162032",
        }}>
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onSelect(u.id, `${u.first_name} ${u.second_name}`);
                setQuery(`${u.first_name} ${u.second_name}`);
                setResults([]);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 14px",
                textAlign: "left",
                background: "none",
                border: "none",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                fontSize: 14,
                color: "#ffffff",
              }}
            >
              <strong>{u.first_name} {u.second_name}</strong>
              <span style={{ marginLeft: 10, color: "var(--tg-hint)", fontSize: 12 }}>{u.phone}</span>
            </button>
          ))}
        </div>
      )}

      {selectedUserId && (
        <div style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "rgba(16, 185, 129, 0.18)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          borderRadius: 8,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#34d399",
        }}>
          <span>✅ Selected: <strong>{selectedUserName}</strong></span>
          <button
            onClick={() => { onSelect("", ""); setQuery(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// Main notifications page
// --------------------------------------------------------------------
export function NotificationsPage() {
  const { t } = useI18n();
  const historyState = useApi<NotificationItem[]>(
    () => api.get<NotificationItem[]>("/api/v1/notifications"),
    [],
  );
  const jobsState = useApi<Job[]>(() => api.get<Job[]>("/api/v1/jobs"), []);
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities"), []);

  const [audienceType, setAudienceType] = useState<NotificationAudienceType>("ALL_USERS");
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [cityId, setCityId] = useState("");
  const [subcityId, setSubcityId] = useState("");
  const [woredaId, setWoredaId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [individualUserId, setIndividualUserId] = useState("");
  const [individualUserName, setIndividualUserName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const subcitiesState = useApi<Subcity[]>(
    () => (cityId ? api.get<Subcity[]>(`/api/v1/cities/${cityId}/subcities`) : Promise.resolve([])),
    [cityId],
  );
  const woredasState = useApi<Woreda[]>(
    () => (subcityId ? api.get<Woreda[]>(`/api/v1/subcities/${subcityId}/woredas`) : Promise.resolve([])),
    [subcityId],
  );

  async function send() {
    if (!message.trim()) {
      setSendError("Please enter a message to send.");
      return;
    }
    if (audienceType === "INDIVIDUAL" && !individualUserId) {
      setSendError("Please search and select a customer first.");
      return;
    }
    if (audienceType === "BY_JOB" && !jobId) {
      setSendError("Please select a target job category.");
      return;
    }
    if (audienceType === "BY_CITY" && !cityId) {
      setSendError("Please select a target city.");
      return;
    }
    if (audienceType === "BY_SUBCITY" && !subcityId) {
      setSendError("Please select a target subcity.");
      return;
    }
    if (audienceType === "BY_WOREDA" && !woredaId) {
      setSendError("Please select a target woreda.");
      return;
    }
    if (audienceType === "BY_EMPLOYMENT_TYPE" && !employmentType) {
      setSendError("Please select a target employment type.");
      return;
    }
    if (audienceType === "BY_REGISTRATION_STATUS" && !registrationStatus) {
      setSendError("Please select a target registration status.");
      return;
    }

    setSending(true);
    setSendError(null);
    setActionSuccess(null);
    setActionError(null);
    try {
      await api.post("/api/v1/notifications", {
        audience_type: audienceType,
        message: message.trim(),
        user_id: audienceType === "INDIVIDUAL" ? individualUserId : undefined,
        job_id: audienceType === "BY_JOB" ? jobId : undefined,
        city_id:
          audienceType === "BY_CITY" ||
          audienceType === "BY_SUBCITY" ||
          audienceType === "BY_WOREDA"
            ? cityId
            : undefined,
        subcity_id:
          audienceType === "BY_SUBCITY" || audienceType === "BY_WOREDA" ? subcityId : undefined,
        woreda_id: audienceType === "BY_WOREDA" ? woredaId : undefined,
        employment_type: audienceType === "BY_EMPLOYMENT_TYPE" ? employmentType : undefined,
        registration_status:
          audienceType === "BY_REGISTRATION_STATUS" ? registrationStatus : undefined,
      });
      setMessage("");
      setIndividualUserId("");
      setIndividualUserName("");
      setSendSuccess(true);
      historyState.reload();
    } catch (err) {
      setSendError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSending(false);
    }
  }

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function deleteNotification(id: string) {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    setDeletingId(id);
    setActionSuccess(null);
    setActionError(null);
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      setActionSuccess("Notification deleted successfully.");
      historyState.reload();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAllNotifications() {
    if (!window.confirm("Are you sure you want to clear all notifications from history?")) return;
    setClearingAll(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      await api.delete("/api/v1/notifications/clear-all");
      setActionSuccess("All notifications cleared successfully.");
      historyState.reload();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Failed to clear notifications");
    } finally {
      setClearingAll(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.notifications.title}</h1>

      <IfPermitted permission={Permissions.NOTIFICATION_SEND}>
        <div className="card">
          <h2 className="section-title">{t.notifications.send}</h2>
          <SelectField
            label={t.notifications.audience}
            value={audienceType}
            placeholder=""
            options={[
              { value: "ALL_USERS", label: t.notifications.audienceAll },
              { value: "INDIVIDUAL", label: t.notifications.audienceIndividual },
              { value: "BY_JOB", label: t.notifications.audienceByJob },
              { value: "BY_CITY", label: t.notifications.audienceByCity },
              { value: "BY_SUBCITY", label: t.notifications.audienceBySubcity },
              { value: "BY_WOREDA", label: t.notifications.audienceByWoreda },
              { value: "BY_EMPLOYMENT_TYPE", label: t.notifications.audienceByEmploymentType },
              { value: "BY_REGISTRATION_STATUS", label: t.notifications.audienceByStatus },
            ]}
            onChange={(v) => {
              setAudienceType(v as NotificationAudienceType);
              setIndividualUserId("");
              setIndividualUserName("");
            }}
          />

          {/* INDIVIDUAL — search customer by name/phone */}
          {audienceType === "INDIVIDUAL" && (
            <CustomerSearch
              selectedUserId={individualUserId}
              selectedUserName={individualUserName}
              onSelect={(id, name) => {
                setIndividualUserId(id);
                setIndividualUserName(name);
              }}
            />
          )}

          {audienceType === "BY_JOB" && jobsState.status === "success" && (
            <SelectField
              label={t.registrations.filterJob}
              value={jobId}
              placeholder={t.registrations.allJobs}
              options={jobsState.data.map((j) => ({ value: j.id, label: j.name }))}
              onChange={setJobId}
            />
          )}
          {audienceType === "BY_CITY" && citiesState.status === "success" && (
            <SelectField
              label={t.registrations.filterCity}
              value={cityId}
              placeholder={t.registrations.allCities}
              options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => { setCityId(v); setSubcityId(""); setWoredaId(""); }}
            />
          )}

          {audienceType === "BY_SUBCITY" && citiesState.status === "success" && (
            <>
              <SelectField
                label={t.registrations.filterCity}
                value={cityId}
                placeholder={t.registrations.allCities}
                options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(v) => { setCityId(v); setSubcityId(""); setWoredaId(""); }}
              />
              <SelectField
                label={t.registrations.filterSubcity}
                value={subcityId}
                placeholder={t.registrations.allSubcities}
                options={subcitiesState.status === "success" ? subcitiesState.data.map((s) => ({ value: s.id, label: s.name })) : []}
                onChange={(v) => { setSubcityId(v); setWoredaId(""); }}
              />
            </>
          )}

          {audienceType === "BY_WOREDA" && citiesState.status === "success" && (
            <>
              <SelectField
                label={t.registrations.filterCity}
                value={cityId}
                placeholder={t.registrations.allCities}
                options={citiesState.data.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(v) => { setCityId(v); setSubcityId(""); setWoredaId(""); }}
              />
              <SelectField
                label={t.registrations.filterSubcity}
                value={subcityId}
                placeholder={t.registrations.allSubcities}
                options={subcitiesState.status === "success" ? subcitiesState.data.map((s) => ({ value: s.id, label: s.name })) : []}
                onChange={(v) => { setSubcityId(v); setWoredaId(""); }}
              />
              <SelectField
                label={t.registrations.filterWoreda}
                value={woredaId}
                placeholder={t.registrations.allWoredas}
                options={woredasState.status === "success" ? woredasState.data.map((w) => ({ value: w.id, label: w.name })) : []}
                onChange={setWoredaId}
              />
            </>
          )}

          {audienceType === "BY_EMPLOYMENT_TYPE" && (
            <SelectField
              label={t.registrations.filterEmploymentType}
              value={employmentType}
              placeholder={t.registrations.allEmploymentTypes}
              options={EMPLOYMENT_OPTIONS.map((o) => ({
                value: o.value,
                label: t.registrations[o.labelKey],
              }))}
              onChange={setEmploymentType}
            />
          )}

          {audienceType === "BY_REGISTRATION_STATUS" && (
            <SelectField
              label={t.registrations.filterStatus}
              value={registrationStatus}
              placeholder={t.registrations.allStatuses}
              options={[
                { value: "PENDING", label: t.registrations.statusPending },
                { value: "APPROVED", label: t.registrations.statusApproved },
                { value: "REJECTED", label: t.registrations.statusRejected },
                { value: "SUSPENDED", label: t.registrations.statusSuspended },
              ]}
              onChange={setRegistrationStatus}
            />
          )}

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="notif-message-input">{t.notifications.message}</label>
              <span style={{ fontSize: 12, color: "var(--tg-hint, #6b6560)" }}>
                {message.trim().length} chars
              </span>
            </div>
            <textarea
              id="notif-message-input"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (sendError) setSendError(null);
                if (sendSuccess) setSendSuccess(false);
              }}
              placeholder="Type your notification message to dispatch to job seekers..."
              style={{
                resize: "vertical",
                minHeight: "96px",
                lineHeight: "1.5",
              }}
            />
          </div>

          {sendError && <ErrorBanner message={sendError} />}
          {sendSuccess && (
            <div className="success-banner" style={{ marginBottom: "12px" }}>
              ✅ Notification dispatched successfully!
            </div>
          )}

          <button
            className="btn btn-primary"
            type="button"
            onClick={send}
            disabled={sending}
            style={{
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 600,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.75 : 1,
              transition: "all 0.15s ease-in-out",
            }}
          >
            {sending ? "⏳ Dispatching Notification…" : `🚀 ${t.notifications.send}`}
          </button>
        </div>
      </IfPermitted>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <h2 className="section-title" style={{ margin: 0 }}>{t.notifications.history}</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            {historyState.status === "success" && historyState.data.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "4px 10px", color: "#c0392b", borderColor: "#c0392b" }}
                onClick={clearAllNotifications}
                disabled={clearingAll}
              >
                {clearingAll ? "Clearing…" : "🗑 Clear All"}
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => {
                setActionSuccess(null);
                setActionError(null);
                historyState.reload();
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="success-banner" style={{ marginBottom: 12 }}>
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="error-banner" style={{ marginBottom: 12 }}>
            {actionError}
          </div>
        )}

        {historyState.status === "loading" && <LoadingSpinner />}
        {historyState.status === "error" && (
          <ErrorBanner message={historyState.message} onRetry={historyState.reload} />
        )}
        {historyState.status === "success" && historyState.data.length === 0 && (
          <EmptyState title={t.common.noResults} />
        )}
        {historyState.status === "success" &&
          historyState.data.map((n) => (
            <div className="list-item" key={n.id}>
              <div className="list-item-header">
                <span className="list-item-title">{n.message}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <NotificationStatusBadge status={n.status} />
                  <button
                    onClick={() => deleteNotification(n.id)}
                    disabled={deletingId === n.id}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#c0392b",
                      fontSize: "15px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                    title="Delete notification"
                  >
                    {deletingId === n.id ? "…" : "🗑️"}
                  </button>
                </div>
              </div>
              <div className="list-item-meta">
                {t.notifications.recipients}: {n.recipient_count} · {t.notifications.sent}:{" "}
                {n.sent_count} · {t.notifications.failed}: {n.failed_count}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

