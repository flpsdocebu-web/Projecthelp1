export type UserActionIconName = "reset" | "suspend" | "activate" | "delete";

export default function UserActionIcon({ name }: { name: UserActionIconName }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "reset" && <><circle cx="8" cy="9" r="4"/><path d="m11 12 8 8h3v-3h-3v-3h-3"/><path d="M7 8h.01"/></>}
    {name === "suspend" && <><circle cx="12" cy="12" r="9"/><path d="M9 8v8M15 8v8"/></>}
    {name === "activate" && <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>}
    {name === "delete" && <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>}
  </svg>;
}
