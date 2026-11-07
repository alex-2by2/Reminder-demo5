(function () {
  'use strict';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY',
    authDomain: 'reminder-76588.firebaseapp.com',
    projectId: 'reminder-76588',
    storageBucket: 'reminder-76588.firebasestorage.app',
    messagingSenderId: '813515230126',
    appId: '1:813515230126:web:dde11175645257dc44d63f'
  };
  const $ = (id) => document.getElementById(id);
  const state = { user: null, apiBase: window.location.origin, owner: false, usersToken: null, usersPage: 0, crashCursor: null, crashHasMore: false, crashCount: 0, users: [], page: 'overview', authGeneration: 0 };
  const authApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  const auth = authApp.auth();

  function toast(message, type) {
    const item = document.createElement('div');
    item.className = 'toast ' + (type || '');
    item.textContent = message;
    $('toastRegion').appendChild(item);
    window.setTimeout(() => item.remove(), 4200);
  }
  function setText(id, value) { $(id).textContent = value == null ? '—' : String(value); }
  function showError(error) {
    if (error && error.code === 'STALE_AUTH_SESSION') return;
    const message = error && error.message ? error.message : 'Something went wrong. Please try again.';
    toast(message, 'error');
  }
  function money(paise) {
    const amount = Number(paise);
    if (!Number.isFinite(amount)) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
  }
  function dateText(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function setConnectionMessage(message, type) {
    const el = $('connectionMessage');
    el.textContent = message || '';
    el.style.color = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--muted)';
  }
  function normalizeApiUrl(value) {
    let url;
    try { url = new URL(value.trim() || window.location.origin); } catch (_) { throw new Error('Enter a valid API URL.'); }
    if (url.protocol !== 'https:') throw new Error('Only HTTPS API URLs are allowed.');
    if (url.username || url.password || url.search || url.hash) throw new Error('API URL cannot contain credentials, query parameters or fragments.');
    if (url.pathname !== '/' && url.pathname !== '') throw new Error('Enter the API origin only, without a path.');
    if (url.origin !== window.location.origin) throw new Error('The dashboard and API must use the same backend origin.');
    return url.origin;
  }
  async function api(path, options, userOverride) {
    if (!state.apiBase) throw new Error('Configure the NestJS API URL first.');
    const requestUser = userOverride || state.user;
    const requestGeneration = state.authGeneration;
    if (!requestUser || state.user !== requestUser) throw new Error('Sign in again to continue.');
    const token = await requestUser.getIdToken();
    if (state.authGeneration !== requestGeneration || state.user !== requestUser) {
      const error = new Error('The account changed while this request was starting.');
      error.code = 'STALE_AUTH_SESSION';
      throw error;
    }
    const response = await fetch(state.apiBase + path, {
      method: (options && options.method) || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/json' }, options && options.body ? { 'Content-Type': 'application/json' } : {}, options && options.headers || {}),
      body: options && options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      credentials: 'omit'
    });
    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) payload = await response.json();
    if (state.authGeneration !== requestGeneration || state.user !== requestUser) {
      const error = new Error('The account changed before this response completed.');
      error.code = 'STALE_AUTH_SESSION';
      throw error;
    }
    if (response.status === 401) {
      if (state.user === requestUser) await auth.signOut();
      throw new Error('Session expired or token rejected. Please sign in again.');
    }
    if (response.status === 403) throw new Error('Access denied. This Firebase account is not on the backend owner allowlist.');
    if (!response.ok) {
      const message = payload && (payload.message || payload.error);
      throw new Error(Array.isArray(message) ? message.join(', ') : message || 'API request failed (' + response.status + ').');
    }
    return payload;
  }
  function setPage(page) {
    state.page = page;
    document.querySelectorAll('.page').forEach((section) => section.classList.toggle('hidden', section.id !== 'page-' + page));
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
    const labels = { overview: 'Overview', users: 'Users', crashes: 'Crash reports', referrals: 'Referrals', settings: 'Connection & security' };
    setText('pageCrumb', labels[page] || 'Overview');
    if (page === 'overview') loadOverview();
    if (page === 'users' && !state.users.length) loadUsers(true);
    if (page === 'crashes') loadCrashes(false);
    if (page === 'referrals') loadReferrals();
  }
  function showSignedInShell(user) {
    // Invalidate pending authorization checks from the previous Firebase session.
    const generation = ++state.authGeneration;
    state.owner = false;
    state.user = user;
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    setText('ownerEmail', user.email || 'Owner');
    setText('securityEmail', user.email || '—');
    setText('avatarInitial', (user.displayName || user.email || 'O').charAt(0).toUpperCase());
    setText('firebaseStatus', 'Authenticated');
    $('apiBaseUrl').value = state.apiBase;
    setPage('overview');
    if (state.apiBase) verifyOwnerAccess(generation, user).catch((error) => {
      if (state.authGeneration === generation && state.user === user) showError(error);
    });
  }
  async function verifyOwnerAccess(generation = state.authGeneration, user = state.user) {
    if (!user || state.user !== user || state.authGeneration !== generation) return false;
    if (!state.apiBase) {
      setText('ownerStatus', 'Not verified');
      setText('apiStatus', 'Not configured');
      setText('securityOwner', 'Not verified');
      setText('environmentPill', 'API not connected');
      $('accessBanner').classList.remove('hidden');
      return false;
    }
    setText('apiStatus', 'Checking…');
    try {
      const health = await fetch(state.apiBase + '/health', { cache: 'no-store', credentials: 'omit' });
      if (!health.ok) throw new Error('API health check returned HTTP ' + health.status + '.');
      const access = await api('/api/v1/admin/access', undefined, user);
      if (state.authGeneration !== generation || state.user !== user) return false;
      if (!access || access.access !== 'owner' || !access.uid) throw new Error('The API did not confirm owner access.');
      state.owner = true;
      $('accessBanner').classList.add('hidden');
      setText('ownerStatus', 'Verified owner');
      setText('securityOwner', 'Verified · ' + access.uid);
      setText('apiStatus', 'Connected');
      setText('healthStatus', 'Secure connection');
      $('healthStatus').className = 'status-chip ok';
      setText('environmentPill', 'NestJS · Connected');
      setText('securityEnvironment', new URL(state.apiBase).host);
      setConnectionMessage('Owner access verified. Dashboard data can now load.', 'success');
      if (state.page === 'overview' && state.authGeneration === generation && state.user === user) await loadOverview();
      return true;
    } catch (error) {
      if (state.authGeneration !== generation || state.user !== user) return false;
      state.owner = false;
      setText('ownerStatus', 'Not authorized');
      setText('securityOwner', 'Not verified');
      setText('apiStatus', 'Connection failed');
      setText('healthStatus', 'Needs attention');
      $('healthStatus').className = 'status-chip bad';
      setText('environmentPill', 'API unavailable');
      $('accessBanner').classList.remove('hidden');
      throw error;
    }
  }
  async function loadOverview() {
    if (!state.owner) return;
    try {
      const data = await api('/api/v1/admin/overview');
      setText('metricUsers', Number(data.totalUsers || 0).toLocaleString('en-IN'));
      setText('metricPro', Number(data.proUsers || 0).toLocaleString('en-IN'));
      setText('metricPayments', Number(data.successfulPayments || 0).toLocaleString('en-IN'));
      setText('metricRevenue', money(data.revenuePaise));
      setText('metricCrashes', Number(data.crashReports || 0).toLocaleString('en-IN'));
      setText('metricReferrals', Number(data.referredUsers || 0).toLocaleString('en-IN'));
      setText('lastUpdated', 'Updated ' + new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
    } catch (error) { showError(error); }
  }
  async function loadUsers(reset) {
    if (!state.owner) return;
    if (reset) { state.usersToken = null; state.users = []; state.usersPage = 0; }
    $('usersBody').replaceChildren(node('tr', '', ''));
    $('usersBody').firstChild.appendChild(node('td', 'empty-cell', 'Loading users…'));
    $('usersBody').firstChild.firstChild.colSpan = 7;
    $('usersNext').disabled = true;
    try {
      const query = new URLSearchParams({ limit: '50' });
      if (state.usersToken) query.set('pageToken', state.usersToken);
      const result = await api('/api/v1/admin/users?' + query.toString());
      state.users = state.users.concat(result.users || []);
      state.usersToken = result.nextPageToken || null;
      state.usersPage += 1;
      renderUsers();
      setText('usersPageInfo', 'Page ' + state.usersPage + ' · ' + state.users.length + ' loaded');
      $('usersNext').disabled = !state.usersToken;
    } catch (error) {
      if (error && error.code === 'STALE_AUTH_SESSION') return;
      showError(error);
      $('usersBody').replaceChildren();
    }
  }
  function renderUsers() {
    const body = $('usersBody');
    body.replaceChildren();
    const term = $('userSearch').value.trim().toLowerCase();
    const rows = state.users.filter((user) => [user.displayName, user.email, user.uid].some((value) => String(value || '').toLowerCase().includes(term)));
    if (!rows.length) {
      const tr = node('tr'); const td = node('td', 'empty-cell', state.users.length ? 'No matching users.' : 'No users returned.');
      td.colSpan = 7; tr.appendChild(td); body.appendChild(tr); return;
    }
    rows.forEach((user) => {
      const tr = node('tr');
      const account = node('td'); account.appendChild(node('strong', '', user.displayName || 'Unnamed user')); account.appendChild(node('span', 'subline', user.email || 'No email'));
      const uid = node('td'); uid.appendChild(node('span', 'subline', user.uid));
      const joined = node('td', '', dateText(user.joinedAt || user.createdAt));
      const plan = node('td', '', user.isProUser ? 'Pro' : 'Free');
      const verified = node('td', '', user.emailVerified ? 'Verified' : 'Unverified');
      const status = node('td'); status.appendChild(node('span', 'status-label' + (user.disabled ? ' disabled' : ''), user.disabled ? 'Disabled' : 'Active'));
      const action = node('td'); const button = node('button', 'button small ' + (user.disabled ? 'secondary' : 'danger-outline'), user.disabled ? 'Enable' : 'Disable');
      button.addEventListener('click', () => confirmUserChange(user)); action.appendChild(button);
      [account, uid, joined, plan, verified, status, action].forEach((cell) => tr.appendChild(cell));
      body.appendChild(tr);
    });
  }
  function confirmUserChange(user) {
    const nextDisabled = !user.disabled;
    setText('confirmTitle', nextDisabled ? 'Disable this account?' : 'Re-enable this account?');
    setText('confirmText', (nextDisabled ? 'The user will lose sign-in access.' : 'The user will be able to sign in again.') + ' Account: ' + (user.email || user.uid));
    const dialog = $('confirmDialog');
    const confirm = $('confirmAction');
    confirm.textContent = nextDisabled ? 'Disable account' : 'Enable account';
    confirm.className = 'button ' + (nextDisabled ? 'danger' : 'primary');
    const handler = async (event) => {
      if (event.submitter && event.submitter.value === 'confirm') {
        confirm.removeEventListener('click', handler);
        try {
          await api('/api/v1/admin/users/' + encodeURIComponent(user.uid), { method: 'PATCH', body: { disabled: nextDisabled } });
          user.disabled = nextDisabled;
          renderUsers();
          toast(nextDisabled ? 'Account disabled.' : 'Account re-enabled.', 'success');
        } catch (error) { showError(error); }
      }
    };
    dialog.querySelector('form').addEventListener('submit', handler, { once: true });
    dialog.showModal();
  }
  async function loadCrashes(next) {
    if (!state.owner) return;
    const cursor = next ? state.crashCursor : null;
    if (!next) { state.crashCursor = null; state.crashCount = 0; $('crashList').replaceChildren(node('p', 'empty-cell', 'Loading reports…')); }
    $('crashesNext').disabled = true;
    try {
      const query = new URLSearchParams({ limit: '30' });
      if (cursor) query.set('cursor', cursor);
      const result = await api('/api/v1/admin/crash-reports?' + query.toString());
      const reports = result.reports || [];
      if (!next) $('crashList').replaceChildren();
      reports.forEach((report) => {
        const card = node('article', 'report-item');
        card.appendChild(node('strong', '', report.message || 'Unspecified client error'));
        card.appendChild(node('p', '', report.stack || report.source || 'No diagnostic detail supplied.'));
        card.appendChild(node('div', 'report-meta', [dateText(report.ts), report.appVersion || 'Version unknown', report.uid ? 'UID ' + report.uid : 'Anonymous'].join(' · ')));
        $('crashList').appendChild(card);
      });
      state.crashCursor = result.nextCursor || null;
      state.crashHasMore = !!state.crashCursor;
      state.crashCount += reports.length;
      setText('crashCount', state.crashCount + ' loaded');
      setText('crashPageInfo', state.crashHasMore ? 'More reports available' : 'End of reports');
      $('crashesNext').disabled = !state.crashHasMore;
      if (!state.crashCount) $('crashList').replaceChildren(node('p', 'empty-cell', 'No crash reports found.'));
    } catch (error) { showError(error); }
  }
  async function loadReferrals() {
    if (!state.owner) return;
    $('referralList').replaceChildren(node('p', 'empty-cell', 'Loading referrals…'));
    try {
      const result = await api('/api/v1/admin/referrals?limit=100');
      const referrals = result.referrals || [];
      const list = $('referralList'); list.replaceChildren();
      referrals.forEach((item, index) => {
        const row = node('div', 'referral-item');
        row.appendChild(node('span', 'rank', String(index + 1)));
        const label = node('div'); label.appendChild(node('strong', '', item.displayName || 'User')); label.appendChild(node('small', '', item.uid));
        row.appendChild(label); row.appendChild(node('span', 'referral-count', String(item.referralCount || 0)));
        list.appendChild(row);
      });
      if (!referrals.length) list.appendChild(node('p', 'empty-cell', 'No referral activity yet.'));
    } catch (error) {
      if (error && error.code === 'STALE_AUTH_SESSION') return;
      showError(error);
      $('referralList').replaceChildren();
    }
  }
  async function saveApiConnection() {
    const generation = state.authGeneration;
    const user = state.user;
    try {
      const normalized = normalizeApiUrl($('apiBaseUrl').value);
      state.apiBase = normalized;
      setConnectionMessage('Checking API health and owner authorization…');
      const verified = await verifyOwnerAccess(generation, user);
      if (state.authGeneration !== generation || state.user !== user) return;
      if (verified) toast('NestJS API connected and owner access verified.', 'success');
    } catch (error) {
      if (error && error.code === 'STALE_AUTH_SESSION') return;
      if (state.authGeneration !== generation || state.user !== user) return;
      setConnectionMessage(error.message, 'error');
      showError(error);
    }
  }
  async function signIn() {
    $('loginError').textContent = '';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (error) {
      $('loginError').textContent = error.code === 'auth/popup-closed-by-user' ? 'Sign-in window was closed.' : error.message || 'Sign-in failed.';
    }
  }
  async function signOut() { ++state.authGeneration; state.owner = false; await auth.signOut(); }
  function bindEvents() {
    $('googleSignIn').addEventListener('click', signIn);
    $('profileButton').addEventListener('click', signOut);
    $('signOutButton').addEventListener('click', signOut);
    $('saveApiButton').addEventListener('click', saveApiConnection);
    $('refreshButton').addEventListener('click', () => {
      if (!state.owner) return verifyOwnerAccess().catch(showError);
      if (state.page === 'overview') loadOverview();
      if (state.page === 'users') loadUsers(true);
      if (state.page === 'crashes') loadCrashes(false);
      if (state.page === 'referrals') loadReferrals();
    });
    document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.page)));
    document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.go)));
    $('usersReload').addEventListener('click', () => loadUsers(true));
    $('usersNext').addEventListener('click', () => loadUsers(false));
    $('userSearch').addEventListener('input', renderUsers);
    $('crashesReload').addEventListener('click', () => loadCrashes(false));
    $('crashesNext').addEventListener('click', () => loadCrashes(true));
    $('referralsReload').addEventListener('click', loadReferrals);
  }
  bindEvents();
  state.apiBase = window.location.origin;
  auth.onAuthStateChanged((user) => {
    if (user) showSignedInShell(user);
    else {
      ++state.authGeneration;
      state.user = null; state.owner = false;
      $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden');
      setText('firebaseStatus', 'Signed out');
    }
  });
})();