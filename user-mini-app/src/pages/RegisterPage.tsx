import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Language } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { hapticError, hapticSuccess, hideMainButton, setMainButton } from "../services/telegram";
import type { City, Job, RegistrationCreatePayload, ReferralType, Subcity, Woreda } from "../types";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { LoadingSpinner, ErrorBanner, SuccessCheck } from "../components/Feedback";
import { ReviewRow } from "../components/ReviewRow";

// Step 0 = Language chooser, then 1-4 as before
type Step = 0 | 1 | 2 | 3 | 4;

interface FormData {
  first_name: string;
  second_name: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "";
  national_id: string;
  city_id: string;
  subcity_id: string;
  woreda_id: string;
  job_id: string;
  employment_type: "EMPLOYEE" | "SELF_EMPLOYED" | "";
  referral_type: ReferralType;
  referral_name: string;
  // Document uploads
  employee_id_file: File | null;
  business_license_file: File | null;
  document_name?: string | null;
  document_data?: string | null;
  doc_skipped: boolean;
}

const EMPTY_FORM: FormData = {
  first_name: "",
  second_name: "",
  phone: "",
  gender: "",
  national_id: "",
  city_id: "",
  subcity_id: "",
  woreda_id: "",
  job_id: "",
  employment_type: "",
  referral_type: "NONE",
  referral_name: "",
  employee_id_file: null,
  business_license_file: null,
  document_name: null,
  document_data: null,
  doc_skipped: false,
};

