"use client";

// A fresh public login route that keeps the existing secure authentication
// behavior while avoiding stale browser bundles cached for /login/.
export { default } from "../login/page";
