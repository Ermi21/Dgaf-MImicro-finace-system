import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { hapticError, hapticSuccess, hideMainButton, setMainButton } from "../services/telegram";
import type { City, Job, RegistrationCreatePayload, ReferralType, Subcity, Woreda } from "../types";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { LoadingSpinner, ErrorBanner, SuccessCheck } from "../components/Feedback";
import { ReviewRow } from "../components/ReviewRow";

type Step = 1 | 2 | 3 | 4;

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
};

export function RegisterPage({
  onNavigate,
  isActive = true,
}: {
  onNavigate?: (view: any) => void;
  isActive?: boolean;
} = {}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
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

  useEffect(() => {
    Promise.all([api.get<City[]>("/api/v1/cities"), api.get<Job[]>("/api/v1/jobs/active")])
      .then(([cityList, jobList]) => {
        setCities(cityList);
        setJobs(jobList);
        setDataLoaded(true);
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
    api
      .get<Subcity[]>(`/api/v1/cities/${form.city_id}/subcities`)
      .then(setSubcities)
      .catch(() => setSubcities([]));
  }, [form.city_id]);

  useEffect(() => {
    if (!form.subcity_id) {
      setWoredas([]);
      return;
    }
    api
      .get<Woreda[]>(`/api/v1/subcities/${form.subcity_id}/woredas`)
      .then(setWoredas)
      .catch(() => setWoredas([]));
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
      // Name must be letters only (supports Latin and Ethiopian Ge'ez/Amharic script), spaces, hyphens, and apostrophes
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

      if (form.national_id && form.national_id.trim()) {
        const cleanId = form.national_id.replace(/[\s-]/g, "");
        if (!/^\d+$/.test(cleanId) || cleanId.length > 16) {
          next.national_id = t.register.validationNationalId;
        }
      }

      if (!form.phone.trim()) {
        next.phone = t.register.validationRequired;
      } else if (!/^(\+?251|0)?[79]\d{8}$/.test(form.phone.trim())) {
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
    if (!validateStep(step)) return;
    setStep((s) => (s + 1) as Step);
  }

  function goBack() {
    setStep((s) => (s - 1) as Step);
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
      const payload: RegistrationCreatePayload = {
        first_name: form.first_name.trim(),
        second_name: form.second_name.trim(),
        phone: form.phone.trim(),
        city_id: form.city_id,
        subcity_id: form.subcity_id,
        woreda_id: form.woreda_id,
        job_id: resolvedJobId || form.job_id || jobs[0]?.id || "",
        employment_type: form.employment_type as "EMPLOYEE" | "SELF_EMPLOYED",
        gender: form.gender || undefined,
        national_id: form.national_id ? form.national_id.replace(/[\s-]/g, "") || undefined : undefined,
        referral_type: form.referral_type,
        referral_name: form.referral_name.trim() || undefined,
      };
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
    if (!isActive || submittedJobName) {
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
                setStep(1);
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
                setStep(1);
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

  if (!dataLoaded && !loadError) {
    return (
      <div className="screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="step-card">
        <div>
          <div className="hero-badge">Step {step} of 4</div>
          <h1 className="page-title">{t.register.title}</h1>
          <p className="page-subtitle">
            {step === 1 && "Share your basic details to begin your registration."}
            {step === 2 && "Choose the location that matches your area."}
            {step === 3 && "Select your job type and referral details."}
            {step === 4 && "Review everything before submitting your application."}
          </p>
        </div>
      </div>
      <Stepper step={step} />

      {step === 1 && (
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
          <TextField
            label={t.register.nationalId}
            placeholder={t.register.nationalIdHint}
            value={form.national_id}
            error={errors.national_id}
            inputMode="numeric"
            maxLength={19}
            onChange={(e) => update("national_id", e.target.value)}
          />
          <TextField
            label={t.register.phone}
            placeholder={t.register.phoneHint}
            value={form.phone}
            error={errors.phone}
            inputMode="tel"
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      )}

      {step === 2 && (
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
            label={t.register.subcity}
            value={form.subcity_id}
            placeholder={t.register.selectPlaceholder}
            error={errors.subcity_id}
            disabled={!form.city_id}
            options={subcities.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) => update("subcity_id", v)}
          />
          <SelectField
            label={t.register.woreda}
            value={form.woreda_id}
            placeholder={t.register.selectPlaceholder}
            error={errors.woreda_id}
            disabled={!form.subcity_id}
            options={woredas.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(v) => update("woreda_id", v)}
          />
        </div>
      )}

      {step === 3 && (
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
              }));
              setErrors((e) => ({ ...e, employment_type: undefined }));
            }}
          />

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

      {step === 4 && (
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
          <ReviewRow label={t.register.phone} value={form.phone} />
          <ReviewRow label={t.register.city} value={cityName} />
          <ReviewRow label={t.register.subcity} value={subcityName} />
          <ReviewRow label={t.register.woreda} value={woredaName} />
          <ReviewRow label={t.register.job} value={selectedJobDisplay} />
          <ReviewRow label={t.register.referral} value={referralDisplay} />
          {submitError && <ErrorBanner message={submitError} />}
        </div>
      )}

      {/* Modern Horizontally Separated Action Buttons */}
      <div className="nav-btn-row">
        {step > 1 ? (
          <button
            type="button"
            className="btn btn-back"
            onClick={goBack}
            disabled={submitting}
          >
            {t.register.btnBack}
          </button>
        ) : (
          <div style={{ flex: "0 0 0px" }} />
        )}

        {step < 4 ? (
          <button
            type="button"
            className="btn btn-next"
            onClick={goNext}
          >
            {step === 1 && "Next: Location ›"}
            {step === 2 && "Next: Job & Referral ›"}
            {step === 3 && "Next: Review Details ›"}
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
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
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

