
// Same Firebase project the app itself uses — see js/01-core/01-bootstrap.js.
// This page only ever uses Firebase Auth (to prove who's signing in); every
// piece of DATA on this page comes from this server's own /api/* routes,
// which check that Auth identity against OWNER_UID/OWNER_EMAIL server-side.
// Nothing here talks to Firestore directly.
const firebaseConfig = {
  apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
  authDomain: "reminder-76588.firebaseapp.com",
  projectId: "reminder-76588",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const authError = document.getElementById('authError');
const whoLabel = document.getElementById('whoLabel');

let usersPageToken = null;

// userName (set via a free-text field in the app's own settings page — see
// js/01-core/03-sync-profile.js) and crash-report message/stack (built from
// a caught error's own .message, which a crafted error could shape) both
// reach this page as plain strings from Firestore, with no HTML sanitizing
// applied anywhere upstream — the app doesn't need to, since IT renders
// these with textContent/escInline, never innerHTML (see CHANGELOG.md's
// XSS-hardening pass). This page uses innerHTML for its table rows for
// simplicity, so every dynamic value gets run through this first. Skipping
// it on even one field would let a user's display name run arbitrary JS in
// *your* browser, with your admin session, the moment you looked at the
// users table.
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function api(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
  return data;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    await auth.signInWithEmailAndPassword(
      document.getElementById('email').value.trim(),
      document.getElementById('password').value
    );
    // onAuthStateChanged below takes it from here.
  } catch (err) {
    loginError.textContent = err.message || 'Sign-in failed.';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

document.getElementById('signOutBtn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    dashboard.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    return;
  }
  try {
    await api('/api/whoami');
    whoLabel.textContent = user.email || user.uid;
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadEverything();
  } catch (err) {
    // Signed in to Firebase, but not the configured owner — or the server
    // itself isn't configured yet. Don't show any data; say why plainly.
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    loginError.textContent = err.message || 'Not authorized.';
    auth.signOut();
  }
});

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString();
}

function loadEverything() {
  usersPageToken = null;
  loadStats();
  loadUsers(false);
  loadCrashReports();
  loadReferrals();
}

async function loadStats() {
  try {
    const [stats, revenue] = await Promise.all([
      api('/api/dashboard/stats'),
      api('/api/dashboard/revenue?days=30'),
    ]);
    const cards = [
      { label: 'Total Users', val: stats.totalUsers },
      { label: 'Pro Users', val: stats.proUsers },
      { label: 'Free Users', val: stats.freeUsers },
      { label: 'New Today', val: stats.newUsersToday },
      { label: 'New This Week', val: stats.newUsersThisWeek },
      { label: 'Crashes (24h)', val: stats.crashReportsLast24h },
      { label: 'Crashes (7d)', val: stats.crashReportsLast7d },
      { label: 'Revenue (30d)', val: '₹' + revenue.totalRupees.toLocaleString('en-IN') },
    ];
    document.getElementById('statGrid').innerHTML = cards.map((c) =>
      `<div class="stat-card"><div class="val">${c.val}</div><div class="label">${c.label}</div></div>`
    ).join('');
  } catch (err) {
    authError.textContent = err.message;
  }
}

