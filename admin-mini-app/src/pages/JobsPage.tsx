import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError, toQuery } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Job } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

export function JobsPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const query = toQuery({ q: q || undefined, include_inactive: includeInactive ? 1 : undefined });
  const state = useApi<Job[]>(() => api.get<Job[]>(`/api/v1/jobs${query}`), [query]);

  async function createJob() {
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/api/v1/jobs", { name: newName.trim(), description: newDescription.trim() || null });
      setNewName("");
      setNewDescription("");
      setShowCreate(false);
      state.reload();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(job: Job) {
    await api.post(`/api/v1/jobs/${job.id}/${job.is_active ? "deactivate" : "activate"}`);
    state.reload();
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.jobs.title}</h1>

      <div className="card filter-bar">
        <TextField
          label={t.jobs.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          {t.jobs.includeInactive}
        </label>
        <IfPermitted permission={Permissions.JOB_CREATE}>
          <Button onClick={() => setShowCreate((s) => !s)}>{t.jobs.createNew}</Button>
        </IfPermitted>
      </div>

      {showCreate && (
        <div className="card">
          <TextField label={t.jobs.name} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <TextField
            label={t.jobs.description}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          {formError && <ErrorBanner message={formError} />}
          <Button onClick={createJob} disabled={saving || newName.trim().length < 2}>
            {t.jobs.create}
          </Button>
        </div>
      )}

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}
      {state.status === "success" && state.data.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div className="card">
          {state.data.map((job) => (
            <div className="list-item" key={job.id}>
              <div className="list-item-header">
                <span className="list-item-title">{job.name}</span>
                <span className={`badge ${job.is_active ? "badge-approved" : "badge-cancelled"}`}>
                  {job.is_active ? t.common.active : t.common.inactive}
                </span>
              </div>
              {job.description && <div className="list-item-meta">{job.description}</div>}
              <IfPermitted permission={Permissions.JOB_ACTIVATE}>
                <div style={{ marginTop: 8 }}>
                  <Button variant="secondary" onClick={() => toggleActive(job)}>
                    {job.is_active ? t.jobs.deactivate : t.jobs.activate}
                  </Button>
                </div>
              </IfPermitted>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
