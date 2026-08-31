"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const manualInstallMessage = () => navigator.userAgent.toLowerCase().includes("mac")
  ? "On Mac: open this website in Safari, choose Share, then Add to Dock."
  : "On Windows: open the browser menu, choose Apps, then Install this site as an app. After installation, right-click the app icon and choose Pin to taskbar.";

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) return window.alert(manualInstallMessage());
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  return <button className="btn pwa-install-button" type="button" onClick={install}>Install app</button>;
}
