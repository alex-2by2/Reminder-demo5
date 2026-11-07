# Owner Dashboard UI Design System

The owner console is hosted by the unified NestJS backend at `/owner/`.

- Dark graphite/navy canvas with soft indigo and teal ambient lighting.
- Translucent panels with selective 20–24px backdrop blur, subtle glass edges, and low-opacity depth shadows.
- Dense tables remain more opaque for legibility.
- Desktop sidebar, tablet layout, mobile bottom navigation, and responsive touch targets.
- Overview metrics, users directory, crash report feed, referral leaderboard, and connection/security status.
- Loading, empty, error, and disconnected states; no fake metrics or demo records.
- Keyboard navigation, visible focus, reduced-motion support, and solid fallbacks when backdrop-filter is unavailable.
- Destructive account actions require confirmation; backend authorization remains authoritative.
- The dashboard and API use the same HTTPS origin. No API URL, CORS wildcard, or separate dashboard host is required.
- Firebase client SDK is loaded from the pinned Firebase CDN; CSP is restricted to the Firebase/Google identity resources required for authentication.
- Keep these assets out of the end-user PWA bundle and its service-worker scope.