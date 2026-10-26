import type { DashboardStats, ReferralReport, RegistrationListItem, RegistrationTrends } from "../types";

/**
 * Generates and downloads a multi-sheet Microsoft Excel (.xlsx) file
 * containing:
 *  1. Dashboard Overview & KPIs
 *  2. Referral Leaderboard & Company Payouts
 *  3. Detailed List of Referred Applicants
 */
export async function exportDashboardToExcel(
  stats: DashboardStats,
  referralData: ReferralReport | null,
  timeRangeLabel: string = "All Time"
) {
  try {
    const XLSX = await import("xlsx");
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `JobPlatform_Analytics_${timestamp}.xlsx`;

    const wb = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // Sheet 1: Dashboard KPIs & System Overview
    // -------------------------------------------------------------
    const kpiRows = [
      ["JOB PLATFORM - OPERATIONS & PERFORMANCE SUMMARY"],
      [`Generated At: ${new Date().toLocaleString()}`, `Period Filter: ${timeRangeLabel}`],
      [],
      ["Metric Name", "Current Count / Value", "Category & Details"],
      ["Total Registered Customers", stats.total_users, "All unique customer accounts"],
      ["Total Job Applications", stats.total_registrations, "All job applications submitted"],
      ["Approved Applications", stats.approved_registrations, "Verified and approved job seekers"],
      ["Pending Applications", stats.pending_registrations, "Applications awaiting review"],
      ["Rejected Applications", stats.rejected_registrations, "Disapproved / invalid applications"],
      ["Suspended Applications", stats.suspended_registrations, "Temporarily suspended applications"],
      ["Cancelled Applications", stats.cancelled_registrations, "Cancelled by user or admin"],
      ["Active Job Categories", stats.active_jobs, "Current open job categories"],
      ["Active Operating Cities", stats.active_cities, "Covered metropolitan areas"],
      ["Notifications Sent", stats.notifications_sent, "Successfully delivered broadcasts"],
      ["Notifications Failed", stats.notifications_failed, "Failed delivery attempts"],
      ["Notifications Pending", stats.notifications_pending, "In queue for delivery"],
    ];

    if (referralData) {
      kpiRows.push(
        [],
        ["REFERRAL PROGRAM OVERVIEW"],
        ["Total Referred Applications", referralData.summary.total_referrals, "Referral-attributed registrations"],
        ["Approved Referral Invites", referralData.summary.approved_referrals, "Converted and approved invites"],
        ["Pending Referral Invites", referralData.summary.pending_referrals, "Awaiting approval"],
        ["Rejected Referral Invites", referralData.summary.rejected_referrals, "Rejected referral applicants"],
        ["Current Payout Rate / Approved Invite", `${referralData.summary.payout_rate} ETB`, "Rate paid per approved applicant"],
        ["Total Company Referral Payout", `${referralData.summary.total_payout.toLocaleString()} ETB`, "Total expenditure for referrers"]
      );
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(kpiRows);
    wsSummary["!cols"] = [{ wch: 36 }, { wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary & KPIs");

    // -------------------------------------------------------------
    // Sheet 2: Referral Leaderboard & Payouts
    // -------------------------------------------------------------
    if (referralData && referralData.referrers.length > 0) {
      const referralHeaders = [
        "Inviter / Referrer Name",
        "Referral Type",
        "Total Invites",
        "Approved Invites",
        "Pending Invites",
        "Rejected Invites",
        "Payout Rate (ETB)",
        "Total Company Payout (ETB)",
        "Approval / Conversion Rate",
      ];

      const referralRows = referralData.referrers.map((ref) => {
        const convRate =
          ref.total_invites > 0
            ? `${Math.round((ref.approved_invites / ref.total_invites) * 100)}%`
            : "0%";
        return [
          ref.referrer_name,
          ref.referral_type,
          ref.total_invites,
          ref.approved_invites,
          ref.pending_invites,
          ref.rejected_invites,
          ref.payout_rate,
          ref.total_payout,
          convRate,
        ];
      });

      const wsReferrals = XLSX.utils.aoa_to_sheet([referralHeaders, ...referralRows]);
      wsReferrals["!cols"] = [
        { wch: 26 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(wb, wsReferrals, "Referral Leaderboard");

      // -------------------------------------------------------------
      // Sheet 3: Referred Applicants Detail
      // -------------------------------------------------------------
      const applicantHeaders = [
        "Applicant Full Name",
        "Phone Number",
        "National ID",
        "Gender",
        "Job Applied",
        "Inviter / Referrer",
        "Referral Channel",
        "Application Status",
        "Submitted Date",
      ];

      const applicantRows: any[][] = [];
      referralData.referrers.forEach((ref) => {
        ref.customers.forEach((c) => {
          applicantRows.push([
            c.customer_name,
            c.customer_phone,
            c.national_id || "N/A",
            c.gender || "N/A",
            c.job_name,
            ref.referrer_name,
            ref.referral_type,
            c.status,
            c.created_at ? new Date(c.created_at).toLocaleString() : "N/A",
          ]);
        });
      });

      const wsApplicants = XLSX.utils.aoa_to_sheet([applicantHeaders, ...applicantRows]);
      wsApplicants["!cols"] = [
        { wch: 24 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 22 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, wsApplicants, "Referred Applicants");
    }

    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Failed to export Excel report via SheetJS:", error);
  }
}

/**
 * Generates and downloads a Microsoft Excel (.xlsx) file containing:
 *  1. Detailed Registrations Table (Name, Phone, National ID, Gender, Job, City, Subcity, Status, Date)
 *  2. Analytics Summary (Trends by Job and City)
 */
export async function exportRegistrationsReportToExcel(
  items: RegistrationListItem[],
  trends?: RegistrationTrends | null,
  filterSummary?: string
) {
  try {
    const XLSX = await import("xlsx");
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Digaf_Registrations_Report_${timestamp}.xlsx`;
    const wb = XLSX.utils.book_new();

    const headers = [
      "Applicant Full Name",
      "Phone Number",
      "National ID (Fayda)",
      "Gender",
      "Employment Status",
      "Employer / Business Name",
      "Job Title / Nature of Business",
      "Monthly Income / Salary (ETB)",
      "Job Category",
      "City",
      "Subcity / Zone",
      "Referral Channel",
      "Referrer Name",
      "Application Status",
      "Registration Date",
    ];

    const rows = items.map((reg) => {
      const referralInfo =
        reg.referral_type === "ADMIN"
          ? (reg.referral_admin_name || reg.referral_name || "Admin")
          : reg.referral_type === "PERSON"
            ? (reg.referral_name || "Person")
            : "Direct (None)";

      const empStatus =
        reg.employment_type === "EMPLOYEE"
          ? "Employed"
          : reg.employment_type === "SELF_EMPLOYED"
          ? "Self-Employed"
          : "N/A";

      const empDetails = reg.employment_details || {};
      const companyOrBiz =
        reg.employer_name ||
        reg.business_name ||
        empDetails.employer_name ||
        empDetails.business_name ||
        "N/A";

      const roleOrNature =
        empDetails.job_title ||
        empDetails.nature_of_business ||
        empDetails.business_type ||
        reg.job_name;

      const incomeOrSalary =
        empDetails.monthly_salary ||
        empDetails.monthly_business_income ||
        "N/A";

      return [
        `${reg.user_first_name} ${reg.user_second_name}`,
        reg.user_phone,
        reg.national_id || "N/A",
        reg.gender || reg.sex || "N/A",
        empStatus,
        companyOrBiz,
        roleOrNature,
        incomeOrSalary,
        reg.job_name,
        reg.city_name,
        reg.subcity_name,
        reg.referral_type,
        referralInfo,
        reg.status,
        reg.created_at ? new Date(reg.created_at).toLocaleString() : "N/A",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      ["DIGAF JOB PLATFORM - REGISTRATIONS REPORT"],
      [`Generated: ${new Date().toLocaleString()}`, `Filter: ${filterSummary || "All Records"}`],
      [],
      headers,
      ...rows,
    ]);

    ws["!cols"] = [
      { wch: 26 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 26 },
      { wch: 22 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Registrations");

    if (trends) {
      const jobRows = trends.by_job.map((j) => [j.job, j.count]);
      const cityRows = trends.by_city.map((c) => [c.city, c.count]);

      const wsAnalytics = XLSX.utils.aoa_to_sheet([
        ["REGISTRATIONS BREAKDOWN BY JOB"],
        ["Job Category", "Applicant Count"],
        ...jobRows,
        [],
        ["REGISTRATIONS BREAKDOWN BY CITY"],
        ["Operating City", "Applicant Count"],
        ...cityRows,
      ]);

      wsAnalytics["!cols"] = [{ wch: 30 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsAnalytics, "Trends & Summary");
    }

    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Failed to export Excel registrations report:", error);
  }
}
