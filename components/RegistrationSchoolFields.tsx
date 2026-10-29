"use client";

import { useEffect, useState } from "react";
import { CEBU_DISTRICTS_ALPHABETICAL } from "@/lib/district";
import type { RegistrationSchool } from "@/lib/registration-schools";

export default function RegistrationSchoolFields() {
  const [district, setDistrict] = useState("");
  const [schoolKey, setSchoolKey] = useState("");
  const [schools, setSchools] = useState<RegistrationSchool[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!district) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/school-catalog?district=${encodeURIComponent(district)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load schools."); return result.schools as RegistrationSchool[]; })
      .then((result) => { if (!controller.signal.aborted) setSchools(result); })
      .catch(() => { if (!controller.signal.aborted) setError("Unable to load schools. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [district, retry]);
  const selected = schools.find((school) => school.key === schoolKey && school.district === district);
  return <fieldset className="registration-school-fields">
    <legend>School assignment</legend>
    <label>District<select name="district" value={district} onChange={(event) => { setDistrict(event.target.value); setSchoolKey(""); setSchools([]); setError(""); setLoading(Boolean(event.target.value)); }} required><option value="" disabled>Select district</option>{CEBU_DISTRICTS_ALPHABETICAL.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    <label>School<select name="schoolKey" value={schoolKey} onChange={(event) => setSchoolKey(event.target.value)} disabled={!district || loading || Boolean(error)} required><option value="" disabled>{!district ? "Select a district first" : loading ? "Loading schools…" : "Select school"}</option>{schools.map((school) => <option key={school.key} value={school.key}>{school.schoolName} — {school.schoolId}</option>)}</select></label>
    {loading && <small role="status">Loading schools for {district}…</small>}
    {error && <p className="form-alert error" role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}
    {district && !loading && !error && schools.length === 0 && <small role="status">No schools are listed for this district. Please contact the administrator.</small>}
    <div className="dialog-grid"><label>School name<input name="schoolName" value={selected?.schoolName || ""} readOnly placeholder="Filled after selecting a school" /></label><label>School ID<input name="schoolId" value={selected?.schoolId || ""} readOnly placeholder="Filled automatically" /></label></div>
    <small>School details come from the supplied school list and cannot be typed manually. Contact the administrator if your school is missing.</small>
  </fieldset>;
}
