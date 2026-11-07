# Owner Dashboard UI Design System

The owner dashboard uses a modern, restrained Liquid Glass visual language.

- Dark graphite/navy canvas with soft indigo and teal ambient lighting.
- Translucent panels with selective 20–24px backdrop blur, subtle one-pixel glass edges, and low-opacity depth shadows.
- Dense tables remain more opaque for legibility; blur is reserved for navigation, headers, and elevated panels.
- Desktop sidebar, responsive tablet layout, mobile bottom navigation, safe-area spacing, and touch targets of at least 44px.
- Metric cards, users directory, crash report feed, referral leaderboard, and connection/security settings.
- Clear loading, empty, error, and disconnected states. No fake metrics or demo records.
- Keyboard navigation, visible focus, reduced-motion support, contrast-aware text, and solid fallbacks when backdrop-filter is unavailable.
- Destructive account actions require confirmation; client-side route hiding is never treated as authorization.

## Runtime security and integration

- Firebase client authentication is used only to obtain a user identity token.
- Every API request sends a current Firebase ID token over HTTPS; the token is not manually persisted.
- NestJS independently verifies the token and owner allowlist before returning owner data.
- No service-account credentials, MongoDB URI, or owner allowlist is shipped to the browser.
- Configure the exact dashboard origin in NestJS `FRONTEND_ORIGINS` before browser API requests can succeed.
- The API base URL must be the exact NestJS `easy-life-tools-api` Render origin. The legacy Express URL is rejected by the dashboard client.
- Host this directory as a separate static application. Do not include it in the user PWA bundle or change its service-worker scope.

## Release gate

Before connecting staging or production data, verify the staging API URL, exact dashboard origin, Firebase authorized domain, and staging owner UID allowlist. Exercise owner and non-owner sign-in, 401/403 handling, user pagination, crash cursor paging, account disable confirmation, and CORS from the deployed dashboard origin.