"use client";
import { useEffect,useState } from "react";
const intervalSeconds=180;
export default function DashboardAutoRefresh(){const[remaining,setRemaining]=useState(intervalSeconds);useEffect(()=>{const timer=window.setInterval(()=>setRemaining(value=>{if(value<=1){window.location.reload();return intervalSeconds}return value-1}),1000);return()=>window.clearInterval(timer)},[]);const minutes=Math.floor(remaining/60),seconds=remaining%60;return <div className="auto-refresh"><span className="refresh-pulse"/><div><small>Auto-refresh</small><strong>{minutes}:{String(seconds).padStart(2,"0")}</strong></div><button onClick={()=>window.location.reload()} title="Refresh dashboard now">↻</button></div>}
