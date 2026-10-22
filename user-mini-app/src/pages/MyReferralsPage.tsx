import { useState } from "react";
import { useI18n } from "../i18n";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { MyReferralReport } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState, StatusBadge } from "../components/Feedback";

export function MyReferralsPage() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const state = useApi<MyReferralReport>(
    () => api.get<MyReferralReport>("/api/v1/reports/my-referrals"),
    []
  );

  function copyReferralName(name: string) {
    if (!name) return;
    navigator.clipboard?.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="screen">
      <div className="hero-card" style={{ background: "linear-gradient(135deg, rgba(15, 107, 76, 0.14) 0%, rgba(201, 138, 44, 0.08) 100%)" }}>
        <h1 className="page-title">{t.referrals.title}</h1>
        <p className="page-subtitle">{t.referrals.subtitle}</p>
      </div>

      {state.status === "loading" && <LoadingSpinner />}
      {state.status === "error" && (
        <ErrorBanner message={state.message} onRetry={state.reload} />
      )}

      {state.status === "success" && (
        <>
          {/* Earnings Overview Card */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, #0f6b4c 0%, #08432f 100%)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 8px 24px rgba(15, 107, 76, 0.28)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.9 }}>
                💰 {t.referrals.totalEarnings}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                {state.data.summary.payout_rate} ETB / Invite
              </span>
            </div>

            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {state.data.summary.total_earned_payout.toLocaleString()} <span style={{ fontSize: 18, fontWeight: 600 }}>ETB</span>
            </div>

            {state.data.summary.pending_payout > 0 && (
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                ⏳ {t.referrals.pendingEarnings}: <b>{state.data.summary.pending_payout.toLocaleString()} ETB</b> ({state.data.summary.pending_invites} in review)
              </div>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <div className="card" style={{ padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--tg-text)" }}>
                {state.data.summary.total_invites}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tg-hint)", marginTop: 2 }}>
                {t.referrals.totalInvited}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 10px", textAlign: "center", borderColor: "rgba(15, 107, 76, 0.3)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-approved)" }}>
                {state.data.summary.approved_invites}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-approved)", marginTop: 2 }}>
                {t.referrals.approvedInvites}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 10px", textAlign: "center", borderColor: "rgba(201, 138, 44, 0.3)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-pending)" }}>
                {state.data.summary.pending_invites}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-pending)", marginTop: 2 }}>
                {t.referrals.pendingInvites}
              </div>
            </div>
          </div>

          {/* How to Invite Friends Section */}
          {state.data.user_referral_name && (
            <div className="card" style={{ background: "rgba(15, 107, 76, 0.04)", border: "1.5px dashed var(--color-primary)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                📢 {t.referrals.shareInstructionsTitle}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--tg-hint)", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                {t.referrals.shareInstructionsText}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--tg-surface)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 15, color: "var(--color-primary)" }}>
                  {state.data.user_referral_name}
                </span>
                <button
                  type="button"
                  onClick={() => copyReferralName(state.data.user_referral_name)}
                  style={{
                    background: "var(--color-primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Invited Applicants List with Step Tracker */}
          <div className="card">
            <h2 className="section-title" style={{ margin: "0 0 12px 0", fontSize: 16 }}>
              👥 {t.referrals.applicantsListTitle} ({state.data.customers.length})
            </h2>

            {state.data.customers.length === 0 ? (
              <EmptyState
                title={t.referrals.noApplicantsYet}
                hint={t.referrals.noApplicantsHint}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {state.data.customers.map((c) => {
                  const stepLabel =
                    c.status === "APPROVED"
                      ? t.referrals.stepApproved
                      : c.status === "REJECTED"
                        ? t.referrals.stepRejected
                        : t.referrals.stepReview;

                  return (
                    <div
                      key={c.registration_id}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        background: "rgba(0, 0, 0, 0.02)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{c.customer_name}</div>
                          <div style={{ fontSize: 12, color: "var(--tg-hint)", marginTop: 2 }}>
                            💼 {c.job_name} {c.city_name ? `• 📍 ${c.city_name}` : ""}
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>

                      {/* Step Progress Visual Bar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: 6,
                          background:
                            c.status === "APPROVED"
                              ? "rgba(15, 107, 76, 0.1)"
                              : c.status === "REJECTED"
                                ? "rgba(179, 67, 43, 0.1)"
                                : "rgba(201, 138, 44, 0.1)",
                          color:
                            c.status === "APPROVED"
                              ? "var(--color-approved)"
                              : c.status === "REJECTED"
                                ? "var(--color-rejected)"
                                : "var(--color-pending)",
                        }}
                      >
                        <span>{c.status === "APPROVED" ? "🎉" : c.status === "REJECTED" ? "✕" : "⏳"}</span>
                        <span>{stepLabel}</span>
                        {c.created_at && (
                          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: "var(--tg-hint)" }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
