import { useState, useMemo } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { City, Subcity, Woreda } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { SelectField } from "../components/SelectField";
import { Button } from "../components/Button";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

export function LocationsPage() {
  const { t } = useI18n();
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities?include_inactive=true"), []);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSubcity, setSelectedSubcity] = useState("");

  const [citySearch, setCitySearch] = useState("");
  const [subcitySearch, setSubcitySearch] = useState("");
  const [woredaSearch, setWoredaSearch] = useState("");

  const subcitiesState = useApi<Subcity[]>(
    () =>
      selectedCity
        ? api.get<Subcity[]>(`/api/v1/cities/${selectedCity}/subcities?include_inactive=true`)
        : Promise.resolve([]),
    [selectedCity],
  );
  const woredasState = useApi<Woreda[]>(
    () =>
      selectedSubcity
        ? api.get<Woreda[]>(`/api/v1/subcities/${selectedSubcity}/woredas?include_inactive=true`)
        : Promise.resolve([]),
    [selectedSubcity],
  );

  const [newCityName, setNewCityName] = useState("");
  const [autoPopulateCity, setAutoPopulateCity] = useState(true);
  const [newSubcityName, setNewSubcityName] = useState("");
  const [newWoredaName, setNewWoredaName] = useState("");
  const [addSubcityCityId, setAddSubcityCityId] = useState("");
  const [addWoredaCityId, setAddWoredaCityId] = useState("");
  const [addWoredaSubcityId, setAddWoredaSubcityId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddSubcity, setShowAddSubcity] = useState(false);
  const [showAddWoreda, setShowAddWoreda] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [seedingCities, setSeedingCities] = useState(false);

  const CORE_5_CITIES = ["Addis Ababa", "Bahir Dar", "Hawassa", "Adama", "Dire Dawa"];

  async function seedCity(name: string) {
    setError(null);
    setSuccessMsg(null);
    setSeedingCities(true);
    try {
      const created = await api.post<City>("/api/v1/cities", {
        name,
        auto_populate: true,
      });
      citiesState.reload();
      setSelectedCity(created.id);
      setSelectedSubcity("");
      setSuccessMsg(`✓ Initialized ${name} with official subcities & woredas!`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSeedingCities(false);
    }
  }

  async function seedAllMissingCoreCities(missing: string[]) {
    if (missing.length === 0) return;
    setError(null);
    setSuccessMsg(null);
    setSeedingCities(true);
    try {
      for (const name of missing) {
        await api.post<City>("/api/v1/cities", {
          name,
          auto_populate: true,
        });
      }
      citiesState.reload();
      setSuccessMsg(`✓ Initialized ${missing.length} core Ethiopian cities with official subcities & woredas!`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setSeedingCities(false);
    }
  }

  async function addCity() {
    setError(null);
    setSuccessMsg(null);
    try {
      const created = await api.post<City>("/api/v1/cities", {
        name: newCityName.trim(),
        auto_populate: autoPopulateCity,
      });
      setNewCityName("");
      setShowAddCity(false);
      citiesState.reload();
      // Auto-select the newly created city so its subcities & woredas are displayed
      setSelectedCity(created.id);
      setSelectedSubcity("");
      setSuccessMsg(
        autoPopulateCity
          ? `✓ Added "${created.name}" and automatically populated subcities and woredas!`
          : `✓ Added city "${created.name}".`
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function handleAutoPopulateSelectedCity() {
    if (!selectedCity) return;
    setError(null);
    setSuccessMsg(null);
    setAutoFilling(true);
    try {
      const res = await api.post<{ subcities_added: number; woredas_added: number }>(
        `/api/v1/cities/${selectedCity}/auto-populate`
      );
      subcitiesState.reload();
      setSuccessMsg(
        `✓ Auto-populated ${res.subcities_added} subcities and ${res.woredas_added} woredas successfully!`
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    } finally {
      setAutoFilling(false);
    }
  }

  async function addSubcity() {
    const city_id = addSubcityCityId || selectedCity;
    if (!city_id) {
      setError(t.locations.selectCityFirst);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post("/api/v1/subcities", { name: newSubcityName.trim(), city_id });
      setNewSubcityName("");
      setShowAddSubcity(false);
      subcitiesState.reload();
      setSuccessMsg(`✓ Added subcity "${newSubcityName.trim()}".`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function addWoreda() {
    const subcity_id = addWoredaSubcityId || selectedSubcity;
    if (!subcity_id) {
      setError(t.locations.selectSubcityFirst);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post("/api/v1/woredas", { name: newWoredaName.trim(), subcity_id });
      setNewWoredaName("");
      setShowAddWoreda(false);
      woredasState.reload();
      setSuccessMsg(`✓ Added woreda "${newWoredaName.trim()}".`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function toggleCity(e: React.MouseEvent, city: City) {
    e.stopPropagation();
    setError(null);
    try {
      const endpoint = city.is_active ? "deactivate" : "activate";
      await api.post(`/api/v1/cities/${city.id}/${endpoint}`);
      citiesState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function toggleSubcity(e: React.MouseEvent, subcity: Subcity) {
    e.stopPropagation();
    setError(null);
    try {
      const endpoint = subcity.is_active ? "deactivate" : "activate";
      await api.post(`/api/v1/subcities/${subcity.id}/${endpoint}`);
      subcitiesState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function toggleWoreda(e: React.MouseEvent, woreda: Woreda) {
    e.stopPropagation();
    setError(null);
    try {
      const endpoint = woreda.is_active ? "deactivate" : "activate";
      await api.post(`/api/v1/woredas/${woreda.id}/${endpoint}`);
      woredasState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  // Filtered lists for fast lookup - clean official top 10 cities with Addis Ababa FIRST
  const filteredCities = useMemo(() => {
    if (citiesState.status !== "success") return [];
    // Cut out sample/dummy test entries
    const DUMMY_CITIES = ["badar", "bahir dare", "bole", "yeka", "adiss ababa", "jima"];
    let list = citiesState.data.filter(
      (c) => !DUMMY_CITIES.includes(c.name.trim().toLowerCase())
    );
    if (citySearch.trim()) {
      const q = citySearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    // Make Addis Ababa is first instead of Adama
    list = [...list].sort((a, b) => {
      const aIsAddis = a.name.toLowerCase().includes("addis");
      const bIsAddis = b.name.toLowerCase().includes("addis");
      if (aIsAddis && !bIsAddis) return -1;
      if (!aIsAddis && bIsAddis) return 1;
      return a.name.localeCompare(b.name);
    });
    // 10 cities is enough
    return list.slice(0, 10);
  }, [citiesState, citySearch]);

  // Auto-select Addis Ababa first so subcities and woredas display immediately
  useEffect(() => {
    if (!selectedCity && filteredCities.length > 0) {
      const addis = filteredCities.find((c) => c.name.toLowerCase().includes("addis")) || filteredCities[0];
      if (addis) setSelectedCity(addis.id);
    }
  }, [filteredCities, selectedCity]);

  const filteredSubcities = useMemo(() => {
    if (subcitiesState.status !== "success") return [];
    if (!subcitySearch.trim()) return subcitiesState.data;
    const q = subcitySearch.toLowerCase();
    return subcitiesState.data.filter((s) => s.name.toLowerCase().includes(q));
  }, [subcitiesState, subcitySearch]);

  const filteredWoredas = useMemo(() => {
    if (woredasState.status !== "success") return [];
    if (!woredaSearch.trim()) return woredasState.data;
    const q = woredaSearch.toLowerCase();
    return woredasState.data.filter((w) => w.name.toLowerCase().includes(q));
  }, [woredasState, woredaSearch]);

  const currentCityObj = citiesState.status === "success" ? citiesState.data.find((c) => c.id === selectedCity) : null;
  const currentSubcityObj = subcitiesState.status === "success" ? subcitiesState.data.find((s) => s.id === selectedSubcity) : null;

  return (
    <div className="screen" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t.locations.title}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--tg-hint, #888)" }}>
            Select a city to inspect subcities and woredas. Auto-populate official data or add manually anytime.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {successMsg && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: 8,
            color: "#34d399",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            type="button"
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Select Major Cities Ribbon */}
      {citiesState.status === "success" && (() => {
        const missingCore = CORE_5_CITIES.filter(
          (name) => !citiesState.data.some((c) => c.name.toLowerCase() === name.toLowerCase())
        );

        return (
          <div
            className="card"
            style={{
              padding: "14px 16px",
              marginBottom: 16,
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(30, 41, 59, 0.4) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  ⚡ Core Ethiopian Hubs (Addis Ababa, Bahir Dar, Hawassa, Adama, Dire Dawa)
                </span>
                <span style={{ fontSize: 11, color: "var(--tg-hint, #888)" }}>Official hierarchy</span>
              </div>

              {missingCore.length > 0 && (
                <button
                  type="button"
                  onClick={() => seedAllMissingCoreCities(missingCore)}
                  disabled={seedingCities}
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.4) 100%)",
                    border: "1px solid #10b981",
                    color: "#34d399",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: seedingCities ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  ⚡ {seedingCities ? "Initializing..." : `Initialize ${missingCore.length} Missing Core Hubs`}
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CORE_5_CITIES.map((name) => {
                const matched = citiesState.data.find((c) => c.name.toLowerCase() === name.toLowerCase());
                if (!matched) {
                  return (
                    <button
                      key={name}
                      onClick={() => seedCity(name)}
                      disabled={seedingCities}
                      type="button"
                      title={`Click to initialize ${name} with official subcities & woredas`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: seedingCities ? "not-allowed" : "pointer",
                        border: "1.5px dashed rgba(16, 185, 129, 0.45)",
                        background: "rgba(16, 185, 129, 0.05)",
                        color: "#6ee7b7",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>+ Seed {name}</span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>Auto-fill</span>
                    </button>
                  );
                }

                const isSelected = selectedCity === matched.id;
                return (
                  <button
                    key={matched.id}
                    onClick={() => {
                      setSelectedCity(matched.id);
                      setSelectedSubcity("");
                      setSubcitySearch("");
                      setWoredaSearch("");
                    }}
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: isSelected ? "1.5px solid #10b981" : "1px solid rgba(255, 255, 255, 0.12)",
                      background: isSelected
                        ? "rgba(16, 185, 129, 0.25)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: isSelected ? "#34d399" : "var(--tg-text, #e2e8f0)",
                      boxShadow: isSelected ? "0 0 12px rgba(16, 185, 129, 0.3)" : "none",
                    }}
                  >
                    <span>📍 {matched.name}</span>
                    {isSelected && <span style={{ fontSize: 11 }}>✓</span>}
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: matched.is_active ? "#10b981" : "#64748b",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 1. CITIES SECTION (Column & Row Grid arrangement) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>{t.locations.cities}</h2>
            {citiesState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--tg-hint, #94a3b8)",
                }}
              >
                {citiesState.data.length} total • {citiesState.data.filter((c) => c.is_active).length} active
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Filter city..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                color: "inherit",
                width: 140,
              }}
            />
            <IfPermitted permission={Permissions.LOCATION_CREATE}>
              <button
                onClick={() => setShowAddCity((prev) => !prev)}
                type="button"
                style={{
                  background: showAddCity ? "rgba(255, 255, 255, 0.1)" : "rgba(16, 185, 129, 0.15)",
                  color: showAddCity ? "#94a3b8" : "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showAddCity ? "✕ Cancel" : "+ Add City"}
              </button>
            </IfPermitted>
          </div>
        </div>

        {/* Add City Form with Auto-Populate Checkbox */}
        {showAddCity && (
          <div
            style={{
              padding: "14px",
              marginBottom: 14,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <TextField
                  label="City Name (e.g. Gondar, Mekelle, Jimma, Dessie, Harar...)"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                />
              </div>
              <Button onClick={addCity} disabled={newCityName.trim().length < 2}>
                {t.locations.addCity}
              </Button>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "#34d399",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={autoPopulateCity}
                onChange={(e) => setAutoPopulateCity(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#10b981", width: 16, height: 16 }}
              />
              <span>Automatically fill official Subcities & Woredas for this city</span>
            </label>
          </div>
        )}

        {citiesState.status === "loading" && <LoadingSpinner />}
        {citiesState.status === "error" && (
          <ErrorBanner message={citiesState.message} onRetry={citiesState.reload} />
        )}
        {citiesState.status === "success" && (
          <>
            {filteredCities.length === 0 && <EmptyState title={t.common.noResults} />}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 10,
              }}
            >
              {filteredCities.map((city) => {
                const isSelected = selectedCity === city.id;
                return (
                  <div
                    key={city.id}
                    onClick={() => {
                      setSelectedCity(city.id);
                      setSelectedSubcity("");
                      setSubcitySearch("");
                      setWoredaSearch("");
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: isSelected
                        ? "1.5px solid #10b981"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)"
                        : "var(--color-surface-raised, rgba(30, 41, 59, 0.5))",
                      boxShadow: isSelected ? "0 0 12px rgba(16, 185, 129, 0.25)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: 13.5,
                          color: isSelected ? "#34d399" : "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        📍 {city.name}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.15)",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          SELECTED
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: city.is_active ? "#34d399" : "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: city.is_active ? "#10b981" : "#64748b" }} />
                        {city.is_active ? "Active" : "Inactive"}
                      </span>

                      <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                        <button
                          type="button"
                          onClick={(e) => toggleCity(e, city)}
                          style={{
                            background: city.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.15)",
                            border: city.is_active ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.35)",
                            borderRadius: 5,
                            color: city.is_active ? "#f87171" : "#34d399",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            cursor: "pointer",
                          }}
                        >
                          {city.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </IfPermitted>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 2. SUBCITIES SECTION (Column & Row Grid arrangement + Auto-Fill + Manual Add) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {currentCityObj ? `Subcities of ${currentCityObj.name}` : t.locations.subcities}
            </h2>
            {selectedCity && subcitiesState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--tg-hint, #94a3b8)",
                }}
              >
                {subcitiesState.data.length} found • {subcitiesState.data.filter((s) => s.is_active).length} active
              </span>
            )}
          </div>

          {selectedCity && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Auto-Fill Button for Selected City */}
              <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                <button
                  type="button"
                  onClick={handleAutoPopulateSelectedCity}
                  disabled={autoFilling}
                  style={{
                    background: "rgba(16, 185, 129, 0.18)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#34d399",
                    cursor: autoFilling ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Automatically fill official subcities & woredas for this city"
                >
                  ⚡ {autoFilling ? "Filling..." : "Auto-Fill Subcities & Woredas"}
                </button>
              </IfPermitted>

              <input
                type="text"
                placeholder="Filter subcity..."
                value={subcitySearch}
                onChange={(e) => setSubcitySearch(e.target.value)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "inherit",
                  width: 130,
                }}
              />

              {/* Manual Input Subcity Toggle Button */}
              <IfPermitted permission={Permissions.LOCATION_CREATE}>
                <button
                  onClick={() => setShowAddSubcity((prev) => !prev)}
                  type="button"
                  style={{
                    background: showAddSubcity ? "rgba(255, 255, 255, 0.1)" : "rgba(59, 130, 246, 0.15)",
                    color: showAddSubcity ? "#94a3b8" : "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showAddSubcity ? "✕ Cancel" : "+ Add Manually"}
                </button>
              </IfPermitted>
            </div>
          )}
        </div>

        {/* Manual Subcity Creation Form */}
        {showAddSubcity && (
          <div
            style={{
              padding: "12px",
              marginBottom: 14,
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.06)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {!selectedCity && (
              <div style={{ flex: 1, minWidth: 180 }}>
                <SelectField
                  label={t.registrations.filterCity}
                  value={addSubcityCityId}
                  placeholder={t.registrations.allCities}
                  options={citiesState.status === "success" ? citiesState.data.map((c) => ({ value: c.id, label: c.name })) : []}
                  onChange={(v) => setAddSubcityCityId(v)}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 180 }}>
              <TextField
                label="Subcity Name (e.g. Bole, Maraki, Sabian...)"
                value={newSubcityName}
                onChange={(e) => setNewSubcityName(e.target.value)}
              />
            </div>
            <Button
              onClick={addSubcity}
              disabled={newSubcityName.trim().length < 2 || !(selectedCity || addSubcityCityId)}
            >
              {t.locations.addSubcity}
            </Button>
          </div>
        )}

        {!selectedCity && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--tg-hint, #888)" }}>
            <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>👆</span>
            <span>Please select a city above to inspect its subcities</span>
          </div>
        )}

        {selectedCity && subcitiesState.status === "loading" && <LoadingSpinner />}
        {selectedCity && subcitiesState.status === "error" && (
          <ErrorBanner message={subcitiesState.message} onRetry={subcitiesState.reload} />
        )}
        {selectedCity && subcitiesState.status === "success" && (
          <>
            {filteredSubcities.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <p style={{ color: "var(--tg-hint, #888)", marginBottom: 10 }}>No subcities found for this city.</p>
                <button
                  type="button"
                  onClick={handleAutoPopulateSelectedCity}
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 14px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ⚡ Auto-Populate Official Subcities & Woredas Now
                </button>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {filteredSubcities.map((subcity) => {
                const isSelected = selectedSubcity === subcity.id;
                return (
                  <div
                    key={subcity.id}
                    onClick={() => {
                      setSelectedSubcity(subcity.id);
                      setWoredaSearch("");
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: isSelected
                        ? "1.5px solid #10b981"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)"
                        : "var(--color-surface-raised, rgba(30, 41, 59, 0.5))",
                      boxShadow: isSelected ? "0 0 12px rgba(16, 185, 129, 0.25)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: 13,
                          color: isSelected ? "#34d399" : "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        🏛️ {subcity.name}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.15)",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          SELECTED
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: subcity.is_active ? "#34d399" : "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: subcity.is_active ? "#10b981" : "#64748b" }} />
                        {subcity.is_active ? "Active" : "Inactive"}
                      </span>

                      <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                        <button
                          type="button"
                          onClick={(e) => toggleSubcity(e, subcity)}
                          style={{
                            background: subcity.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.15)",
                            border: subcity.is_active ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.35)",
                            borderRadius: 5,
                            color: subcity.is_active ? "#f87171" : "#34d399",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            cursor: "pointer",
                          }}
                        >
                          {subcity.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </IfPermitted>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 3. WOREDAS SECTION (Column & Row Grid arrangement + Manual Add) */}
      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {currentSubcityObj ? `Woredas of ${currentSubcityObj.name}` : t.locations.woredas}
            </h2>
            {selectedSubcity && woredasState.status === "success" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--tg-hint, #94a3b8)",
                }}
              >
                {woredasState.data.length} registered • {woredasState.data.filter((w) => w.is_active).length} active
              </span>
            )}
          </div>

          {selectedSubcity && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                placeholder="Filter woreda..."
                value={woredaSearch}
                onChange={(e) => setWoredaSearch(e.target.value)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "inherit",
                  width: 140,
                }}
              />
              {/* Manual Input Woreda Toggle Button */}
              <IfPermitted permission={Permissions.LOCATION_CREATE}>
                <button
                  onClick={() => setShowAddWoreda((prev) => !prev)}
                  type="button"
                  style={{
                    background: showAddWoreda ? "rgba(255, 255, 255, 0.1)" : "rgba(59, 130, 246, 0.15)",
                    color: showAddWoreda ? "#94a3b8" : "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showAddWoreda ? "✕ Cancel" : "+ Add Manually"}
                </button>
              </IfPermitted>
            </div>
          )}
        </div>

        {/* Manual Woreda Creation Form */}
        {showAddWoreda && (
          <div
            style={{
              padding: "12px",
              marginBottom: 14,
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.06)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {!selectedSubcity && (
              <>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <SelectField
                    label={t.registrations.filterCity}
                    value={addWoredaCityId}
                    placeholder={t.registrations.allCities}
                    options={citiesState.status === "success" ? citiesState.data.map((c) => ({ value: c.id, label: c.name })) : []}
                    onChange={(v) => {
                      setAddWoredaCityId(v);
                      setAddWoredaSubcityId("");
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <SelectField
                    label={t.locations.subcities}
                    value={addWoredaSubcityId}
                    placeholder={t.locations.subcities}
                    options={
                      addWoredaCityId && citiesState.status === "success"
                        ? subcitiesState.status === "success" ? subcitiesState.data.map((s) => ({ value: s.id, label: s.name })) : []
                        : []
                    }
                    onChange={(v) => setAddWoredaSubcityId(v)}
                    disabled={!addWoredaCityId}
                  />
                </div>
              </>
            )}
            <div style={{ flex: 1, minWidth: 150 }}>
              <TextField
                label="Woreda Name (e.g. Woreda 01, Kebele 02...)"
                value={newWoredaName}
                onChange={(e) => setNewWoredaName(e.target.value)}
              />
            </div>
            <Button
              onClick={addWoreda}
              disabled={newWoredaName.trim().length < 1 || !(selectedSubcity || addWoredaSubcityId)}
            >
              {t.locations.addWoreda}
            </Button>
          </div>
        )}

        {!selectedSubcity && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--tg-hint, #888)" }}>
            <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>🏛️</span>
            <span>Select a subcity above to view its woredas</span>
          </div>
        )}

        {selectedSubcity && woredasState.status === "loading" && <LoadingSpinner />}
        {selectedSubcity && woredasState.status === "error" && (
          <ErrorBanner message={woredasState.message} onRetry={woredasState.reload} />
        )}
        {selectedSubcity && woredasState.status === "success" && (
          <>
            {filteredWoredas.length === 0 && <EmptyState title={t.common.noResults} />}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 8,
              }}
            >
              {filteredWoredas.map((woreda) => (
                <div
                  key={woreda.id}
                  style={{
                    padding: "8px 10px",
                    background: "var(--color-surface-raised, rgba(30, 41, 59, 0.5))",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    gap: 6,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 12.5,
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={woreda.name}
                    >
                      {woreda.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: woreda.is_active ? "#34d399" : "#94a3b8",
                      }}
                    >
                      {woreda.is_active ? "● Active" : "○ Off"}
                    </span>
                  </div>

                  <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                    <button
                      type="button"
                      onClick={(e) => toggleWoreda(e, woreda)}
                      style={{
                        background: woreda.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.15)",
                        border: woreda.is_active ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: 5,
                        color: woreda.is_active ? "#f87171" : "#34d399",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {woreda.is_active ? "Off" : "On"}
                    </button>
                  </IfPermitted>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
