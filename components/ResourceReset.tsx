"use client";
import {useEffect} from "react";import {clearResourceFiles} from "@/lib/resourceFiles";
export default function ResourceReset(){useEffect(()=>{if(localStorage.getItem("helps_pdf_reset_version")==="2026-07-18-v2")return;localStorage.removeItem("helps_uploaded_resources");window.dispatchEvent(new Event("helps-resources-updated"));clearResourceFiles().finally(()=>localStorage.setItem("helps_pdf_reset_version","2026-07-18-v2"))},[]);return null}
