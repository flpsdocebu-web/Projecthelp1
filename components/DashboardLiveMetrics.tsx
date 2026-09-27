"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";

type Month = { month: string; downloads: number; prints: number };
type DistrictCount = { district: string; accounts: number; schools: number };
type SchoolYearReport = { schoolYear: string; resources: number; previews: number; downloads: number; prints: number; totalActivity: number; firstActivity?: string; lastActivity?: string };
type Data = {
  students: number;
  teachers: number;
  downloads: number;
  prints: number;
  districts: number;
  schools: number;
  totalUsers: number;
  months: Month[];
  schoolYears: SchoolYearReport[];
  districtCounts: DistrictCount[];
};

const empty: Data = {
  students: 0,
  teachers: 0,
  downloads: 0,
  prints: 0,
  districts: 0,
  schools: 0,
  totalUsers: 0,
  months: [],
  schoolYears: [],
  districtCounts: [],
};

const DIVISION_TOTALS = { districts: 58, schools: 1144 } as const;

function reachPercentage(value: number, total: number) {
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function normalize(payload: Partial<Data> | null | undefined): Data {
  return {
    students: Number(payload?.students || 0),
    teachers: Number(payload?.teachers || 0),
    downloads: Number(payload?.downloads || 0),
    prints: Number(payload?.prints || 0),
    districts: Number(payload?.districts || 0),
    schools: Number(payload?.schools || 0),
    totalUsers: Number(payload?.totalUsers || 0),
    months: Array.isArray(payload?.months) ? payload.months : [],
    schoolYears: Array.isArray(payload?.schoolYears) ? payload.schoolYears : [],
    districtCounts: Array.isArray(payload?.districtCounts) ? payload.districtCounts : [],
  };
}

export default function DashboardLiveMetrics() {
  const [data, setData] = useState<Data>(empty);
  const now = new Date();
  const currentSchoolYearStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const currentSchoolYear = `${currentSchoolYearStart}-${currentSchoolYearStart + 1}`;

  useEffect(() => {
    const load = () =>
      fetch("/api/stats", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((payload) => setData(normalize(payload)))
        .catch(() => setData(empty));

    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = new Date(currentSchoolYearStart, 5 + index, 1);
        const key = date.toISOString().slice(0, 7);
        const found = data.months.find((month) => month.month === key);
        return {
          label: date.toLocaleString("en", { month: "short" }),
          downloads: Number(found?.downloads || 0),
          prints: Number(found?.prints || 0),
        };
      }),
    [currentSchoolYearStart, data.months],
  );

  const maximum = Math.max(1, ...months.flatMap((month) => [month.downloads, month.prints]));
  const schoolYearDownloads = months.reduce((sum, month) => sum + month.downloads, 0);
  const schoolYearPrints = months.reduce((sum, month) => sum + month.prints, 0);
  const schoolYearActivity = schoolYearDownloads + schoolYearPrints;
  const activeMonthCount = Math.max(1, months.filter((month) => month.downloads + month.prints > 0).length);
  const peakMonth = months.reduce((peak, month) => month.downloads + month.prints > peak.downloads + peak.prints ? month : peak, months[0]);
  const downloadShare = schoolYearActivity ? (schoolYearDownloads / schoolYearActivity) * 100 : 0;
  const printShare = schoolYearActivity ? (schoolYearPrints / schoolYearActivity) * 100 : 0;
  const districtMaximum = Math.max(1, ...data.districtCounts.map((district) => district.accounts));
  const activeUsers = Math.max(1, data.students + data.teachers);
  const schoolPercentage = reachPercentage(data.schools, DIVISION_TOTALS.schools);
  const districtPercentage = reachPercentage(data.districts, DIVISION_TOTALS.districts);
  const districtColors = ["#238d67", "#1d73b7", "#8c55b4", "#e09a25", "#d85b62", "#2a9eae", "#6674c8", "#75a83e"];
  const stats = [
    { icon: "♙", label: "Student users", value: data.students, color: "blue" },
    { icon: "♟", label: "Teacher/School users", value: data.teachers, color: "green-bg" },
    { icon: "⇩", label: "PDF downloads", value: data.downloads, color: "gold" },
    { icon: "♧", label: "Printed files", value: data.prints, color: "purple" },
  ];
  const schoolYearReports = useMemo(() => {
    const reports = data.schoolYears.map((report) => ({ ...report }));
    if (!reports.some((report) => report.schoolYear === currentSchoolYear)) reports.unshift({ schoolYear: currentSchoolYear, resources: 0, previews: 0, downloads: 0, prints: 0, totalActivity: 0 });
    return reports.sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
  }, [currentSchoolYear, data.schoolYears]);

  return (
    <>
      <div className="live-badge"><i />Live MySQL data · refreshes every 30 seconds</div>
      <div className="stat-grid">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span className={`feature-icon ${stat.color}`}>{stat.icon}</span>
            <div><small>{stat.label}</small><strong>{stat.value.toLocaleString()}</strong><em>Updated from centralized activity</em></div>
          </article>
        ))}
      </div>
      <div className="dash-grid">
        <article className="panel chart-panel">
          <div className="panel-head"><div><strong>Resource activity · SY {currentSchoolYear}</strong><span>June–May activity · hover over a bar for exact counts</span></div><b className="current-sy-badge">Current SY</b></div>
          <div className="legend"><span><i className="blue-dot" />Downloads</span><span><i className="green-dot" />Prints</span></div>
          <div className="bars">
            {months.map((month) => (
              <div className="bar-group" key={month.label}>
                <div>
                  <i className="activity-bar download-bar" data-tooltip={`${month.label}: ${month.downloads} downloads`} style={{ height: `${month.downloads ? Math.max(12, (month.downloads / maximum) * 100) : 2}%` }} />
                  <i className="activity-bar print-bar" data-tooltip={`${month.label}: ${month.prints} prints`} style={{ height: `${month.prints ? Math.max(12, (month.prints / maximum) * 100) : 2}%` }} />
                </div>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
          <section className="chart-insights">
            <div className="chart-insights-head"><div><small>School-year insights</small><strong>SY {currentSchoolYear} activity snapshot</strong></div><span>Live totals</span></div>
            <div className="chart-insight-cards">
              <div><small>Downloads</small><strong>{schoolYearDownloads.toLocaleString()}</strong><span>Current school year</span></div>
              <div><small>Prints</small><strong>{schoolYearPrints.toLocaleString()}</strong><span>Current school year</span></div>
              <div><small>Busiest month</small><strong>{schoolYearActivity ? peakMonth.label : "—"}</strong><span>{schoolYearActivity ? `${(peakMonth.downloads + peakMonth.prints).toLocaleString()} actions` : "No activity yet"}</span></div>
              <div><small>Monthly average</small><strong>{Math.round(schoolYearActivity / activeMonthCount).toLocaleString()}</strong><span>Across active months</span></div>
            </div>
            <div className="activity-mix"><div><span>Download share <b>{downloadShare.toFixed(1)}%</b></span><i><em style={{ width: `${downloadShare}%` }} /></i></div><div><span>Print share <b>{printShare.toFixed(1)}%</b></span><i><em style={{ width: `${printShare}%` }} /></i></div></div>
            <div className="monthly-activity-ledger"><div className="monthly-ledger-head"><strong>Monthly activity ledger</strong><span>June–May</span></div>{months.map((month) => <div className="monthly-ledger-row" key={`ledger-${month.label}`}><b>{month.label}</b><span><i className="blue-dot" />{month.downloads.toLocaleString()} downloads</span><span><i className="green-dot" />{month.prints.toLocaleString()} prints</span><strong>{(month.downloads + month.prints).toLocaleString()}</strong></div>)}</div>
          </section>
        </article>
        <article className="panel reach-panel">
          <div className="panel-head"><div><strong>Program reach</strong><span>Coverage across DepEd Cebu Province</span></div></div>
          <div className="reach">
            <div className="reach-donuts">
              <div className="reach-donut-card">
                <div className="ring schools-ring" role="img" aria-label={`${schoolPercentage.toFixed(1)}% of schools registered`} style={{ "--reach-percent": `${schoolPercentage}%` } as CSSProperties}>
                  <span><strong>{schoolPercentage.toFixed(1)}%</strong><small>Schools</small></span>
                </div>
                <b>{data.schools.toLocaleString()} / {DIVISION_TOTALS.schools.toLocaleString()}</b>
                <small>registered schools</small>
              </div>
              <div className="reach-donut-card">
                <div className="ring districts-ring" role="img" aria-label={`${districtPercentage.toFixed(1)}% of districts registered`} style={{ "--reach-percent": `${districtPercentage}%` } as CSSProperties}>
                  <span><strong>{districtPercentage.toFixed(1)}%</strong><small>Districts</small></span>
                </div>
                <b>{data.districts.toLocaleString()} / {DIVISION_TOTALS.districts}</b>
                <small>registered districts</small>
              </div>
            </div>
            <p className="reach-users"><i className="gold-dot" /><span><strong>{data.totalUsers.toLocaleString()} total users</strong><small>Students and school personnel</small></span></p>
            <div className="user-distribution-chart">
              <strong>Registered users</strong>
              <div><span>Students <b>{data.students}</b></span><i><em className="student-user-bar" style={{ width: `${(data.students / activeUsers) * 100}%` }} /></i></div>
              <div><span>Teacher/School <b>{data.teachers}</b></span><i><em className="teacher-user-bar" style={{ width: `${(data.teachers / activeUsers) * 100}%` }} /></i></div>
            </div>
            {data.districtCounts.length > 0 && (
              <div className="district-count-list">
                <strong>Accounts by district</strong>
                {data.districtCounts.map((district, index) => <div className="district-graph-row" key={district.district} style={{ "--district-color": districtColors[index % districtColors.length] } as CSSProperties}><span>{district.district}<i><em style={{ width: `${(district.accounts / districtMaximum) * 100}%` }} /></i></span><b>{district.accounts}</b></div>)}
              </div>
            )}
          </div>
        </article>
      </div>
      <article className="panel school-year-report-panel">
        <div className="school-year-report-heading"><div><small>Incremental analytics</small><h2>Activity report by school year</h2><p>Automatically creates a new row every June from recorded resource activity.</p></div><span>Current: SY {currentSchoolYear}</span></div>
        <div className="school-year-report-table"><table><thead><tr><th>School year</th><th>Active resources</th><th>Previews</th><th>Downloads</th><th>Prints</th><th>Total activity</th><th>Annual change</th></tr></thead><tbody>{schoolYearReports.map((report, index) => { const previous = schoolYearReports[index + 1]; const change = previous?.totalActivity ? ((report.totalActivity - previous.totalActivity) / previous.totalActivity) * 100 : null; return <tr key={report.schoolYear} className={report.schoolYear === currentSchoolYear ? "current" : ""}><td><strong>SY {report.schoolYear}</strong>{report.schoolYear === currentSchoolYear && <small>Current</small>}</td><td>{report.resources.toLocaleString()}</td><td>{report.previews.toLocaleString()}</td><td>{report.downloads.toLocaleString()}</td><td>{report.prints.toLocaleString()}</td><td><b>{report.totalActivity.toLocaleString()}</b></td><td>{change === null ? <span className="trend neutral">Baseline</span> : <span className={`trend ${change >= 0 ? "up" : "down"}`}>{change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%</span>}</td></tr> })}</tbody></table></div>
        <footer><span>Live MySQL report · refreshes every 30 seconds</span><span>{schoolYearReports.length} school year{schoolYearReports.length === 1 ? "" : "s"} recorded</span></footer>
      </article>
    </>
  );
}
