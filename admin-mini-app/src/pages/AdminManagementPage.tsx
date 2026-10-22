import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { AdminRead, RoleRead } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { Button } from "../components/Button";
import { Permissions } from "../permissions";

const ALL_PERMISSIONS = Object.values(Permissions);

export function AdminManagementPage() {
  const [tab, setTab] = useState<"admins" | "roles">("admins");
  const { t } = useI18n();

  return (
    <div className="screen">
      <h1 className="page-title">{t.adminManagement.title}</h1>
      <div className="tab-bar">
        <button
          className={`tab ${tab === "admins" ? "tab-active" : ""}`}
          onClick={() => setTab("admins")}
        >
          {t.adminManagement.admins}
        </button>
        <button className={`tab ${tab === "roles" ? "tab-active" : ""}`} onClick={() => setTab("roles")}>
          {t.adminManagement.roles}
        </button>
      </div>
      {tab === "admins" ? <AdminsTab /> : <RolesTab />}
    </div>
  );
}

function AdminsTab() {
  const { t } = useI18n();
  const adminsState = useApi<AdminRead[]>(
    () => api.get<AdminRead[]>("/api/v1/admin-management/admins"),
    [],
  );
  const rolesState = useApi<RoleRead[]>(() => api.get<RoleRead[]>("/api/v1/admin-management/roles"), []);

  const [showForm, setShowForm] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAdmin() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/v1/admin-management/admins", {
        telegram_id: Number(telegramId),
        name: name.trim(),
        role_id: roleId,
      });
      setTelegramId("");
      setName("");
      setRoleId("");
      setShowForm(false);
      adminsState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(admin: AdminRead) {
    await api.patch(`/api/v1/admin-management/admins/${admin.id}`, { is_active: !admin.is_active });
    adminsState.reload();
  }

  return (
    <>
      <div className="card">
        <Button onClick={() => setShowForm((s) => !s)}>{t.adminManagement.addAdmin}</Button>
      </div>

      {showForm && rolesState.status === "success" && (
        <div className="card">
          <TextField
            label={t.adminManagement.telegramId}
            value={telegramId}
            inputMode="numeric"
            onChange={(e) => setTelegramId(e.target.value)}
          />
          <TextField label={t.adminManagement.name} value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField
            label={t.adminManagement.role}
            value={roleId}
            placeholder=""
            options={rolesState.data.map((r) => ({ value: r.id, label: r.name }))}
            onChange={setRoleId}
          />
          {error && <ErrorBanner message={error} />}
          <Button
            onClick={createAdmin}
            disabled={saving || !telegramId || name.trim().length < 2 || !roleId}
          >
            {t.common.save}
          </Button>
        </div>
      )}

      {adminsState.status === "loading" && <LoadingSpinner />}
      {adminsState.status === "error" && (
        <ErrorBanner message={adminsState.message} onRetry={adminsState.reload} />
      )}
      {adminsState.status === "success" && adminsState.data.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {adminsState.status === "success" && adminsState.data.length > 0 && (
        <div className="card">
          {adminsState.data.map((admin) => (
            <div className="list-item" key={admin.id}>
              <div className="list-item-header">
                <span className="list-item-title">{admin.name}</span>
                <span className={`badge ${admin.is_active ? "badge-approved" : "badge-cancelled"}`}>
                  {admin.is_active ? t.common.active : t.common.inactive}
                </span>
              </div>
              <div className="list-item-meta">
                {admin.role_name} · {admin.telegram_id}
              </div>
              <div style={{ marginTop: 8 }}>
                <Button variant="secondary" onClick={() => toggleActive(admin)}>
                  {admin.is_active ? t.common.inactive : t.common.active}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RolesTab() {
  const { t } = useI18n();
  const rolesState = useApi<RoleRead[]>(() => api.get<RoleRead[]>("/api/v1/admin-management/roles"), []);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing(role: RoleRead) {
    setEditingRoleId(role.id);
    setDraftPermissions(new Set(role.permissions));
    setError(null);
  }

  function togglePermission(code: string) {
    setDraftPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function savePermissions() {
    if (!editingRoleId) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/v1/admin-management/roles/${editingRoleId}/permissions`, {
        permission_codes: Array.from(draftPermissions),
      });
      setEditingRoleId(null);
      rolesState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSaving(false);
    }
  }

  if (rolesState.status === "loading") return <LoadingSpinner />;
  if (rolesState.status === "error") {
    return <ErrorBanner message={rolesState.message} onRetry={rolesState.reload} />;
  }

  return (
    <>
      {rolesState.data.map((role) => (
        <div className="card" key={role.id}>
          <div className="list-item-header">
            <span className="list-item-title">{role.name}</span>
            {editingRoleId !== role.id && (
              <Button variant="secondary" onClick={() => startEditing(role)}>
                {t.common.edit}
              </Button>
            )}
          </div>
          {role.description && <div className="list-item-meta">{role.description}</div>}

          {editingRoleId === role.id ? (
            <>
              <div className="permission-grid">
                {ALL_PERMISSIONS.map((code) => (
                  <label className="checkbox-row" key={code}>
                    <input
                      type="checkbox"
                      checked={draftPermissions.has(code)}
                      onChange={() => togglePermission(code)}
                    />
                    {code}
                  </label>
                ))}
              </div>
              {error && <ErrorBanner message={error} />}
              <div className="action-row">
                <Button variant="secondary" onClick={() => setEditingRoleId(null)} disabled={saving}>
                  {t.common.cancel}
                </Button>
                <Button onClick={savePermissions} disabled={saving}>
                  {t.adminManagement.savePermissions}
                </Button>
              </div>
            </>
          ) : (
            <div className="list-item-meta">{role.permissions.join(", ")}</div>
          )}
        </div>
      ))}
    </>
  );
}
