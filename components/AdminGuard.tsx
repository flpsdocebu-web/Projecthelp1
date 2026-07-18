"use client";
import {useEffect,useState} from "react";

export default function AdminGuard({children}:{children:React.ReactNode}){
 const[authorized,setAuthorized]=useState(false);
 useEffect(()=>{try{const session=JSON.parse(sessionStorage.getItem("helps_session")||"null");if(session?.role==="administrator"){setAuthorized(true);return}}catch{}window.location.replace("/login/")},[]);
 if(!authorized)return <main className="admin-loading"><div className="admin-logo-loader"><span/><img src="/project-helps-logo.png" alt="Project HELPS loading"/></div><p>Opening administrator dashboard…</p></main>;
 return <>{children}</>;
}
