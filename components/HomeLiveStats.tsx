"use client";

import { useEffect, useState } from "react";

type Stats = { students: number; teachers: number; districts: number; schools: number; resources: number; downloads: number };
const empty: Stats = { students: 0, teachers: 0, districts: 0, schools: 0, resources: 0, downloads: 0 };

function safeStats(value: Partial<Stats> | null | undefined): Stats {
  return {
    students: Number(value?.students || 0),
    teachers: Number(value?.teachers || 0),
    districts: Number(value?.districts || 0),
    schools: Number(value?.schools || 0),
    resources: Number(value?.resources || 0),
    downloads: Number(value?.downloads || 0),
  };
}

function AnimatedNumber({ value, replay }: { value: number; replay: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / 4000);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, replay]);
  return <>{display.toLocaleString()}</>;
}

export default function HomeLiveStats({ location }: { location: "hero" | "numbers" }) {
  const [data, setData] = useState<Stats>(empty);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const load = () => fetch("/api/stats", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((value) => setData(safeStats(value)))
      .catch(() => setData(empty));
    load();
    const timer = window.setInterval(load, 180000);
    return () => window.clearInterval(timer);
  }, []);

  const animate = () => setReplay((value) => value + 1);
  if (location === "hero") return <div className="floating-stat top interactive-live-stat" role="button" tabIndex={0} onMouseEnter={animate} onClick={animate}><b><AnimatedNumber value={data.downloads} replay={replay} /></b><span>Resources downloaded</span></div>;

  const stats = [
    { value: data.students, label: "Active student users", icon: "♙" },
    { value: data.teachers, label: "Teacher/School users", icon: "♟" },
    { value: data.districts, label: "Districts registered", icon: "●" },
    { value: data.schools, label: "Schools registered", icon: "⌂" },
    { value: data.resources, label: "Learning Activity Sheets uploaded", icon: "▤" },
  ];
  return <section className="numbers live-home-numbers">{stats.map((stat) => <button key={stat.label} onMouseEnter={animate} onClick={animate}><i>{stat.icon}</i><strong><AnimatedNumber value={stat.value} replay={replay} /></strong><span>{stat.label}</span><small>Live database count</small></button>)}</section>;
}
