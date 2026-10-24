import { useEffect, useState, useMemo, useRef } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError, clearApiCache } from "../services/api";
import type { DashboardStats, ReferralReport, ReferrerPerformance } from "../types";
import { LoadingSpinner, ErrorBanner, RegistrationStatusBadge } from "../components/Feedback";
import { CircleChart, type ChartSegment } from "../components/CircleChart";
import { exportDashboardToExcel } from "../utils/excelExport";
import { DigafIcon } from "../components/DigafLogo";

type DateRange = "ALL" | "TODAY" | "7DAYS" | "30DAYS" | "90DAYS" | "MONTH";

interface PeriodCacheEntry {
  stats: DashboardStats;
  referralData: ReferralReport;
  timestamp: number;
}

const periodCache = new Map<string, PeriodCacheEntry>();

export function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [referralData, setReferralData] = useState<ReferralReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("ALL");
  const [payoutRate, setPayoutRate] = useState<number>(100);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerPerformance | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeRangeRef = useRef<DateRange>(dateRange);
  activeRangeRef.current = dateRange;

  function buildDateParams(range: DateRange) {
    if (range === "ALL") return "";
    const now = new Date();
    let fromDate = new Date();
    if (range === "TODAY") {
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === "7DAYS") {
      fromDate.setDate(now.getDate() - 7);
    } else if (range === "30DAYS") {
      fromDate.setDate(now.getDate() - 30);
    } else if (range === "90DAYS") {
      fromDate.setDate(now.getDate() - 90);
    } else if (range === "MONTH") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return `&date_from=${encodeURIComponent(fromDate.toISOString())}&date_to=${encodeURIComponent(now.toISOString())}`;
  }

  const timeRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "TODAY":
        return t.dashboard.filterToday;
      case "7DAYS":
        return t.dashboard.filter7Days;
      case "30DAYS":
        return t.dashboard.filter30Days;
      case "90DAYS":
        return t.dashboard.filter90Days || "Last 90 Days";
      case "MONTH":
        return t.dashboard.filterThisMonth;
      case "ALL":
      default:
        return t.dashboard.filterAllTime;
    }
  }, [dateRange, t]);

  async function fetchDataForRange(targetRange: DateRange, isManual = false) {
    if (isManual) setRefreshing(true);
    try {
      const dateParams = buildDateParams(targetRange);
      const dashPromise = api.get<DashboardStats>(
        `/api/v1/reports/dashboard?payout_rate=${payoutRate}${dateParams}`,
        { bypassCache: isManual },
      );
      const refPromise = api.get<ReferralReport>(
        `/api/v1/reports/referrals?payout_rate=${payoutRate}${dateParams}`,
        { bypassCache: isManual },
      );

      // Fast display: update KPI cards as soon as dashboard stats resolve
      dashPromise
        .then((dashRes) => {
          if (activeRangeRef.current === targetRange) {
            setStats(dashRes);
            setLoading(false);
            setError(null);
          }
        })
        .catch(() => {});

      const [dashRes, refRes] = await Promise.all([dashPromise, refPromise]);

      const cacheKey = `${targetRange}_${payoutRate}`;
      periodCache.set(cacheKey, {
        stats: dashRes,
        referralData: refRes,
        timestamp: Date.now(),
      });

      if (activeRangeRef.current === targetRange) {
        setStats(dashRes);
        setReferralData(refRes);
        setError(null);
      }
    } catch (err) {
      if (!stats) {
        setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }

  function handleDateRangeSelect(range: DateRange) {
    if (range === dateRange) {
      setDropdownOpen(false);
      return;
    }
    setDateRange(range);
    activeRangeRef.current = range;
    setDropdownOpen(false);

    // Instant switch from memory cache - 0ms, zero wait!
    const cacheKey = `${range}_${payoutRate}`;
    const cached = periodCache.get(cacheKey);

    if (cached) {
      setStats(cached.stats);
      setReferralData(cached.referralData);
      // Quiet background revalidation without blocking UI
      fetchDataForRange(range, false);
    } else {
      fetchDataForRange(range, false);
    }
  }

  function handleManualRefresh() {
    periodCache.clear();
    clearApiCache("/reports");
    fetchDataForRange(dateRange, true);
  }

  useEffect(() => {
    activeRangeRef.current = dateRange;
    // Always fetch fresh data on mount to guarantee perfect sync across all pages
    periodCache.clear();
    clearApiCache("/reports");
    fetchDataForRange(dateRange, false);

    // Background sync every 25s when tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDataForRange(activeRangeRef.current, false);
      }
    }, 25000);

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        fetchDataForRange(activeRangeRef.current, false);
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutRate]);

  async function handleExportExcel() {
    if (!stats) return;
    setExporting(true);
    try {
      await exportDashboardToExcel(stats, referralData, timeRangeLabel);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  }

  // Real Circular Chart Segments computed dynamically from live stats
  const registrationSegments: ChartSegment[] = useMemo(() => {
    if (!stats) return [];
    return [
      { label: t.dashboard.approved, value: stats.approved_registrations, color: "#10b981", icon: "✓" },
      { label: t.dashboard.pending, value: stats.pending_registrations, color: "#f59e0b", icon: "⏳" },
      { label: t.dashboard.rejected, value: stats.rejected_registrations, color: "#f43f5e", icon: "✕" },
      { label: t.dashboard.suspended, value: stats.suspended_registrations, color: "#a855f7", icon: "⏸" },
      { label: "Cancelled", value: stats.cancelled_registrations || 0, color: "#64748b", icon: "⊘" },
    ];
  }, [stats, t]);

  const referralSegments: ChartSegment[] = useMemo(() => {
    if (!referralData) return [];
    return [
      { label: t.dashboard.approvedReferrals, value: referralData.summary.approved_referrals, color: "#10b981", icon: "✓" },
      { label: "Pending Invites", value: referralData.summary.pending_referrals, color: "#f59e0b", icon: "⏳" },
      { label: "Rejected Invites", value: referralData.summary.rejected_referrals, color: "#f43f5e", icon: "✕" },
    ];
  }, [referralData, t]);

  const notificationSegments: ChartSegment[] = useMemo(() => {
    if (!stats) return [];
    return [
      { label: t.notifications.sent, value: stats.notifications_sent, color: "#10b981", icon: "📤" },
      { label: t.notifications.failed, value: stats.notifications_failed, color: "#f43f5e", icon: "⚠️" },
      { label: t.notifications.pending, value: stats.notifications_pending || 0, color: "#38bdf8", icon: "🕒" },
    ];
  }, [stats, t]);

  // Derived metrics
  const approvalRate = useMemo(() => {
    if (!stats || stats.total_registrations === 0) return 0;
    return Math.round((stats.approved_registrations / stats.total_registrations) * 100);
  }, [stats]);

  const referralConversionRate = useMemo(() => {
    if (!referralData || referralData.summary.total_referrals === 0) return 0;
    return Math.round(
      (referralData.summary.approved_referrals / referralData.summary.total_referrals) * 100
    );
  }, [referralData]);

  return (
    <div className="screen dashboard-screen">
      {/* Hero Header */}
      <div className="admin-hero dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-badge-row">
            <span className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <DigafIcon size={14} /> Digaf Enterprise Analytics
            </span>
            <span className="live-sync-indicator">
              <span className="live-sync-dot" />
              {t.dashboard.liveSync}
            </span>
          </div>
          <h1 className="page-title dashboard-page-title">{t.dashboard.title}</h1>
          <p className="page-subtitle dashboard-page-subtitle">
            Advanced real-time control room for customer registrations, referral payouts.
          </p>
        </div>

        {/* Action Controls Bar: Period Dropdown, Payout, Sync, Excel Export */}
        <div className="dashboard-hero-actions">
          {/* Time Period Dropdown Menu */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="dropdown-trigger-btn"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <span className="dropdown-icon">📅</span>
              <span className="dropdown-label">{timeRangeLabel}</span>
              <span className={`dropdown-arrow ${dropdownOpen ? "open" : ""}`}>▾</span>
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-menu-header">{t.dashboard.timeFilter}</div>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "ALL" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("ALL")}
                >
                  <span className="dropdown-item-check">{dateRange === "ALL" ? "✓" : ""}</span>
                  {t.dashboard.filterAllTime}
                </button>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "TODAY" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("TODAY")}
                >
                  <span className="dropdown-item-check">{dateRange === "TODAY" ? "✓" : ""}</span>
                  {t.dashboard.filterToday}
                </button>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "7DAYS" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("7DAYS")}
                >
                  <span className="dropdown-item-check">{dateRange === "7DAYS" ? "✓" : ""}</span>
                  {t.dashboard.filter7Days}
                </button>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "30DAYS" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("30DAYS")}
                >
                  <span className="dropdown-item-check">{dateRange === "30DAYS" ? "✓" : ""}</span>
                  {t.dashboard.filter30Days}
                </button>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "90DAYS" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("90DAYS")}
                >
                  <span className="dropdown-item-check">{dateRange === "90DAYS" ? "✓" : ""}</span>
                  {t.dashboard.filter90Days || "Last 90 Days"}
                </button>
                <button
                  type="button"
                  className={`dropdown-menu-item ${dateRange === "MONTH" ? "selected" : ""}`}
                  onClick={() => handleDateRangeSelect("MONTH")}
                >
                  <span className="dropdown-item-check">{dateRange === "MONTH" ? "✓" : ""}</span>
                  {t.dashboard.filterThisMonth}
                </button>
              </div>
            )}
          </div>

          {/* Payout Rate Configuration */}
          <div className="dashboard-payout-widget">
            <span className="dashboard-payout-label">💰 {t.dashboard.payoutRate}:</span>
            <input
              type="number"
              min="0"
              step="10"
              value={payoutRate}
              onChange={(e) => setPayoutRate(Math.max(0, Number(e.target.value) || 0))}
              className="dashboard-payout-input"
            />
            <span className="dashboard-payout-unit">ETB</span>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            className="dashboard-action-btn btn-sync"
            onClick={handleManualRefresh}
            title="Refresh dashboard data"
            disabled={refreshing}
          >
            {refreshing ? "↻ Syncing…" : "↻ Refresh"}
          </button>

          {/* Export to Excel Action Button */}
          <button
            type="button"
            className="dashboard-action-btn btn-excel-export"
            onClick={handleExportExcel}
            disabled={exporting || !stats}
            title="Export all data and analytics to Excel (.xlsx)"
          >
            <span className="excel-btn-icon">📥</span>
            <span>{exporting ? t.dashboard.exportingExcel : t.dashboard.exportExcel}</span>
          </button>
        </div>
      </div>

      {loading && !stats && <LoadingSpinner />}
      {error && !stats && <ErrorBanner message={error} onRetry={handleManualRefresh} />}

      {stats && (
        <>
          {/* Main KPI Stat Cards Grid */}
          <div className={`dashboard-stat-grid ${refreshing ? "dashboard-stat-grid-refreshing" : ""}`}>
            <div className="pro-stat-card">
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                👥
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.totalUsers}</div>
                <div className="pro-stat-value">{stats.total_users.toLocaleString()}</div>
                <div className="pro-stat-sub">Platform Registered Accounts</div>
              </div>
            </div>

            <div className="pro-stat-card">
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
                📋
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.totalRegistrations}</div>
                <div className="pro-stat-value">{stats.total_registrations.toLocaleString()}</div>
                <div className="pro-stat-sub">{approvalRate}% Approved Overall</div>
              </div>
            </div>

            <div className="pro-stat-card" style={{ borderColor: "rgba(16, 185, 129, 0.35)" }}>
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                ✓
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.approved}</div>
                <div className="pro-stat-value" style={{ color: "#10b981" }}>
                  {stats.approved_registrations.toLocaleString()}
                </div>
                <div className="pro-stat-sub">Verified &amp; Active Seekers</div>
              </div>
            </div>

            <div className="pro-stat-card" style={{ borderColor: "rgba(245, 158, 11, 0.35)" }}>
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                ⏳
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.pending}</div>
                <div className="pro-stat-value" style={{ color: "#f59e0b" }}>
                  {stats.pending_registrations.toLocaleString()}
                </div>
                <div className="pro-stat-sub">Awaiting Admin Review</div>
              </div>
            </div>

            <div className="pro-stat-card" style={{ borderColor: "rgba(244, 63, 94, 0.35)" }}>
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
                ✕
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.rejected}</div>
                <div className="pro-stat-value" style={{ color: "#f43f5e" }}>
                  {stats.rejected_registrations.toLocaleString()}
                </div>
                <div className="pro-stat-sub">Disapproved Applications</div>
              </div>
            </div>

            <div className="pro-stat-card">
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
                💼
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.activeJobs}</div>
                <div className="pro-stat-value">{stats.active_jobs.toLocaleString()}</div>
                <div className="pro-stat-sub">Available Job Categories</div>
              </div>
            </div>

            <div className="pro-stat-card">
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9" }}>
                🏙️
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.activeCities}</div>
                <div className="pro-stat-value">{stats.active_cities.toLocaleString()}</div>
                <div className="pro-stat-sub">Operating Municipalities</div>
              </div>
            </div>

            <div className="pro-stat-card">
              <div className="pro-stat-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                📤
              </div>
              <div className="pro-stat-content">
                <div className="pro-stat-label">{t.dashboard.notificationsSent}</div>
                <div className="pro-stat-value">{stats.notifications_sent.toLocaleString()}</div>
                <div className="pro-stat-sub">Delivered Bot Messages</div>
              </div>
            </div>
          </div>

          {/* Live Dynamic Circular (Donut) Charts Grid */}
          <div className="dashboard-charts-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-heading">
                📊 {t.dashboard.chartsTitle}
              </h2>
              <span className="dashboard-section-tag">100% Live Computed Data</span>
            </div>

            <div className="dashboard-charts-grid">
              {/* Chart 1: Registration Status Distribution */}
              <CircleChart
                title={t.dashboard.registrationBreakdown}
                subtitle="Live status share of all customer submissions"
                segments={registrationSegments}
                centerValue={stats.total_registrations}
                centerLabel="Registrations"
                size={200}
                strokeWidth={22}
              />

              {/* Chart 2: Referral Conversion Breakdown */}
              <CircleChart
                title={t.dashboard.referralBreakdown}
                subtitle="Approval conversion of referred applicants"
                segments={referralSegments}
                centerValue={`${referralConversionRate}%`}
                centerLabel="Approved Rate"
                size={200}
                strokeWidth={22}
              />

              {/* Chart 3: Notification Delivery Health */}
              <CircleChart
                title={t.dashboard.deliveryBreakdown}
                subtitle="Telegram broadcast delivery &amp; failure ratio"
                segments={notificationSegments}
                centerValue={stats.notifications_sent}
                centerLabel="Delivered"
                size={200}
                strokeWidth={22}
              />
            </div>
          </div>

          {/* Referral Performance & Company Payouts Section */}
          <div className="dashboard-card referral-section-card">
            <div className="referral-section-header">
              <div>
                <h2 className="dashboard-section-heading" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  🤝 {t.dashboard.referralLeaderboard}
                </h2>
                <p className="dashboard-page-subtitle" style={{ fontSize: 13, marginTop: 4 }}>
                  Comprehensive performance audit of inviters, verified conversions, and calculated referral payouts.
                </p>
              </div>

              <div className="referral-header-badge">
                <span>💰 Rate: <b>{payoutRate} ETB</b> / Approved</span>
              </div>
            </div>

            {/* Referral Summary Highlight Cards */}
            {referralData && (
              <div className="referral-highlight-grid">
                <div className="pro-stat-card referral-stat-box">
                  <div className="referral-stat-val">{referralData.summary.total_referrals}</div>
                  <div className="referral-stat-lbl">{t.dashboard.totalReferrals}</div>
                </div>
                <div className="pro-stat-card referral-stat-box" style={{ borderColor: "rgba(16, 185, 129, 0.4)" }}>
                  <div className="referral-stat-val" style={{ color: "#10b981" }}>
                    {referralData.summary.approved_referrals}
                  </div>
                  <div className="referral-stat-lbl">{t.dashboard.approvedReferrals}</div>
                </div>
                <div className="pro-stat-card referral-stat-box" style={{ borderColor: "rgba(245, 158, 11, 0.4)" }}>
                  <div className="referral-stat-val" style={{ color: "#f59e0b" }}>
                    {referralData.summary.pending_referrals}
                  </div>
                  <div className="referral-stat-lbl">Pending Review</div>
                </div>
                <div
                  className="pro-stat-card referral-stat-box"
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)",
                    borderColor: "#10b981",
                  }}
                >
                  <div className="referral-stat-val" style={{ color: "#34d399" }}>
                    {referralData.summary.total_payout.toLocaleString()} <span style={{ fontSize: 14 }}>ETB</span>
                  </div>
                  <div className="referral-stat-lbl">{t.dashboard.estimatedPayout}</div>
                </div>
              </div>
            )}

            {/* Referrers Ranking Table */}
            {referralData && referralData.referrers.length > 0 ? (
              <div className="dashboard-table-container">
                <table className="dashboard-pro-table">
                  <thead>
                    <tr>
                      <th>Inviter / Referrer</th>
                      <th>Role</th>
                      <th style={{ textAlign: "center" }}>Invites</th>
                      <th style={{ textAlign: "center" }}>Approved</th>
                      <th style={{ textAlign: "center" }}>Pending</th>
                      <th style={{ textAlign: "right" }}>Total Payout</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.referrers.map((ref, idx) => {
                      const isAdm = ref.referral_type === "ADMIN";
                      const roleLabel = isAdm ? "Admin" : "Customer";
                      return (
                        <tr
                          key={idx}
                          className={selectedReferrer?.referrer_name === ref.referrer_name ? "row-selected" : ""}
                        >
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ marginRight: 8, fontSize: 16 }}>
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤"}
                            </span>
                            {ref.referrer_name}
                          </td>
                          <td>
                            <span
                              className="referral-type-tag"
                              style={{
                                background: isAdm ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: isAdm ? "#34d399" : "#fbbf24",
                                borderColor: isAdm ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                              }}
                            >
                              {roleLabel}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{ref.total_invites}</td>
                        <td style={{ textAlign: "center", color: "#10b981", fontWeight: 700 }}>
                          {ref.approved_invites}
                        </td>
                        <td style={{ textAlign: "center", color: "#f59e0b" }}>{ref.pending_invites}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#34d399" }}>
                          {ref.total_payout.toLocaleString()} ETB
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn-view-applicants"
                            onClick={() =>
                              setSelectedReferrer(
                                selectedReferrer?.referrer_name === ref.referrer_name ? null : ref
                              )
                            }
                          >
                            {selectedReferrer?.referrer_name === ref.referrer_name
                              ? "Hide Applicants ▲"
                              : "View Applicants ▼"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-empty-referrals">
                <span>🤝 No referral activity recorded for this selected time window.</span>
              </div>
            )}

            {/* Referred Customer Progress Tracker Modal / Panel */}
            {selectedReferrer && (
              <div className="referred-customers-panel">
                <div className="referred-customers-panel-header">
                  <h3 className="referred-customers-title">
                    👥 Referred Applicants by <u>{selectedReferrer.referrer_name}</u> ({selectedReferrer.customers.length})
                  </h3>
                  <button
                    type="button"
                    className="btn-close-panel"
                    onClick={() => setSelectedReferrer(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="referred-customers-list">
                  {selectedReferrer.customers.map((c) => (
                    <div key={c.registration_id} className="referred-customer-card">
                      <div className="referred-customer-info">
                        <div className="customer-name-row">
                          <span className="customer-name">{c.customer_name}</span>
                          {c.gender && (
                            <span className="customer-tag">
                              {c.gender === "MALE" ? "♂ Male" : "♀ Female"}
                            </span>
                          )}
                          {c.national_id && (
                            <span className="customer-tag id-tag">ID: {c.national_id}</span>
                          )}
                        </div>
                        <div className="customer-meta-row">
                          <span>📞 {c.customer_phone}</span>
                          <span>•</span>
                          <span>💼 {c.job_name}</span>
                          {c.created_at && (
                            <>
                              <span>•</span>
                              <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <RegistrationStatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
