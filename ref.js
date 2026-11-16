/* Referral links: kingconnecttx.com/?ref=CODE. Saves the code on this device for 90 days so the
   contact form, website chat and setup wizard can pass it along, and shows a small welcome note. */
(() => {
  const KEY = 'kc_ref', DAYS = 90;
  const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  let code = '';
  try {
    const q = clean(new URLSearchParams(location.search).get('ref'));
    if (q) { localStorage.setItem(KEY, JSON.stringify({code: q, at: Date.now()})); code = q; }
    else { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.code && Date.now() - s.at < DAYS * 864e5) code = clean(s.code); else localStorage.removeItem(KEY); }
  } catch (e) {}
  window.KC_REF = () => code;
  if (!code || !document.body || document.querySelector('[data-no-ref-note]')) return;
  if (new URLSearchParams(location.search).get('ref')) {
    try { if (window.gtag) gtag('event', 'referral_visit', {code}); } catch (e) {}
    const n = document.createElement('div');
    n.setAttribute('role', 'status');
    n.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:60;max-width:520px;margin:0 auto;background:#0E1A22;color:#fff;border:1px solid #D29A2A;border-radius:10px;padding:12px 40px 12px 14px;font:15px/1.45 "Public Sans",system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)';
    n.innerHTML = '<b style="color:#D29A2A">A friend sent you.</b> Sign up and your first month is free. Your referral is saved on this device.';
    const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    x.style.cssText = 'position:absolute;top:6px;right:8px;background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:4px';
    x.onclick = () => n.remove(); n.append(x); document.body.append(n);
    setTimeout(() => { if (n.isConnected) n.remove(); }, 15000);
  }
})();