export function RegisterPage({
  onNavigate,
  isActive = true,
}: {
  onNavigate?: (view: any) => void;
  isActive?: boolean;
} = {}) {
  const { t, setLang } = useI18n();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [cities, setCities] = useState<City[]>([]);
  const [subcities, setSubcities] = useState<Subcity[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJobName, setSubmittedJobName] = useState<string | null>(null);
  const [showDocWarningModal, setShowDocWarningModal] = useState(false);

  // Camera / file input refs
  const employeeFileRef = useRef<HTMLInputElement>(null);
  const employeeCameraRef = useRef<HTMLInputElement>(null);
  const businessFileRef = useRef<HTMLInputElement>(null);
  const businessCameraRef = useRef<HTMLInputElement>(null);

  const [loadingSubcities, setLoadingSubcities] = useState(false);
  const [loadingWoredas, setLoadingWoredas] = useState(false);

  function handleFileSelected(file: File, type: "EMPLOYEE" | "SELF_EMPLOYED") {
    if (type === "EMPLOYEE") {
      update("employee_id_file", file);
    } else {
      update("business_license_file", file);
    }
    update("document_name", file.name);

    // Read as Base64 Data URL so the file can be persisted and viewed by admin
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      update("document_data", result);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    Promise.all([api.get<City[]>("/api/v1/cities"), api.get<Job[]>("/api/v1/jobs/active")])
      .then(([cityList, jobList]) => {
        // Sort cities alphabetically like normal (natural alphabetical order)
        const sortedCities = [...cityList].sort((a, b) => a.name.localeCompare(b.name));
        setCities(sortedCities);
        setJobs(jobList);
        setDataLoaded(true);
        // Default city is kept empty so user chooses their city
      })
      .catch((err) => {
        setLoadError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
        setDataLoaded(true);
      });
  }, [t.common.somethingWrong]);

  useEffect(() => {
    if (!form.city_id) {
      setSubcities([]);
      return;
    }
    setLoadingSubcities(true);
    api
      .get<Subcity[]>(`/api/v1/cities/${form.city_id}/subcities`)
      .then(setSubcities)
      .catch(() => setSubcities([]))
      .finally(() => setLoadingSubcities(false));
  }, [form.city_id]);

  useEffect(() => {
    if (!form.subcity_id) {
      setWoredas([]);
      return;
    }
    setLoadingWoredas(true);
    api
      .get<Woreda[]>(`/api/v1/subcities/${form.subcity_id}/woredas`)
      .then(setWoredas)
      .catch(() => setWoredas([]))
      .finally(() => setLoadingWoredas(false));
  }, [form.subcity_id]);

  useEffect(() => {
    if (jobs.length > 0 && !form.job_id) {
      const defaultJob = jobs.find((j) =>
        form.employment_type === "SELF_EMPLOYED"
          ? j.name.toLowerCase().includes("self")
          : j.name.toLowerCase().includes("employ") && !j.name.toLowerCase().includes("self")
      ) || jobs[0];
      setForm((f) => ({ ...f, job_id: defaultJob?.id || "" }));
    }
  }, [jobs, form.job_id, form.employment_type]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => {
      const next = {
        ...f,
        [key]: value,
        ...(key === "city_id" ? { subcity_id: "", woreda_id: "" } : {}),
        ...(key === "subcity_id" ? { woreda_id: "" } : {}),
      } as FormData;

      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(current: Step): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (current === 1) {
      const nameRegex = /^[\p{L}\s\-']{2,100}$/u;

      const fName = form.first_name.trim();
      if (!fName) {
        next.first_name = t.register.validationRequired;
      } else if (!nameRegex.test(fName) || /\d/.test(fName)) {
        next.first_name = t.register.validationNameLetters;
      }

      const sName = form.second_name.trim();
      if (!sName) {
        next.second_name = t.register.validationRequired;
      } else if (!nameRegex.test(sName) || /\d/.test(sName)) {
        next.second_name = t.register.validationNameLetters;
      }

      if (!form.gender) next.gender = t.register.validationRequired;

      // National ID: must be exactly 16 digits
      if (!form.national_id.trim()) {
        next.national_id = t.register.validationRequired;
      } else {
        const cleanId = form.national_id.replace(/[\s-]/g, "");
        if (!/^\d{16}$/.test(cleanId)) {
          next.national_id = t.register.validationNationalId16;
        }
      }

      // Ethiopian phone: must be valid 9-digit mobile number starting with 9 (Ethio Telecom) or 7 (Safaricom)
      const cleanPhone = form.phone.replace(/\D/g, "");
      if (!cleanPhone) {
        next.phone = t.register.validationRequired;
      } else if (!/^[79]\d{8}$/.test(cleanPhone)) {
        next.phone = t.register.validationPhone;
      }
    }
    if (current === 2) {
      if (!form.city_id) next.city_id = t.register.validationRequired;
      if (!form.subcity_id) next.subcity_id = t.register.validationRequired;
      if (!form.woreda_id) next.woreda_id = t.register.validationRequired;
    }
    if (current === 3) {
      if (!form.employment_type) next.employment_type = t.register.validationRequired;
      if (form.referral_type !== "NONE" && !form.referral_name.trim()) {
        next.referral_name = t.register.validationRequired;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step as Step)) return;
    if (step === 3) {
      const hasDoc = form.employment_type === "EMPLOYEE" ? !!form.employee_id_file : !!form.business_license_file;
      if (!hasDoc && !form.doc_skipped) {
        setShowDocWarningModal(true);
        return;
      }
    }
    setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    setStep((s) => (s - 1) as Step);
  }

  function handlePhoneChange(val: string) {
    if (!val) {
      update("phone", "");
      return;
    }
    // Extract only digits
    let digits = val.replace(/\D/g, "");
    // If pasted with country code 251, strip it
    if (digits.startsWith("251")) {
      digits = digits.slice(3);
    }
    // If entered with leading 0 (e.g. 09... or 07...), strip the 0
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    // Limit to exactly 9 digits
    digits = digits.slice(0, 9);
    update("phone", digits);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const matchedJob = jobs.find((j) =>
        form.employment_type === "SELF_EMPLOYED"
          ? j.name.toLowerCase().includes("self")
          : j.name.toLowerCase().includes("employ") && !j.name.toLowerCase().includes("self")
      ) || jobs[0];
      const resolvedJobId = matchedJob?.id || form.job_id || jobs[0]?.id;
      if (!form.employment_type) {
        setSubmitError(t.common.somethingWrong);
        return;
      }

      const cleanDigits = form.phone.replace(/\D/g, "");
      const fullPhoneNumber = `+251${cleanDigits}`;

      const payload: RegistrationCreatePayload = {
        first_name: form.first_name.trim(),
        second_name: form.second_name.trim(),
        phone: fullPhoneNumber,
        city_id: form.city_id,
        subcity_id: form.subcity_id,
        woreda_id: form.woreda_id,
        job_id: resolvedJobId || form.job_id || jobs[0]?.id || "",
        employment_type: form.employment_type as "EMPLOYEE" | "SELF_EMPLOYED",
        gender: form.gender || undefined,
        national_id: form.national_id ? form.national_id.replace(/[\s-]/g, "") || undefined : undefined,
        referral_type: form.referral_type,
        referral_name: form.referral_name.trim() || undefined,
        document_name: form.document_name || undefined,
        document_data: form.document_data || undefined,
      };

      if (form.document_data) {
        try {
          localStorage.setItem(
            `reg_doc_${fullPhoneNumber}`,
            JSON.stringify({
              fileName: form.document_name,
              fileData: form.document_data,
              type: form.employment_type,
              timestamp: Date.now(),
            })
          );
        } catch {}
      }

      const created = await api.post<{ job: Job }>("/api/v1/registrations", payload);
      setSubmittedJobName(created?.job?.name || (form.employment_type === "SELF_EMPLOYED" ? "Self-employed" : "Employee"));
      hapticSuccess();
    } catch (err) {
      hapticError();
      if (err instanceof ApiRequestError && err.code === "duplicate_registration") {
        setSubmitError(t.register.duplicateError);
      } else {
        setSubmitError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isActive || submittedJobName || step === 0) {
      hideMainButton();
      return () => {};
    }
    if (step < 4) {
      return setMainButton(t.common.next, goNext, { enabled: true });
    }
    return setMainButton(t.register.submitRegistration, submit, {
      enabled: !submitting,
      showProgress: submitting,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, step, form, submitting, submittedJobName]);

  const cityName = useMemo(() => cities.find((c) => c.id === form.city_id)?.name ?? "", [cities, form.city_id]);
  const subcityName = useMemo(
    () => subcities.find((s) => s.id === form.subcity_id)?.name ?? "",
    [subcities, form.subcity_id],
  );
  const woredaName = useMemo(
    () => woredas.find((w) => w.id === form.woreda_id)?.name ?? "",
    [woredas, form.woreda_id],
  );

  const selectedJobDisplay = useMemo(() => {
    if (form.employment_type === "EMPLOYEE") return t.register.employmentEmployee;
    if (form.employment_type === "SELF_EMPLOYED") return t.register.employmentSelfEmployed;
    return "";
  }, [form.employment_type, t]);

  const referralDisplay = useMemo(() => {
    if (form.referral_type === "ADMIN") return `${t.register.referralAdmin}: ${form.referral_name}`;
    if (form.referral_type === "PERSON") return `${t.register.referralPerson}: ${form.referral_name}`;
    return t.register.referralNone;
  }, [form.referral_type, form.referral_name, t]);

  if (loadError) {
    return (
      <div className="screen">
        <ErrorBanner message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (submittedJobName) {
    return (
      <div className="screen">
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <SuccessCheck />
          <h1 className="page-title">{t.register.success}</h1>
          <p className="page-subtitle">
            {t.register.successBody.replace("{job}", submittedJobName)}
          </p>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSubmittedJobName(null);
                setStep(0);
                setForm(EMPTY_FORM);
                if (onNavigate) onNavigate("registrations");
                else window.location.search = "?view=registrations";
              }}
            >
              {t.registrations.title}
            </button>
            <button
              type="button"
              className="btn btn-back"
              onClick={() => {
                setSubmittedJobName(null);
                setStep(0);
                setForm(EMPTY_FORM);
                if (onNavigate) onNavigate("home");
                else window.location.search = "";
              }}
            >
              {t.common.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 0: Language Selection ────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="screen">
        <div className="step-card">
          <div style={{ textAlign: "center" }}>
            <div className="hero-badge" style={{ marginBottom: 12 }}>
              🌐 Language / ቋንቋ
            </div>
            <h1 className="page-title">{t.register.chooseLanguageTitle}</h1>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* English */}
          <button
            type="button"
            className="btn btn-next"
            style={{ fontSize: 16, padding: "14px 20px" }}
            onClick={() => {
              setLang("en" as Language);
              setStep(1);
            }}
          >
            English
          </button>

          {/* Amharic */}
          <button
            type="button"
            className="btn btn-back"
            style={{
              fontSize: 16,
              padding: "14px 20px",
              border: "1.5px solid var(--color-primary, #3b82f6)",
              color: "var(--color-primary, #3b82f6)",
            }}
            onClick={() => {
              setLang("am" as Language);
              setStep(1);
            }}
          >
            አማርኛ
          </button>
        </div>
      </div>
    );
  }

  if (!dataLoaded && !loadError) {
    return (
      <div className="screen">
        <LoadingSpinner />
      </div>
    );
  }

  // ── STEP 1-4: Registration form ───────────────────────────────────────────
  const formStep = step as 1 | 2 | 3 | 4;

  return (
    <div className="screen">
      <div className="step-card">
        <div>
          <div className="hero-badge">Step {formStep} of 4</div>
          <h1 className="page-title">{t.register.title}</h1>
          <p className="page-subtitle">
            {formStep === 1 && "Share your basic details to begin your registration."}
            {formStep === 2 && "Choose the location that matches your area."}
            {formStep === 3 && "Select your job type and referral details."}
            {formStep === 4 && "Review everything before submitting your application."}
          </p>
        </div>
      </div>
      <Stepper step={formStep} />

      {formStep === 1 && (
        <div className="card">
          <TextField
            label={t.register.firstName}
            value={form.first_name}
            error={errors.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
          <TextField
            label={t.register.secondName}
            value={form.second_name}
            error={errors.second_name}
            onChange={(e) => update("second_name", e.target.value)}
          />
          <SelectField
            label={t.register.gender}
            value={form.gender}
            placeholder={t.register.selectPlaceholder}
            error={errors.gender}
            options={[
              { value: "MALE", label: t.register.genderMale },
              { value: "FEMALE", label: t.register.genderFemale },
            ]}
            onChange={(v) => update("gender", v as FormData["gender"])}
          />
          {/* National ID: exactly 16 digits */}
          <TextField
            label={t.register.nationalId}
            placeholder={t.register.nationalIdHint}
            value={form.national_id}
            error={errors.national_id}
            inputMode="numeric"
            maxLength={16}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 16);
              update("national_id", val);
            }}
          />
          {/* Ethiopian Phone Number with locked +251 prefix */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--tg-text, #f8fafc)", marginBottom: 6 }}>
              {t.register.phone}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: 10,
                border: errors.phone ? "1.5px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.14)",
                background: "rgba(15, 23, 42, 0.6)",
                overflow: "hidden",
                transition: "border-color 0.2s ease",
              }}
            >
              {/* Locked Prefix */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRight: "1px solid rgba(255, 255, 255, 0.12)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#34d399",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                <span>🇪🇹</span>
                <span>+251</span>
              </div>

              {/* Number Input (9 digits) */}
              <input
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder={t.register.phoneHint}
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "inherit",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              />

              {/* Clear button if typed */}
              {form.phone && (
                <button
                  type="button"
                  onClick={() => update("phone", "")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--tg-hint, #94a3b8)",
                    cursor: "pointer",
                    padding: "0 12px",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Network Indicator / Info Badge */}
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
              <div>
                {form.phone.startsWith("9") && (
                  <span style={{ color: "#34d399", fontWeight: 600 }}>
                    🟢 Ethio Telecom (09...)
                  </span>
                )}
                {form.phone.startsWith("7") && (
                  <span style={{ color: "#f87171", fontWeight: 600 }}>
                    🔴 Safaricom Ethiopia (07...)
                  </span>
                )}
                {!form.phone.startsWith("9") && !form.phone.startsWith("7") && form.phone.length > 0 && (
                  <span style={{ color: "#fbbf24", fontWeight: 500 }}>
                    ⚠️ Must begin with 9 (Ethio Telecom) or 7 (Safaricom)
                  </span>
                )}
                {form.phone.length === 0 && (
                  <span style={{ color: "var(--tg-hint, #94a3b8)" }}>
                    Ethio Telecom (9...) or Safaricom (7...)
                  </span>
                )}
              </div>
              <span style={{ color: form.phone.length === 9 ? "#34d399" : "var(--tg-hint, #94a3b8)", fontWeight: 600 }}>
                {form.phone.length}/9 digits
              </span>
            </div>

            {errors.phone && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
                {errors.phone}
              </div>
            )}
          </div>
        </div>
      )}

      {formStep === 2 && (
        <div className="card">
          <SelectField
            label={t.register.city}
            value={form.city_id}
            placeholder={t.register.selectPlaceholder}
            error={errors.city_id}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => update("city_id", v)}
          />
          <SelectField
            label={loadingSubcities ? `${t.register.subcity} (Loading...)` : t.register.subcity}
            value={form.subcity_id}
            placeholder={loadingSubcities ? "Loading subcities..." : t.register.selectPlaceholder}
            error={errors.subcity_id}
            disabled={!form.city_id || loadingSubcities}
            options={subcities.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => update("subcity_id", v)}
          />
          <SelectField
            label={loadingWoredas ? `${t.register.woreda} (Loading...)` : t.register.woreda}
            value={form.woreda_id}
            placeholder={loadingWoredas ? "Loading woredas..." : t.register.selectPlaceholder}
            error={errors.woreda_id}
            disabled={!form.subcity_id || loadingWoredas}
            options={woredas.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(v) => update("woreda_id", v)}
          />
        </div>
      )}

      {formStep === 3 && (
        <div className="card">
          <SelectField
            label={t.register.job}
            value={form.employment_type}
            placeholder={t.register.selectPlaceholder}
            error={errors.employment_type}
            options={[
              { value: "EMPLOYEE", label: t.register.employmentEmployee },
              { value: "SELF_EMPLOYED", label: t.register.employmentSelfEmployed },
            ]}
            onChange={(v) => {
              const matchedJob = jobs.find((j) =>
                v === "SELF_EMPLOYED"
                  ? j.name.toLowerCase().includes("self")
                  : j.name.toLowerCase().includes("employ") && !j.name.toLowerCase().includes("self")
              ) || jobs[0];
              setForm((f) => ({
                ...f,
                employment_type: v as FormData["employment_type"],
                job_id: matchedJob ? matchedJob.id : f.job_id,
                employee_id_file: null,
                business_license_file: null,
                doc_skipped: false,
              }));
              setErrors((e) => ({ ...e, employment_type: undefined }));
            }}
          />

          {/* Document upload section - shows after employment type is selected */}
          {form.employment_type === "EMPLOYEE" && (
            <div
              style={{
                marginTop: 16,
                padding: "16px",
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.06)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--tg-text, #e2e8f0)" }}>
                📄 {t.register.uploadEmployeeId}
              </div>
              <p style={{ fontSize: 12, color: "var(--tg-hint, #94a3b8)", margin: "0 0 12px" }}>
                {t.register.uploadEmployeeIdHint}
              </p>

              {form.employee_id_file ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#34d399", fontWeight: 600 }}>{form.employee_id_file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      update("employee_id_file", null);
                      update("document_name", null);
                      update("document_data", null);
                    }}
                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Upload from gallery/file */}
                  <input
                    ref={employeeFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture={undefined}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file, "EMPLOYEE");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => employeeFileRef.current?.click()}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1.5px dashed rgba(59, 130, 246, 0.5)",
                      background: "rgba(59, 130, 246, 0.08)",
                      color: "#60a5fa",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    📎 {t.register.uploadFile}
                  </button>

                  {/* Take photo with camera */}
                  <input
                    ref={employeeCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file, "EMPLOYEE");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => employeeCameraRef.current?.click()}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1.5px dashed rgba(59, 130, 246, 0.5)",
                      background: "rgba(59, 130, 246, 0.08)",
                      color: "#60a5fa",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    📷 {t.register.takePhoto}
                  </button>
                </div>
              )}

              {/* Skip warning */}
              {!form.employee_id_file && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 7,
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontSize: 12,
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span>⚠️</span>
                  <span>{t.register.docSkipWarning}</span>
                </div>
              )}
            </div>
          )}

          {form.employment_type === "SELF_EMPLOYED" && (
            <div
              style={{
                marginTop: 16,
                padding: "16px",
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.06)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--tg-text, #e2e8f0)" }}>
                🏢 {t.register.uploadBusinessLicense}
              </div>
              <p style={{ fontSize: 12, color: "var(--tg-hint, #94a3b8)", margin: "0 0 12px" }}>
                {t.register.uploadBusinessLicenseHint}
              </p>

              {form.business_license_file ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#34d399", fontWeight: 600 }}>{form.business_license_file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      update("business_license_file", null);
                      update("document_name", null);
                      update("document_data", null);
                    }}
                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    ref={businessFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture={undefined}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file, "SELF_EMPLOYED");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => businessFileRef.current?.click()}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1.5px dashed rgba(168, 85, 247, 0.5)",
                      background: "rgba(168, 85, 247, 0.08)",
                      color: "#c084fc",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    📎 {t.register.uploadFile}
                  </button>

                  <input
                    ref={businessCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file, "SELF_EMPLOYED");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => businessCameraRef.current?.click()}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1.5px dashed rgba(168, 85, 247, 0.5)",
                      background: "rgba(168, 85, 247, 0.08)",
                      color: "#c084fc",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    📷 {t.register.takePhoto}
                  </button>
                </div>
              )}

              {!form.business_license_file && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 7,
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontSize: 12,
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span>⚠️</span>
                  <span>{t.register.docSkipWarning}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--color-border)" }}>
            <SelectField
              label={t.register.referral}
              value={form.referral_type}
              placeholder=""
              options={[
                { value: "NONE", label: t.register.referralNone },
                { value: "ADMIN", label: t.register.referralAdmin },
                { value: "PERSON", label: t.register.referralPerson },
              ]}
              onChange={(v) => update("referral_type", v as ReferralType)}
            />

            {form.referral_type === "ADMIN" && (
              <TextField
                label={t.register.referralAdminLabel}
                placeholder="Enter Admin Name or Code"
                value={form.referral_name}
                error={errors.referral_name}
                onChange={(e) => update("referral_name", e.target.value)}
              />
            )}

            {form.referral_type === "PERSON" && (
              <TextField
                label={t.register.referralPersonLabel}
                placeholder={t.register.referralPersonHint}
                value={form.referral_name}
                error={errors.referral_name}
                onChange={(e) => update("referral_name", e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {formStep === 4 && (
        <div className="card">
          <p className="page-subtitle" style={{ marginBottom: 12 }}>{t.register.reviewIntro}</p>
          <ReviewRow label={t.register.firstName} value={form.first_name} />
          <ReviewRow label={t.register.secondName} value={form.second_name} />
          <ReviewRow
            label={t.register.gender}
            value={form.gender === "MALE" ? t.register.genderMale : form.gender === "FEMALE" ? t.register.genderFemale : ""}
          />
          {form.national_id && (
            <ReviewRow label={t.register.nationalId} value={form.national_id} />
          )}
          <ReviewRow
            label={t.register.phone}
            value={`+251 ${form.phone.slice(0, 3)} ${form.phone.slice(3, 6)} ${form.phone.slice(6)} ${
              form.phone.startsWith("9") ? "(Ethio Telecom)" : form.phone.startsWith("7") ? "(Safaricom)" : ""
            }`}
          />
          <ReviewRow label={t.register.city} value={cityName} />
          <ReviewRow label={t.register.subcity} value={subcityName} />
          <ReviewRow label={t.register.woreda} value={woredaName} />
          <ReviewRow label={t.register.job} value={selectedJobDisplay} />
          {form.employment_type === "EMPLOYEE" && (
            <ReviewRow
              label={t.register.uploadEmployeeId}
              value={form.employee_id_file ? `✅ ${form.employee_id_file.name}` : `⚠️ ${t.register.docNotUploaded}`}
            />
          )}
          {form.employment_type === "SELF_EMPLOYED" && (
            <ReviewRow
              label={t.register.uploadBusinessLicense}
              value={form.business_license_file ? `✅ ${form.business_license_file.name}` : `⚠️ ${t.register.docNotUploaded}`}
            />
          )}
          <ReviewRow label={t.register.referral} value={referralDisplay} />
          {submitError && <ErrorBanner message={submitError} />}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="nav-btn-row">
        {formStep > 1 ? (
          <button
            type="button"
            className="btn btn-back"
            onClick={goBack}
            disabled={submitting}
          >
            {t.register.btnBack}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-back"
            onClick={() => setStep(0)}
          >
            🌐 Language
          </button>
        )}

        {formStep < 4 ? (
          <button
            type="button"
            className="btn btn-next"
            onClick={goNext}
          >
            {formStep === 1 && "Next: Location ›"}
            {formStep === 2 && "Next: Job & Referral ›"}
            {formStep === 3 && "Next: Review Details ›"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-next"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "⏳ Submitting…" : t.register.btnSubmit}
          </button>
        )}
      </div>

      {/* Warning Modal when continuing without uploading documents */}
      {showDocWarningModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 380,
              width: "100%",
              padding: "24px 20px",
              textAlign: "center",
              background: "var(--color-surface, #1e293b)",
              border: "1.5px solid #f59e0b",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 8 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#fbbf24" }}>
              {form.employment_type === "EMPLOYEE" ? "Employee ID Not Uploaded" : "Business License Not Uploaded"}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--tg-text, #e2e8f0)", lineHeight: 1.5, margin: "0 0 16px" }}>
              {form.employment_type === "EMPLOYEE"
                ? "Without uploading this document, your application may be rejected by the admin."
                : "Without uploading your renewed business license, your application may be rejected by the admin."}
              <br />
              <span style={{ fontSize: 12, color: "var(--tg-hint, #94a3b8)", marginTop: 6, display: "inline-block" }}>
                ይህንን መረጃ ሳያቀርቡ ከቀጠሉ ማመልከቻዎ ውድቅ ሊሆን ይችላል።
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowDocWarningModal(false)}
                style={{ width: "100%", padding: "12px", fontWeight: 700, fontSize: 13.5 }}
              >
                📎 Upload Document Now
              </button>
              <button
                type="button"
                onClick={() => {
                  update("doc_skipped", true);
                  setShowDocWarningModal(false);
                  setStep(4);
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "var(--tg-hint, #94a3b8)",
                  padding: "10px",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Continue without document ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Profile", "Location", "Job", "Review"];

  return (
    <div className="stepper">
      {labels.map((label, index) => {
        const number = index + 1;
        const state = number === step ? "active" : number < step ? "done" : "";
        return (
          <div key={number} className="stepper-item">
            <div className={`stepper-dot ${state}`}>{state === "done" ? "✓" : number}</div>
            <span className={`stepper-label ${state}`}>{label}</span>
            {index < labels.length - 1 && (
              <div className={`stepper-line ${number < step ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
