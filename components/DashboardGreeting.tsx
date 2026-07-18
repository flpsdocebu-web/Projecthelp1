"use client";
import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default function DashboardGreeting() {
  const [greeting, setGreeting] = useState("day");
  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date().getHours()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <div><span className="eyebrow green">Dashboard overview</span><h1>Good {greeting}, Administrator</h1><p>Here’s how Project HELPS is supporting learners across Cebu Province.</p></div>;
}
