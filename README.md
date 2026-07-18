# Project HELPS

Production-ready Next.js website for the Flexible Learning Program portal and Project HELPS resource system of SDO Cebu Province.

## Website routes

- `/` — Flexible Learning Program landing portal
- `/home/` — Project HELPS homepage
- `/login/` — account login and registration
- `/library/` — Learning Activity Sheet library
- `/dashboard/` — administrator dashboard
- `/users/` — administrator user management

## Local development

1. Copy `.env.example` to `.env.local` and replace the placeholders.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

## Hostinger deployment

Use the repository root as the application directory.

- Build command: `npm run build`
- Start command: `npm run start`
- Node.js version: 20 or newer

Add these variables through Hostinger's environment-variable settings. Do not commit their real values:

- `NEXT_PUBLIC_DEFAULT_ADMIN_USERNAME`
- `NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD`
- `NEXT_PUBLIC_DELETE_ALL_PIN`

The current account and resource data layer uses browser storage. Production email delivery and a shared SQL database require server-side services and separate secure credentials.
