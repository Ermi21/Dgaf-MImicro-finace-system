import { useState, useEffect, type FormEvent } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { LoadingSpinner, ErrorBanner } from "../components/Feedback";

interface AdminProfile {
  username: string;
  name: string;
  email: string | null;
  role: string | null;
  is_super_admin: boolean;
  telegram_id: number;
  permissions: string[];
}

export function SettingsPage() {
  const { lang } = useI18n();
  const isAmharic = lang === "am";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Profile Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setPageError(null);
      const data = await api.get<AdminProfile>("/api/v1/auth/profile");
      setProfile(data);
      setName(data.name || "");
      setUsername(data.username || "");
      setEmail(data.email || "");
    } catch (err) {
      setPageError(
        err instanceof ApiRequestError
          ? err.message
          : isAmharic
          ? "የመለያ መረጃን መጫን አልተቻለም።"
          : "Failed to load admin profile information.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setProfileError(isAmharic ? "እባክዎን የተጠቃሚ ስም ያስገቡ።" : "Username cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError(null);
      setProfileSuccess(null);

      const updated = await api.put<AdminProfile>("/api/v1/auth/profile", {
        name: name.trim(),
        username: username.trim(),
        email: email.trim() || null,
      });

      setProfile(updated);
      setProfileSuccess(
        isAmharic
          ? "የአስተዳዳሪ መረጃ በተሳካ ሁኔታ ተሻሽሏል!"
          : "Profile details updated successfully!",
      );
    } catch (err) {
      setProfileError(
        err instanceof ApiRequestError
          ? err.message
          : isAmharic
          ? "መረጃውን ማሻሻል አልተቻለም።"
          : "Failed to update profile details.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError(
        isAmharic ? "እባክዎን የአሁኑን የይለፍ ቃል ያስገቡ።" : "Please enter your current password.",
      );
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(
        isAmharic
          ? "አዲሱ የይለፍ ቃል ቢያንስ 8 ፊደላት መሆን አለበት።"
          : "New password must be at least 8 characters long.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        isAmharic
          ? "አዲሱ የይለፍ ቃል እና ማረጋገጫው አይዛመዱም።"
          : "New password and confirmation do not match.",
      );
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post<{ message: string; success: boolean }>(
        "/api/v1/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      );

      setPasswordSuccess(
        isAmharic
          ? "የይለፍ ቃልዎ በተሳካ ሁኔታ ተለውጧል! ለወደፊቱ በዚህ አዲስ የይለፍ ቃል ይግቡ።"
          : res.message || "Password changed successfully! Please use it for future sign-ins.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError
          ? err.message
          : isAmharic
          ? "የይለፍ ቃል መቀየር አልተቻለም።"
          : "Failed to change password. Please verify current password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="screen" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="screen">
        <ErrorBanner message={pageError} onRetry={loadProfile} />
      </div>
    );
  }

  return (
    <div className="screen">
      <div>
        <h1 className="page-title">{isAmharic ? "የመለያ ቅንብሮች እና ደህንነት" : "Account Settings & Security"}</h1>
        <p className="page-subtitle">
          {isAmharic
            ? "የአስተዳዳሪ መረጃዎን፣ የተጠቃሚ ስም እና የይለፍ ቃል በቀጥታ ያስተዳድሩ"
            : "Manage administrator profile, credentials, and password with real-time database persistence."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Profile Card */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
              }}
            >
              {name ? name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff" }}>
                {name || (isAmharic ? "አስተዳዳሪ" : "Administrator")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {profile?.role || "SUPER_ADMIN"}
                </span>
                <span
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  ● {isAmharic ? "ንቁ መለያ" : "Active"}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="field">
              <label htmlFor="admin-name">{isAmharic ? "የአስተዳዳሪ ሙሉ ስም" : "Full / Display Name"}</label>
              <input
                id="admin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAmharic ? "ለምሳሌ፡ Digaf Admin" : "e.g. Digaf Administrator"}
              />
            </div>

            <div className="field">
              <label htmlFor="admin-username">
                {isAmharic ? "የመግቢያ የተጠቃሚ ስም (Username)" : "Login Username"}
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={profile?.telegram_id !== 0}
              />
              {profile?.telegram_id !== 0 && (
                <span style={{ fontSize: "11px", color: "var(--tg-hint, #94a3b8)", marginTop: "2px" }}>
                  {isAmharic
                    ? "ይህ መለያ ከቴሌግራም መለያ ጋር የተገናኘ ነው።"
                    : "This admin account is bound to Telegram ID."}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="admin-email">{isAmharic ? "የኢሜይል አድራሻ (አማራጭ)" : "Email Address (Optional)"}</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@digaf.et"
              />
            </div>

            {profileSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#34d399",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                ✓ {profileSuccess}
              </div>
            )}

            {profileError && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#f87171",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                ✕ {profileError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
              style={{ marginTop: "4px" }}
            >
              {savingProfile ? (
                <span>{isAmharic ? "በማስቀመጥ ላይ..." : "Saving Profile..."}</span>
              ) : (
                <span>{isAmharic ? "መረጃውን አስቀምጥ" : "Save Profile Details"}</span>
              )}
            </button>
          </form>

          {profile?.permissions && profile.permissions.length > 0 && (
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "12px", color: "var(--tg-hint, #94a3b8)", fontWeight: 700, marginBottom: "8px" }}>
                {isAmharic ? "የተፈቀዱ ስልጣኖች" : "ACTIVE PERMISSIONS"} ({profile.permissions.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {profile.permissions.slice(0, 8).map((p) => (
                  <span
                    key={p}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#cbd5e1",
                    }}
                  >
                    {p}
                  </span>
                ))}
                {profile.permissions.length > 8 && (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#34d399",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    +{profile.permissions.length - 8} {isAmharic ? "ተጨማሪ" : "more"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Password Management Card */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🔒
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#ffffff" }}>
                {isAmharic ? "የይለፍ ቃል መቀየሪያ" : "Change Password"}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--tg-hint, #94a3b8)" }}>
                {isAmharic
                  ? "የአስተዳዳሪ ይለፍ ቃልን በደህንነት ይቀይሩ"
                  : "Update your admin console login password"}
              </div>
            </div>
          </div>

          <p
            style={{
              fontSize: "12.5px",
              color: "#94a3b8",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "18px",
              lineHeight: 1.5,
            }}
          >
            ℹ️ {isAmharic
              ? "የይለፍ ቃልዎ በPBKDF2-HMAC-SHA256 ምስጠራ በዳታቤዝ ውስጥ ይቀመጣል። ከተቀየረ በኋላ ወዲያውኑ ተግባራዊ ይሆናል።"
              : "Passwords are salted and cryptographically hashed with PBKDF2. Changes take effect immediately."}
          </p>

          <form onSubmit={handleChangePassword}>
            <div className="field">
              <label htmlFor="current-password">
                {isAmharic ? "የአሁኑ የይለፍ ቃል" : "Current Password"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                  }}
                >
                  {showCurrent ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="new-password">
                {isAmharic ? "አዲስ የይለፍ ቃል (ቢያንስ 8 ፊደላት)" : "New Password (min. 8 characters)"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                  }}
                >
                  {showNew ? "👁️" : "🙈"}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div style={{ marginTop: "4px", fontSize: "11.5px", display: "flex", gap: "8px" }}>
                  <span style={{ color: newPassword.length >= 8 ? "#34d399" : "#f87171" }}>
                    {newPassword.length >= 8 ? "✓" : "✕"} {isAmharic ? "ቢያንስ 8 ፊደላት" : "8+ characters"}
                  </span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirm-password">
                {isAmharic ? "አዲሱን የይለፍ ቃል ያረጋግጡ" : "Confirm New Password"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                  }}
                >
                  {showConfirm ? "👁️" : "🙈"}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div style={{ marginTop: "4px", fontSize: "11.5px" }}>
                  <span style={{ color: confirmPassword === newPassword ? "#34d399" : "#f87171" }}>
                    {confirmPassword === newPassword
                      ? (isAmharic ? "✓ የይለፍ ቃሎች ተዛምደዋል" : "✓ Passwords match")
                      : (isAmharic ? "✕ የይለፍ ቃሎች አልተዛመዱም" : "✕ Passwords do not match")}
                  </span>
                </div>
              )}
            </div>

            {passwordSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#34d399",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                ✓ {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#f87171",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                ✕ {passwordError}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="btn btn-primary"
              style={{
                marginTop: "6px",
                opacity: (changingPassword || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword) ? 0.6 : 1,
              }}
            >
              {changingPassword ? (
                <span>{isAmharic ? "በመቀየር ላይ..." : "Updating Password..."}</span>
              ) : (
                <span>{isAmharic ? "የይለፍ ቃል ቀይር" : "Update Password"}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
