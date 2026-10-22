import { useState } from "react";
import { useI18n } from "../i18n";
import { api, ApiRequestError } from "../services/api";
import { useApi } from "../hooks/useApi";
import type { City, Subcity, Woreda } from "../types";
import { LoadingSpinner, ErrorBanner, EmptyState } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { IfPermitted } from "../components/IfPermitted";
import { Permissions } from "../permissions";

export function LocationsPage() {
  const { t } = useI18n();
  const citiesState = useApi<City[]>(() => api.get<City[]>("/api/v1/cities"), []);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSubcity, setSelectedSubcity] = useState("");

  const subcitiesState = useApi<Subcity[]>(
    () =>
      selectedCity
        ? api.get<Subcity[]>(`/api/v1/cities/${selectedCity}/subcities`)
        : Promise.resolve([]),
    [selectedCity],
  );
  const woredasState = useApi<Woreda[]>(
    () =>
      selectedSubcity
        ? api.get<Woreda[]>(`/api/v1/subcities/${selectedSubcity}/woredas`)
        : Promise.resolve([]),
    [selectedSubcity],
  );

  const [newCityName, setNewCityName] = useState("");
  const [newSubcityName, setNewSubcityName] = useState("");
  const [newWoredaName, setNewWoredaName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function addCity() {
    setError(null);
    try {
      await api.post("/api/v1/cities", { name: newCityName.trim() });
      setNewCityName("");
      citiesState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function addSubcity() {
    setError(null);
    try {
      await api.post("/api/v1/subcities", { name: newSubcityName.trim(), city_id: selectedCity });
      setNewSubcityName("");
      subcitiesState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function addWoreda() {
    setError(null);
    try {
      await api.post("/api/v1/woredas", { name: newWoredaName.trim(), subcity_id: selectedSubcity });
      setNewWoredaName("");
      woredasState.reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.common.somethingWrong);
    }
  }

  async function deactivateCity(id: string) {
    await api.post(`/api/v1/cities/${id}/deactivate`);
    citiesState.reload();
  }
  async function deactivateSubcity(id: string) {
    await api.post(`/api/v1/subcities/${id}/deactivate`);
    subcitiesState.reload();
  }
  async function deactivateWoreda(id: string) {
    await api.post(`/api/v1/woredas/${id}/deactivate`);
    woredasState.reload();
  }

  return (
    <div className="screen">
      <h1 className="page-title">{t.locations.title}</h1>
      {error && <ErrorBanner message={error} />}

      <div className="card">
        <h2 className="section-title">{t.locations.cities}</h2>
        {citiesState.status === "loading" && <LoadingSpinner />}
        {citiesState.status === "error" && (
          <ErrorBanner message={citiesState.message} onRetry={citiesState.reload} />
        )}
        {citiesState.status === "success" && (
          <>
            {citiesState.data.length === 0 && <EmptyState title={t.common.noResults} />}
            {citiesState.data.map((city) => (
              <div className="list-item" key={city.id}>
                <div className="list-item-header">
                  <button
                    className={`link-button ${selectedCity === city.id ? "link-button-active" : ""}`}
                    onClick={() => {
                      setSelectedCity(city.id);
                      setSelectedSubcity("");
                    }}
                  >
                    {city.name}
                  </button>
                  <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                    <Button variant="secondary" onClick={() => deactivateCity(city.id)}>
                      {t.locations.deactivate}
                    </Button>
                  </IfPermitted>
                </div>
              </div>
            ))}
          </>
        )}
        <IfPermitted permission={Permissions.LOCATION_CREATE}>
          <div className="inline-form">
            <TextField
              label={t.locations.name}
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
            />
            <Button onClick={addCity} disabled={newCityName.trim().length < 2}>
              {t.locations.addCity}
            </Button>
          </div>
        </IfPermitted>
      </div>

      <div className="card">
        <h2 className="section-title">{t.locations.subcities}</h2>
        {!selectedCity && <EmptyState title={t.locations.selectCityFirst} />}
        {selectedCity && subcitiesState.status === "success" && (
          <>
            {subcitiesState.data.length === 0 && <EmptyState title={t.common.noResults} />}
            {subcitiesState.data.map((subcity) => (
              <div className="list-item" key={subcity.id}>
                <div className="list-item-header">
                  <button
                    className={`link-button ${selectedSubcity === subcity.id ? "link-button-active" : ""}`}
                    onClick={() => setSelectedSubcity(subcity.id)}
                  >
                    {subcity.name}
                  </button>
                  <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                    <Button variant="secondary" onClick={() => deactivateSubcity(subcity.id)}>
                      {t.locations.deactivate}
                    </Button>
                  </IfPermitted>
                </div>
              </div>
            ))}
          </>
        )}
        {selectedCity && (
          <IfPermitted permission={Permissions.LOCATION_CREATE}>
            <div className="inline-form">
              <TextField
                label={t.locations.name}
                value={newSubcityName}
                onChange={(e) => setNewSubcityName(e.target.value)}
              />
              <Button onClick={addSubcity} disabled={newSubcityName.trim().length < 2}>
                {t.locations.addSubcity}
              </Button>
            </div>
          </IfPermitted>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">{t.locations.woredas}</h2>
        {!selectedSubcity && <EmptyState title={t.locations.selectSubcityFirst} />}
        {selectedSubcity && woredasState.status === "success" && (
          <>
            {woredasState.data.length === 0 && <EmptyState title={t.common.noResults} />}
            {woredasState.data.map((woreda) => (
              <div className="list-item" key={woreda.id}>
                <div className="list-item-header">
                  <span className="list-item-title">{woreda.name}</span>
                  <IfPermitted permission={Permissions.LOCATION_UPDATE}>
                    <Button variant="secondary" onClick={() => deactivateWoreda(woreda.id)}>
                      {t.locations.deactivate}
                    </Button>
                  </IfPermitted>
                </div>
              </div>
            ))}
          </>
        )}
        {selectedSubcity && (
          <IfPermitted permission={Permissions.LOCATION_CREATE}>
            <div className="inline-form">
              <TextField
                label={t.locations.name}
                value={newWoredaName}
                onChange={(e) => setNewWoredaName(e.target.value)}
              />
              <Button onClick={addWoreda} disabled={newWoredaName.trim().length < 2}>
                {t.locations.addWoreda}
              </Button>
            </div>
          </IfPermitted>
        )}
      </div>
    </div>
  );
}
