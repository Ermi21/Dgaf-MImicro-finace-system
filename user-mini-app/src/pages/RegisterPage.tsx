import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { hapticError, hapticSuccess, hideMainButton, setMainButton } from "../services/telegram";
import type { City, Job, RegistrationCreatePayload, Subcity, Woreda } from "../types";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { LoadingSpinner, ErrorBanner, SuccessCheck } from "../components/Feedback";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  first_name: string;
  second_name: string;
  phone: string;
  city_id: string;
  subcity_id: string;
  woreda_id: string;
  job_id: string;
  employment_type: "EMPLOYEE" | "SELF_EMPLOYED" | "";
}

const EMPTY_FORM: FormData = {
  first_name: "",
  second_name: "",
  phone: "",
  city_id: "",
  subcity_id: "",
  woreda_id: "",
  job_id: "",
  employment_type: "",
};

export function RegisterPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [cities, setCities] = useState<City[]>([]);
  const [subcities, setSubcities] = useState<Subcity[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJobName, setSubmittedJobName] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<City[]>("/api/v1/cities"), api.get<Job[]>("/api/v1/jobs/active")])
      .then(([cityList, jobList]) => {
        setCities(cityList);
        setJobs(jobList);
      })
      .catch((err) => setLoadError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong));
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

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({
      ...f,
      [key]: value,
      // Changing a parent location field invalidates the children.
      ...(key === "city_id" ? { subcity_id: "", woreda_id: "" } : {}),
      ...(key === "subcity_id" ? { woreda_id: "" } : {}),
    }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(current: Step): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (current === 1) {
      if (!form.first_name.trim()) next.first_name = t.register.validationRequired;
      if (!form.second_name.trim()) next.second_name = t.register.validationRequired;
      if (!/^(\+?251|0)?[79]\d{8}$/.test(form.phone.trim())) {
        next.phone = t.register.validationPhone;
      }
    }
    if (current === 2) {
      if (!form.city_id) next.city_id = t.register.validationRequired;
      if (!form.subcity_id) next.subcity_id = t.register.validationRequired;
      if (!form.woreda_id) next.woreda_id = t.register.validationRequired;
    }
    if (current === 3) {
      if (!form.job_id) next.job_id = t.register.validationRequired;
      if (!form.employment_type) next.employment_type = t.register.validationRequired;
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
      const payload: RegistrationCreatePayload = {
        first_name: form.first_name.trim(),
        second_name: form.second_name.trim(),
        phone: form.phone.trim(),
        city_id: form.city_id,
        subcity_id: form.subcity_id,
        woreda_id: form.woreda_id,
        job_id: form.job_id,
        employment_type: form.employment_type as "EMPLOYEE" | "SELF_EMPLOYED",
      };
      const created = await api.post<{ job: Job }>("/api/v1/registrations", payload);
      setSubmittedJobName(created.job.name);
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
    if (submittedJobName) {
      hideMainButton();
      return;
    }
    if (step < 4) {
      return setMainButton(t.common.next, goNext, { enabled: true });
    }
    return setMainButton(t.register.submitRegistration, submit, {
      enabled: !submitting,
      showProgress: submitting,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form, submitting, submittedJobName]);

  const jobName = useMemo(() => jobs.find((j) => j.id === form.job_id)?.name ?? "", [jobs, form.job_id]);
  const cityName = useMemo(() => cities.find((c) => c.id === form.city_id)?.name ?? "", [cities, form.city_id]);
  const subcityName = useMemo(
    () => subcities.find((s) => s.id === form.subcity_id)?.name ?? "",
    [subcities, form.subcity_id],
  );
  const woredaName = useMemo(
    () => woredas.find((w) => w.id === form.woreda_id)?.name ?? "",
    [woredas, form.woreda_id],
  );

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
        </div>
      </div>
    );
  }

  if (cities.length === 0 && jobs.length === 0 && !loadError) {
    return (
      <div className="screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.register.title}</h1>
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
            value={form.job_id}
            placeholder={t.register.selectPlaceholder}
            error={errors.job_id}
            options={jobs.map((j) => ({ value: j.id, label: j.name }))}
            onChange={(v) => update("job_id", v)}
          />
          <SelectField
            label={t.register.employmentType}
            value={form.employment_type}
            placeholder={t.register.selectPlaceholder}
            error={errors.employment_type}
            options={[
              { value: "EMPLOYEE", label: t.register.employmentEmployee },
              { value: "SELF_EMPLOYED", label: t.register.employmentSelfEmployed },
            ]}
            onChange={(v) => update("employment_type", v as FormData["employment_type"])}
          />
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <p className="page-subtitle">{t.register.reviewIntro}</p>
          <ReviewRow label={t.register.firstName} value={form.first_name} />
          <ReviewRow label={t.register.secondName} value={form.second_name} />
          <ReviewRow label={t.register.phone} value={form.phone} />
          <ReviewRow label={t.register.city} value={cityName} />
          <ReviewRow label={t.register.subcity} value={subcityName} />
          <ReviewRow label={t.register.woreda} value={woredaName} />
          <ReviewRow label={t.register.job} value={jobName} />
          <ReviewRow
            label={t.register.employmentType}
            value={
              form.employment_type === "EMPLOYEE"
                ? t.register.employmentEmployee
                : t.register.employmentSelfEmployed
            }
          />
          {submitError && <ErrorBanner message={submitError} />}
        </div>
      )}

      {step > 1 && (
        <Button variant="secondary" onClick={goBack} disabled={submitting}>
          {t.common.back}
        </Button>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="stepper">
      {[1, 2, 3, 4].map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", flex: n < 4 ? 1 : undefined }}>
          <div className={`stepper-dot ${n === step ? "active" : n < step ? "done" : ""}`}>{n}</div>
          {i < 3 && <div className="stepper-line" />}
        </div>
      ))}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item" style={{ padding: "8px 0" }}>
      <div className="list-item-meta">{label}</div>
      <div className="list-item-title">{value}</div>
    </div>
  );
}
