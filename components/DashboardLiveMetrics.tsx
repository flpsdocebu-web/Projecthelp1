"use client";

import { useEffect, useMemo, useState } from "react";

type Month = { month: string; downloads: number; prints: number };
type DistrictCount = { district: string; accounts: number; schools: number };
type Data = {
  students: number;
  teachers: number;
  downloads: number;
  prints: number;
  districts: number;
  schools: number;
  totalUsers: number;
  months: Month[];
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
  districtCounts: [],
};

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
    districtCounts: Array.isArray(payload?.districtCounts) ? payload.districtCounts : [],
  };
}

export default function DashboardLiveMetrics() {
  const [data, setData] = useState<Data>(empty);

  useEffect(() => {
    const load = () =>
      fetch("/api/stats", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((payload) => setData(normalize(payload)))
        .catch(() => setData(empty));

    load();
    const timer = window.setInterval(load, 180000);
    return () => window.clearInterval(timer);
  }, []);

  const months = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        const key = date.toISOString().slice(0, 7);
        const found = data.months.find((month) => month.month === key);
        return {
          label: date.toLocaleString("en", { month: "short" }),
          downloads: Number(found?.downloads || 0),
          prints: Number(found?.prints || 0),
        };
      }),
    [data.months],
  );

  const maximum = Math.max(1, ...months.flatMap((month) => [month.downloads, month.prints]));
  const stats = [
    { icon: "♙", label: "Student users", value: data.students, color: "blue" },
    { icon: "♟", label: "Teacher/School users", value: data.teachers, color: "green-bg" },
    { icon: "⇩", label: "PDF downloads", value: data.downloads, color: "gold" },
    { icon: "♧", label: "Printed files", value: data.prints, color: "purple" },
  ];

  return (
    <>
      <div className="live-badge"><i />Live MySQL data · refreshes every 3 minutes</div>
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
          <div className="panel-head"><div><strong>Resource activity</strong><span>Hover over a bar for exact counts</span></div></div>
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
        </article>
        <article className="panel reach-panel">
          <div className="panel-head"><div><strong>Program reach</strong><span>Registered school accounts</span></div></div>
          <div className="reach">
            <div className={`ring ${data.schools ? "" : "reset-ring"}`}><span><strong>{data.schools}</strong><small>Schools</small></span></div>
            <div>
              <p><i className="green-dot" /><span><strong>{data.districts} districts</strong><small>Centralized records</small></span></p>
              <p><i className="gold-dot" /><span><strong>{data.totalUsers} total users</strong><small>Students and school personnel</small></span></p>
            </div>
            {data.districtCounts.length > 0 && (
              <div className="district-count-list">
                <strong>Accounts by district</strong>
                {data.districtCounts.map((district) => <div key={district.district}><span>{district.district}</span><b>{district.accounts}</b></div>)}
              </div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
