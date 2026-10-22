import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { City, Job, NotificationAudienceType, NotificationItem } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState, NotificationStatusBadge } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { Button } from "../components/Button";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

const EMPLOYMENT_OPTIONS = [
  { value: "EMPLOYEE", labelKey: "employmentEmployee" as const },
  { value: "SELF_EMPLOYED", labelKey: "employmentSelfEmployed" as const },
];

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
  const [employmentType, setEmploymentType] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  async function send() {
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      await api.post("/api/v1/notifications", {
        audience_type: audienceType,
        message: message.trim(),
        job_id: audienceType === "BY_JOB" ? jobId : undefined,
        city_id: audienceType === "BY_CITY" ? cityId : undefined,
        employment_type: audienceType === "BY_EMPLOYMENT_TYPE" ? employmentType : undefined,
        registration_status: audienceType === "BY_REGISTRATION_STATUS" ? registrationStatus : undefined,
      });
      setMessage("");
      setSendSuccess(true);
      historyState.reload();
    } catch (err) {
      setSendError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSending(false);
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
              { value: "BY_EMPLOYMENT_TYPE", label: t.notifications.audienceByEmploymentType },
              { value: "BY_REGISTRATION_STATUS", label: t.notifications.audienceByStatus },
            ]}
            onChange={(v) => setAudienceType(v as NotificationAudienceType)}
          />

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
              onChange={setCityId}
            />
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

          <TextField
            label={t.notifications.message}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {sendError && <ErrorBanner message={sendError} />}
          {sendSuccess && <div className="success-banner">{t.registrations.actionSuccess}</div>}

          <Button onClick={send} disabled={sending || message.trim().length === 0}>
            {t.notifications.send}
          </Button>
        </div>
      </IfPermitted>

      <div className="card">
        <h2 className="section-title">{t.notifications.history}</h2>
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
                <NotificationStatusBadge status={n.status} />
              </div>
              <div className="list-item-meta">
                {t.notifications.recipients}: {n.recipient_count} · {t.notifications.sent}: {n.sent_count} ·{" "}
                {t.notifications.failed}: {n.failed_count}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
