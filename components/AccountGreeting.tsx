"use client";

import { useEffect, useState } from "react";

type Session = { username:string; name:string; role:"administrator"|"school"|"student" };
function greetingFor(hour:number){if(hour<12)return"morning";if(hour<18)return"afternoon";return"evening"}

export default function AccountGreeting(){
  const[session,setSession]=useState<Session|null>(null),[greeting,setGreeting]=useState("day");
  useEffect(()=>{const update=()=>setGreeting(greetingFor(new Date().getHours()));update();const timer=window.setInterval(update,60_000);fetch("/api/auth/session",{cache:"no-store"}).then(response=>response.ok?response.json():Promise.reject()).then(({user})=>setSession(user||null)).catch(()=>setSession(null));return()=>window.clearInterval(timer)},[]);
  if(!session||session.role==="administrator")return null;
  const name=session.name||session.username;
  return <section className="account-greeting"><div><span className="eyebrow green">Welcome to Project HELPS</span><h1>Good {greeting}, {name}</h1><p>{session.role==="school"?"Ready to support your learners with accessible, curriculum-aligned resources.":"Ready to continue learning with activities prepared for Cebu Province learners."}</p></div></section>;
}
