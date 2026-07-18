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

Import `database/schema.sql` into the Hostinger database using phpMyAdmin, then add these server-only variables through Hostinger's environment-variable settings. Do not commit their real values:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- `ADMIN_DELETE_PIN`

Accounts use bcrypt password hashes and opaque HTTP-only database sessions. PDFs, activity logs, account records, districts, schools, and dashboard statistics are centralized in MySQL. Secure password-reset email delivery still requires Hostinger SMTP variables and a transactional mail route.
