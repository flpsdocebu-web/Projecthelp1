import { redirect } from "next/navigation";

export default function LandingPortal() {
  // Serve the static portal directly. This avoids hydrating an unnecessary
  // iframe wrapper and keeps the landing page available even if a cached
  // Next.js client bundle belongs to an older Hostinger deployment.
  redirect("/landing/index.html");
}
