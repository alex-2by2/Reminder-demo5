# Owner Dashboard UI Design System

Status: visual direction retained; authentication guidance below reflects the integrated Owner ID session console. This specification does not authorize production API cutover.

## Visual direction

Use a modern, restrained Liquid Glass interface inspired by current platform glass materials: translucent layered surfaces, soft background diffusion, fine specular borders, subtle depth, and clear typography. The dashboard must feel professional and operational, not like a neon gaming UI.

### Design principles

- Glass is a surface treatment, not a readability compromise. Primary content panels use sufficient contrast and an opaque fallback.
- Use blur selectively for navigation, floating controls, and elevated panels; keep dense tables and long data views more solid.
- Use restrained accent colors: cool indigo/blue for primary actions, teal for healthy states, amber for warnings, and red only for destructive/error states.
- Use subtle motion (150–220 ms) for hover, focus, drawer, and panel transitions. Respect `prefers-reduced-motion`.
- Maintain WCAG AA contrast for text and controls. Never communicate status by color alone.
- Avoid excessive glow, oversized gradients, glass-on-glass stacking, and tiny low-contrast labels.

## Design tokens

| Token | Direction |
| --- | --- |
| App background | Deep graphite/navy in dark mode; cool mist in light mode |
| Main glass | White 8–12% opacity in dark mode; white 68–82% in light mode |
| Glass border | 1px subtle white/blue edge with restrained top highlight |
| Blur | 16–24px for navigation and floating panels; 8–12px for compact controls |
| Radius | 18–24px panels; 12–16px controls; full pill only for compact status/action chips |
| Shadow | Broad, soft, low-opacity shadow; no hard black outlines |
| Typography | System UI / Inter-style sans-serif; clear 12/14/16/20/28px hierarchy |
| Spacing | 4px base scale; generous panel padding; compact table density on mobile |
| Focus | Visible 2px high-contrast focus ring with offset |
| Motion | 150–220ms ease-out; reduced-motion alternative |

## Responsive application shell

- Desktop: persistent left navigation rail/sidebar, top command/header row, fluid content canvas.
- Tablet: collapsible navigation and two-column metric cards.
- Mobile: compact top bar, bottom navigation or slide-over menu, one-column cards, horizontally scrollable data tables with clear row labels.
- Safe-area insets must be respected on mobile devices.
- Keep all important actions reachable by touch with at least 44px target sizing.

## Dashboard screens

1. **Overview** — metric cards for total users, Pro users, successful payment totals, crash reports, and referrals; show loading, empty, and error states distinctly.
2. **Users** — searchable/paginated user list with limited profile fields, verification and account status. Disable/enable is a destructive/high-impact action with a confirmation dialog and clear self-disable protection message.
3. **Crash reports** — paginated report list, readable detail drawer, copy-safe diagnostics; do not expose fields not returned by the API allowlist.
4. **Referrals** — ranked referral list with pagination and clear zero-data state.
5. **Access & security** — signed-in owner identity, access status, API environment label, last refresh, and sign-out. Never display ID tokens or secrets.

## Component behavior

- Metric cards: translucent surface with subtle top edge; numeric value is dominant, label and trend/context remain readable.
- Data tables: solid/near-solid glass surface for legibility; sticky header only on larger screens; responsive card rows on narrow screens.
- Status chips: text plus icon/label, never color alone.
- Dialogs: centered modal on desktop, full-height sheet on mobile; destructive action requires explicit confirmation.
- Notifications: concise success/error toast with accessible live-region announcement.
- Empty/loading/error states: skeleton only while loading; honest empty state when API returns no records; retry action for recoverable errors.
- Navigation: active item has a restrained translucent highlight, not a large glowing pill.

## Accessibility and resilience

- Keyboard navigation and visible focus on every interactive element.
- Semantic landmarks, headings, labels, table captions, and accessible dialog focus management.
- Support 200% zoom without horizontal page overflow.
- Respect reduced motion and forced-colors settings.
- Provide solid-color fallbacks when `backdrop-filter` is unsupported.
- Never place critical text over a moving or busy background.

## API and security boundaries

- The UI is a separate owner-only client; it must not be bundled into the end-user PWA.
- Owner-console sign-in uses only the server-side `OWNER_LOGIN_ID` and `OWNER_PASSWORD`; the backend issues a Secure, HttpOnly, SameSite=Strict session cookie backed by MongoDB.
- Every owner API request requires a valid Owner ID session; Firebase ID bearer tokens do not authenticate the owner console.
- `OWNER_UIDS` and `OWNER_EMAILS` are backend-only protection allowlists for Firebase product-owner accounts that must not be disabled. They do not grant owner-console access.
- UI route protection is not authorization. The API must reject missing or invalid Owner ID sessions and enforce same-origin CSRF checks for state-changing requests.
- No service-account key, MongoDB URI, owner password, session token, or protection allowlist is shipped to the browser.
- Only render user fields and crash-report fields explicitly returned by the API.
- Do not invent metrics or show fabricated sample records. Use explicit skeleton, empty, or error states until real staging data is returned.
- Configure exact staging/production API origins and CORS separately. Never reuse the legacy Express URL as the NestJS API base URL.

## Implementation gate

Before connecting real data, confirm the exact target NestJS Render service and URL, configure `OWNER_LOGIN_ID` and `OWNER_PASSWORD` only in that service's secret settings, and configure `OWNER_UIDS` and/or `OWNER_EMAILS` only to protect product-owner Firebase accounts from disable actions. Test Owner ID login, session restore/logout, invalid-session rejection, and CSRF checks in staging. Build and verify the dashboard in isolation; do not alter the PWA build order, service worker scope, Firestore persistence, Firebase Rules, existing Render services, or production data.
