# Backend server (Render + MongoDB/Firebase)

This repository now includes a standalone backend in `server/` for deployment to Render while keeping the existing static frontend open to all users.

## Access model

- **Frontend:** public. Host it on Firebase Hosting, GitHub Pages, Netlify, or any static host.
- **Normal backend user routes:** require a valid Firebase Auth ID token in `Authorization: Bearer <idToken>`.
- **Owner backend routes:** require Firebase Auth plus the caller's UID or email to appear in `OWNER_UIDS` or `OWNER_EMAILS`.

Owner-only routes currently live under `/api/owner/*`, for example:

- `GET /api/owner/users`
- `POST /api/owner/announcements`

## Local setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
