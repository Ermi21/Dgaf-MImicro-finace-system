import { useState } from "react";
import { useI18n } from "../i18n";
import { api, toQuery, ApiRequestError } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { Page, UserRead } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";

const PAGE_SIZE = 20;

export function UsersPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);

  // Delete state
  const [customerToDelete, setCustomerToDelete] = useState<UserRead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const query = toQuery({ q: activeSearch || undefined, page, page_size: PAGE_SIZE });
  const state = useApi<Page<UserRead>>(() => api.get<Page<UserRead>>(`/api/v1/users${query}`), [query]);

  function handleSearch() {
    setActiveSearch(q.trim());
    setPage(1);
  }

  function handleClear() {
    setQ("");
    setActiveSearch("");
    setPage(1);
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/v1/users/${customerToDelete.id}`);
      setDeleteSuccess(
        `Customer "${customerToDelete.first_name} ${customerToDelete.second_name}" was permanently removed from the system.`
      );
      setCustomerToDelete(null);
      state.reload();
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : t.common.somethingWrong);
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="screen">
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t.users.title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--tg-hint, #888)" }}>
            Registered job seekers and customer profiles synchronized across the platform
          </p>
        </div>
        {state.status === "success" && (
          <div style={{ fontSize: 13, color: "var(--tg-hint, #888)", fontWeight: 500 }}>
            Total Customers: <strong style={{ color: "var(--tg-text, #fff)" }}>{state.data.total}</strong>
          </div>
        )}
      </div>

      {/* Notifications / Toast */}
      {deleteSuccess && (
        <div className="success-banner" style={{ marginBottom: 12 }}>
          ✓ {deleteSuccess}
        </div>
      )}
      {deleteError && (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner message={deleteError} />
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="card filter-bar" style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <TextField
            label={t.users.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch}>
          🔍 {t.common.search}
        </Button>
        {activeSearch && (
          <Button variant="secondary" onClick={handleClear}>
            ✕ {t.common.cancel}
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && <ErrorBanner message={state.message} onRetry={state.reload} />}
      {state.status === "success" && state.data.items.length === 0 && (
        <EmptyState title={t.common.noResults} />
      )}

      {/* Professional Multi-Column Customer Table */}
      {state.status === "success" && state.data.items.length > 0 && (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 840 }}>
                {/* Table Header Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.7fr 1.3fr 1.4fr 1.2fr 1.0fr 0.9fr 1.0fr",
                    gap: "0 8px",
                    padding: "12px 16px",
                    background: "var(--color-surface-raised, #18221b)",
                    borderBottom: "1px solid var(--color-border, #2a3a30)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-text-secondary, #94a3b8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    alignItems: "center",
                  }}
                >
                  <span>{t.users.columnName}</span>
                  <span>{t.users.columnPhone}</span>
                  <span>{t.users.columnNationalId}</span>
                  <span>{t.users.columnJoined}</span>
                  <span>{t.users.columnApplications}</span>
                  <span>{t.users.columnStatus}</span>
                  <span style={{ textAlign: "right" }}>{t.users.columnActions}</span>
                </div>

                {/* Table Data Rows */}
                {state.data.items.map((u) => (
                  <div
                    key={u.id}
                    className="list-item"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.7fr 1.3fr 1.4fr 1.2fr 1.0fr 0.9fr 1.0fr",
                      gap: "0 8px",
                      padding: "12px 16px",
                      alignItems: "center",
                      borderBottom: "1px solid var(--color-border, #1f2922)",
                      borderRadius: 0,
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* 1. Customer Full Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)",
                          color: "#34d399",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {u.first_name ? u.first_name[0].toUpperCase() : "U"}
                      </span>
                      <span className="list-item-title" style={{ fontWeight: 600, fontSize: 13.5 }}>
                        {u.first_name} {u.second_name}
                      </span>
                    </div>

                    {/* 2. Phone Number */}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: "var(--tg-text, #cbd5e1)",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {u.phone}
                    </span>

                    {/* 3. National ID (Fayda) */}
                    <div>
                      {u.national_id ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#60a5fa",
                            background: "rgba(59, 130, 246, 0.14)",
                            padding: "2px 7px",
                            borderRadius: 4,
                            border: "1px solid rgba(59, 130, 246, 0.25)",
                          }}
                        >
                          {u.national_id}
                        </span>
                      ) : (
                        <span style={{ color: "var(--tg-hint, #666)", fontSize: 13 }}>—</span>
                      )}
                    </div>

                    {/* 4. Registration Date */}
                    <span style={{ fontSize: 12.5, color: "var(--tg-hint, #94a3b8)" }}>
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    {/* 5. Total Applications */}
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 10,
                          background: (u.registrations_count ?? 0) > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.05)",
                          color: (u.registrations_count ?? 0) > 0 ? "#34d399" : "var(--tg-hint, #888)",
                        }}
                      >
                        {u.registrations_count ?? 0} {(u.registrations_count === 1) ? "Job" : "Jobs"}
                      </span>
                    </div>

                    {/* 6. Status */}
                    <div>
                      <span className={`badge ${u.is_active ? "badge-approved" : "badge-cancelled"}`}>
                        {u.is_active ? t.common.active : t.common.inactive}
                      </span>
                    </div>

                    {/* 7. Action: Delete Customer */}
                    <div style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(u)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#f87171",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                          e.currentTarget.style.borderColor = "#f87171";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                        }}
                        title={t.users.deleteCustomer}
                      >
                        <span>🗑</span>
                        <span>{t.common.delete || "Delete"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Pagination page={page} totalPages={state.data.total_pages} onChange={setPage} />
        </>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <ConfirmDialog
          title={t.users.deleteCustomerTitle}
          confirmLabel={deleting ? "Deleting..." : "Permanently Delete Customer"}
          confirmDisabled={deleting}
          busy={deleting}
          onCancel={() => {
            if (!deleting) {
              setCustomerToDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleDeleteCustomer}
        >
          <div style={{ color: "var(--tg-text, #fff)", fontSize: 13.5, lineHeight: 1.6 }}>
            {deleteError && (
              <div style={{ marginBottom: 12 }}>
                <ErrorBanner message={deleteError} />
              </div>
            )}
            <p style={{ margin: "0 0 12px", color: "#f87171", fontWeight: 600 }}>
              ⚠️ {t.users.deleteCustomerWarning}
            </p>
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--color-border, #333)",
                marginBottom: 8,
              }}
            >
              <div><strong>Name:</strong> {customerToDelete.first_name} {customerToDelete.second_name}</div>
              <div><strong>Phone:</strong> {customerToDelete.phone}</div>
              {customerToDelete.national_id && (
                <div><strong>National ID:</strong> {customerToDelete.national_id}</div>
              )}
              <div><strong>Applications:</strong> {customerToDelete.registrations_count ?? 0}</div>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
