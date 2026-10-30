"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

export type LasThumbnail = { url: string; width: number; height: number; custom: boolean };
export const defaultLasThumbnail: LasThumbnail = { url: "/phelps-resource-cover.png", width: 1532, height: 876, custom: false };
const Context = createContext({ thumbnail: defaultLasThumbnail, setThumbnail: (_thumbnail: LasThumbnail) => {} });
export const useLasThumbnail = () => useContext(Context);

export default function LasThumbnailProvider({ children }: { children: ReactNode }) {
  const [thumbnail, updateThumbnail] = useState(defaultLasThumbnail);
  const generation = useRef(0);
  const setThumbnail = useCallback((value: LasThumbnail) => { generation.current += 1; updateThumbnail(value); }, []);
  useEffect(() => {
    let active = true, busy = false;
    const controller = new AbortController();
    const load = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      const startedAt = generation.current;
      try {
        const response = await fetch("/api/las-thumbnail", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (active && startedAt === generation.current && result.thumbnail) updateThumbnail(result.thumbnail);
      } catch { /* Keep the last working cover during temporary service failures. */ }
      finally { busy = false; }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, []);
  return <Context.Provider value={{ thumbnail, setThumbnail }}>{children}</Context.Provider>;
}
