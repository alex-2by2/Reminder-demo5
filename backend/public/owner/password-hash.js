'use strict';
(() => {
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const generate = document.getElementById('generate');
  const status = document.getElementById('status');
  const result = document.getElementById('result');
  const output = document.getElementById('hash');
  const copy = document.getElementById('copy');
  const toHex = (bytes) => Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  generate.addEventListener('click', async () => {
    result.hidden = true;
    status.textContent = '';
    const value = password.value;
    if (value.length < 12) { status.textContent = 'Use at least 12 characters.'; return; }
    if (value !== confirm.value) { status.textContent = 'Passwords do not match.'; return; }
    if (!window.isSecureContext || !crypto.subtle) { status.textContent = 'Open this tool using its secure HTTPS address.'; return; }
    generate.disabled = true;
    status.textContent = 'Generating hash on this device…';
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000}, material, 512);
      output.value = 'pbkdf2$sha256$600000$' + toHex(salt) + '$' + toHex(new Uint8Array(bits));
      result.hidden = false;
      password.value = '';
      confirm.value = '';
      status.textContent = 'Hash generated successfully on this device.';
    } catch (_) {
      status.textContent = 'Could not generate the hash. Please try again.';
    } finally { generate.disabled = false; }
  });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); copy.textContent = 'Copied'; }
    catch (_) { output.focus(); output.select(); status.textContent = 'Select and copy the hash manually.'; }
  });
})();