async function loadUsers(append) {
  try {
    const qs = new URLSearchParams({ limit: '25' });
    if (append && usersPageToken) qs.set('pageToken', usersPageToken);
    const data = await api('/api/users?' + qs.toString());
    usersPageToken = data.nextPageToken;
    document.getElementById('usersNextBtn').style.display = usersPageToken ? '' : 'none';

    const rows = data.users.map((u) => {
      const p = u.profile || {};
      const planPill = p.isProUser
        ? '<span class="pill pill-pro">Pro</span>'
        : '<span class="pill pill-free">Free</span>';
      const statusPill = u.disabled ? '<span class="pill pill-disabled">Disabled</span>' : '—';
      return `<tr>
        <td>${esc(p.userName || 'User')}<br><span style="color:var(--text-dim); font-size:11px;">${esc(u.uid)}</span></td>
        <td>${esc(u.email || '—')}</td>
        <td>${planPill}</td>
        <td>${esc(fmtDate(p.joinedAt || u.createdAt))}</td>
        <td>${esc(fmtDate(u.lastSignInAt))}</td>
        <td>${statusPill}</td>
        <td class="actions">
          <button class="btn-outline btn-sm" data-act="${u.disabled ? 'enable' : 'disable'}" data-uid="${esc(u.uid)}">${u.disabled ? 'Enable' : 'Disable'}</button>
          <button class="btn-outline btn-sm" data-act="${p.isProUser ? 'revoke-pro' : 'grant-pro'}" data-uid="${esc(u.uid)}">${p.isProUser ? 'Revoke Pro' : 'Grant Pro'}</button>
          <button class="btn-danger-outline btn-sm" data-act="delete" data-uid="${esc(u.uid)}">Delete</button>
        </td>
      </tr>`;
    }).join('');

    const body = document.getElementById('usersBody');
    body.innerHTML = append ? body.innerHTML + rows : rows;
    document.getElementById('usersEmpty').classList.toggle('hidden', body.innerHTML.length > 0);
  } catch (err) {
    authError.textContent = err.message;
  }
}

document.getElementById('usersNextBtn').addEventListener('click', () => loadUsers(true));

document.getElementById('usersBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, uid } = btn.dataset;

  if (act === 'delete' && !confirm('Permanently delete this user\'s account and app data? This cannot be undone.')) return;
  if (act === 'revoke-pro' && !confirm('Revoke this user\'s Pro access?')) return;

  btn.disabled = true;
  try {
    if (act === 'disable') await api(`/api/users/${uid}/disable`, { method: 'POST' });
    else if (act === 'enable') await api(`/api/users/${uid}/enable`, { method: 'POST' });
    else if (act === 'grant-pro') await api(`/api/users/${uid}/grant-pro`, { method: 'POST', body: JSON.stringify({ days: 365 }) });
    else if (act === 'revoke-pro') await api(`/api/users/${uid}/revoke-pro`, { method: 'POST' });
    else if (act === 'delete') await api(`/api/users/${uid}`, { method: 'DELETE' });
    usersPageToken = null;
    loadUsers(false);
    loadStats();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

async function loadCrashReports() {
  try {
    const source = document.getElementById('crashSourceFilter').value;
    const qs = new URLSearchParams({ limit: '50' });
    if (source) qs.set('source', source);
    const data = await api('/api/crash-reports?' + qs.toString());
    const rows = data.reports.map((r) => `<tr>
      <td>${esc(fmtDate(r.ts))}</td>
      <td>${esc(r.source)}</td>
      <td style="white-space:normal; max-width:420px;">${esc((r.message || '').slice(0, 200))}</td>
      <td>${r.uid ? `<code>${esc(r.uid.slice(0, 8))}…</code>` : '—'}</td>
      <td>${esc(r.appVersion || '—')}</td>
    </tr>`).join('');
    document.getElementById('crashBody').innerHTML = rows;
    document.getElementById('crashEmpty').classList.toggle('hidden', data.reports.length > 0);
  } catch (err) {
    authError.textContent = err.message;
  }
}
document.getElementById('crashSourceFilter').addEventListener('change', loadCrashReports);

async function loadReferrals() {
  try {
    const data = await api('/api/referrals/leaderboard?limit=20');
    const rows = data.leaderboard.map((r) => `<tr>
      <td>${r.rank}</td><td>${esc(r.userName)}</td><td>${r.referralCount}</td><td>${r.coinBalance}</td>
    </tr>`).join('');
    document.getElementById('referralBody').innerHTML = rows;
    document.getElementById('referralEmpty').classList.toggle('hidden', data.leaderboard.length > 0);
  } catch (err) {
    authError.textContent = err.message;
  }
}
