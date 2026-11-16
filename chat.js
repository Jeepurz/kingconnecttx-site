/* King Connect website chat.
   A scripted helper (no AI, no outside service): runs a quick fit check, answers common questions,
   hands good fits the right pay link, and saves their answers so the setup wizard at /setup opens
   pre-filled on the same device. Leads go to the same Google Form as the contact form. */
(() => {
if (window.__kcChat) return; window.__kcChat = true;

const PHONE = '(903) 251-5127', PHONE_TEL = '+19032515127', EMAIL = 'info@kingconnecttx.com';
const BOOK = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ04JgXvoi_nWQXMO7y2FA0Kwp8Sy0B48Qn2iZJQ1pR2KAC16AKZragNxgWoIrN8H_p3XaC2axWh';
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSflsGEiWSVmy1LbIP4eh5lEyn9Xe1w2TGnu1OSzyEdap4BCLw/formResponse';
const PLANS = {
  Knight: {price: 129, setup: 199, line: 'Missed-call text back, a review request after every job, replies written for your Google reviews, and service reminder texts.'},
  Crown: {price: 229, setup: 299, line: 'Everything in Knight, plus Google profile care, a one-page website, instant replies to website and Facebook leads, and an online booking link.'},
  Kingdom: {price: 399, setup: 499, line: 'Everything in Crown, plus 12 Facebook and Instagram posts a month, 4 win-back campaigns a year, website chat that books jobs, and a quarterly planning sit-down.'}
};
const PAY = {
  founding: {Knight: 'https://link.fastpaydirect.com/payment-link/6af14afd03c375ed645fe30a', Crown: 'https://link.fastpaydirect.com/payment-link/6af14b2f03c375ed645fe30c', Kingdom: 'https://link.fastpaydirect.com/payment-link/6af14b55d4cfb789aef226af'},
  standard: {Knight: 'https://link.fastpaydirect.com/payment-link/6af149cc03c375ed645fe303', Crown: 'https://link.fastpaydirect.com/payment-link/6af2a28403c375ed645fe88a', Kingdom: 'https://link.fastpaydirect.com/payment-link/6af2a2a803c375ed645fe88b'}
};
const TOWNS = ['Mabank', 'Gun Barrel City', 'Seven Points', 'Tool', 'Kemp', 'Eustace', 'Malakoff', 'Athens'];
const TYPES = ['HVAC', 'Electrical', 'Plumbing', 'Septic', 'Pest control', 'Lawn/landscape', 'Tree service', 'Pool service', 'Pressure washing', 'Fencing', 'Auto repair', 'Boat repair', 'Marina', 'RV park', 'Salon/barber', 'Real estate', 'Restaurant/bar', 'Retail store', 'Contractor', 'Roofing', 'Other'];
const FORM_TYPE = (t) => ({HVAC: 'HVAC / electrical', Electrical: 'HVAC / electrical', Plumbing: 'Plumbing / septic / pest control', Septic: 'Plumbing / septic / pest control', 'Pest control': 'Plumbing / septic / pest control', 'Lawn/landscape': 'Lawn / tree / pool', 'Tree service': 'Lawn / tree / pool', 'Pool service': 'Lawn / tree / pool', 'Auto repair': 'Auto / boat repair', 'Boat repair': 'Auto / boat repair', Marina: 'RV park / marina / rental', 'RV park': 'RV park / marina / rental', 'Salon/barber': 'Salon / barber', 'Real estate': 'Real estate', 'Restaurant/bar': 'Bar / restaurant'})[t] || 'Other';
const PHONE_SETUP = [
  ['My cell phone is the business number', 'It’s my cell phone'],
  ['Office landline or business VoIP line', 'An office line or phone system'],
  ['A phone system or app that already sends texts', 'An app that already texts (RingCentral, OpenPhone…)'],
  ['New number, or willing to switch numbers', 'I’d like a new business number'],
  ['Not sure', 'Not sure']
];
const EMERGENCY = ['HVAC', 'Electrical', 'Plumbing', 'Septic'];
const STAY = ['Marina', 'RV park'];

const spotsLeft = () => { const n = document.querySelector('[data-spots-left]'); const v = n ? parseInt(n.getAttribute('data-spots-left'), 10) : 10; return isFinite(v) ? Math.max(0, v) : 10; };
const track = (name, p) => { try { if (window.gtag) gtag('event', name, p || {}); } catch (e) {} };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

/* ---------- state ---------- */
const S = {type: '', town: '', reach: '', missed: '', phoneSetup: '', google: '', want: '', plan: '', name: '', business: '', phone: '', email: '', textOk: false, sent: false};
let mode = 'menu', ask = null; // ask = {key, check, next} while waiting for typed input

/* ---------- styles + DOM ---------- */
const css = `
.kcc-btn{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:70;display:flex;align-items:center;gap:10px;padding:13px 18px 13px 14px;border:0;border-radius:999px;background:#0E1A22;color:#fff;font:700 15px/1 "Public Sans",system-ui,sans-serif;box-shadow:0 12px 30px rgba(14,26,34,.35);cursor:pointer;transition:transform .2s ease}
.kcc-btn:hover{transform:translateY(-2px)}.kcc-btn svg{width:22px;height:22px;fill:#F0C25E}
.kcc-btn .dot{width:9px;height:9px;border-radius:50%;background:#2F9E6E;box-shadow:0 0 0 3px rgba(47,158,110,.25)}
.kcc-btn[hidden]{display:none}
.kcc{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:71;width:min(380px,calc(100vw - 24px));height:min(600px,calc(100dvh - 110px));display:flex;flex-direction:column;background:#F6F8F9;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(14,26,34,.4);font:400 15px/1.5 "Public Sans",system-ui,sans-serif;color:#0E1A22}
.kcc[hidden]{display:none}
.kcc-hd{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:#0E1A22;color:#fff}
.kcc-hd .av{width:34px;height:34px;border-radius:50%;background:#D29A2A;display:grid;place-items:center;flex:none}
.kcc-hd .av svg{width:20px;height:20px;fill:#0E1A22}
.kcc-hd b{display:block;font:800 16px/1.1 "Big Shoulders Display","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase}
.kcc-hd small{display:block;font-size:12px;color:#B9C7CC}
.kcc-x{margin-left:auto;background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}
.kcc-log{flex:1;overflow-y:auto;padding:14px 12px 6px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.kcc-m{max-width:86%;padding:9px 12px;border-radius:14px;white-space:pre-line;word-wrap:break-word}
.kcc-m.bot{background:#fff;border:1px solid #D5DDE0;border-bottom-left-radius:4px;align-self:flex-start}
.kcc-m.me{background:#0E1A22;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
.kcc-m a{color:#8F650F;font-weight:700}
.kcc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 0 4px}
.kcc-chip{border:1.5px solid #0E1A22;background:#fff;color:#0E1A22;border-radius:999px;padding:7px 12px;font:600 14px/1.2 "Public Sans",system-ui,sans-serif;cursor:pointer}
.kcc-chip:hover{background:#0E1A22;color:#fff}
.kcc-chip.go{background:#D29A2A;border-color:#D29A2A;color:#0E1A22}
.kcc-chip.go:hover{background:#8F650F;border-color:#8F650F;color:#fff}
a.kcc-chip{text-decoration:none;display:inline-block}
.kcc-card{background:#fff;border:1.5px solid #D29A2A;border-radius:12px;padding:12px;align-self:stretch}
.kcc-card b{font:900 22px/1 "Big Shoulders Display","Arial Narrow",sans-serif;letter-spacing:.02em}
.kcc-card .p{font-size:14px;color:#52626A;margin:4px 0 0}
.kcc .kcc-ft{margin:0;border:0;border-radius:0;display:flex;gap:6px;padding:10px;border-top:1px solid #D5DDE0;background:#fff}
.kcc *{box-sizing:border-box}
.kcc .kcc-ft input{flex:1;background:#fff;box-shadow:none;margin:0;height:auto;min-width:0;border:1.5px solid #D5DDE0;border-radius:10px;padding:10px 12px;font:400 16px/1.2 "Public Sans",system-ui,sans-serif;color:#0E1A22}
.kcc .kcc-ft input:focus{outline:none;border-color:#D29A2A}
.kcc-ft button{border:0;border-radius:10px;background:#0E1A22;color:#fff;padding:0 14px;font:700 14px "Public Sans",system-ui,sans-serif;cursor:pointer}
.kcc-note{font-size:11.5px;color:#52626A;text-align:center;padding:0 12px 8px;background:#fff}
.kcc :focus-visible,.kcc-btn:focus-visible{outline:3px solid #D29A2A;outline-offset:2px}
.kcc-typing{align-self:flex-start;color:#52626A;font-size:13px}
@media (max-width:520px){.kcc{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}.kcc-btn{right:14px;padding:12px 16px 12px 12px}}
@media (prefers-reduced-motion:reduce){.kcc-btn{transition:none}}
`;
const crown = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7z"/></svg>';
document.head.insertAdjacentHTML('beforeend', '<style id="kcc-css">' + css + '</style>');
const btn = document.createElement('button');
btn.type = 'button'; btn.className = 'kcc-btn'; btn.setAttribute('aria-haspopup', 'dialog');
btn.innerHTML = crown + '<span>Is King Connect right for you?</span><i class="dot" aria-hidden="true"></i>';
const box = document.createElement('div');
box.className = 'kcc'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'King Connect chat');
box.innerHTML = '<div class="kcc-hd"><span class="av">' + crown + '</span><div><b>King Connect</b><small>Quick answers · Jordan replies in person</small></div><button type="button" class="kcc-x" aria-label="Close chat">×</button></div>' +
  '<div class="kcc-log" aria-live="polite"></div>' +
  '<form class="kcc-ft"><input type="text" aria-label="Type a question" placeholder="Ask a question…" autocomplete="off" enterkeyhint="send"><button type="submit">Send</button></form>' +
  '<div class="kcc-note">Automated helper. For anything else, call or text ' + PHONE + '.</div>';
document.body.append(btn, box);
const log = box.querySelector('.kcc-log'), input = box.querySelector('input'), form = box.querySelector('form');
if (window.matchMedia('(max-width:520px)').matches) btn.querySelector('span').textContent = 'Questions? Chat';

/* ---------- rendering ---------- */
const scroll = () => { log.scrollTop = log.scrollHeight; };
const say = (html, cls) => { const m = document.createElement('div'); m.className = 'kcc-m ' + (cls || 'bot'); m.innerHTML = html; log.append(m); scroll(); return m; };
const me = (text) => say(esc(text), 'me');
const clearChips = () => log.querySelectorAll('.kcc-chips').forEach((c) => c.remove());
const chips = (list) => {
  clearChips();
  const c = document.createElement('div'); c.className = 'kcc-chips';
  list.forEach((o) => {
    if (o.href) { const a = document.createElement('a'); a.className = 'kcc-chip' + (o.go ? ' go' : ''); a.href = o.href; a.textContent = o.t; if (/^https?:/.test(o.href)) { a.target = '_blank'; a.rel = 'noopener'; } a.addEventListener('click', () => { if (o.ev) track(o.ev, o.p); if (o.fn) o.fn(); }); c.append(a); return; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'kcc-chip' + (o.go ? ' go' : ''); b.textContent = o.t;
    b.addEventListener('click', () => { clearChips(); if (!o.quiet) me(o.t); o.fn(); });
    c.append(b);
  });
  log.append(c); scroll();
};
const bot = (html, list, delay) => new Promise((res) => {
  const t = document.createElement('div'); t.className = 'kcc-typing'; t.textContent = 'King Connect is typing…'; log.append(t); scroll();
  setTimeout(() => { t.remove(); say(html); if (list) chips(list); res(); }, delay == null ? 450 : delay);
});

/* ---------- main menu ---------- */
const menu = (lead) => { mode = 'menu'; ask = null; return bot(lead || 'What can I help with?', [
  {t: 'See if it fits my business', go: true, fn: fit},
  {t: 'How does it work?', fn: () => faq('how')},
  {t: 'What does it cost?', fn: () => faq('price')},
  {t: 'Talk to Jordan', fn: talk}
]); };

/* ---------- fit check ---------- */
function fit() {
  mode = 'fit'; track('chat_fit_start');
  bot('Great. Six quick taps and I’ll tell you if it’s a fit and which plan makes sense.\n\nWhat kind of business do you run?', TYPES.map((t) => ({t, fn: () => { S.type = t; fitTown(); }})));
}
function fitTown() {
  if (S.type === 'Roofing') { track('chat_fit_no', {reason: 'roofing'}); return bot('Thanks for checking. Right now King Connect isn’t taking on roofing companies, so I’d rather be upfront than waste your time.', [{t: 'Back to the menu', fn: () => menu()}]); }
  bot('Which town is your business based in?', TOWNS.map((t) => ({t, fn: () => { S.town = t; fitReach(); }})).concat([
    {t: 'Somewhere else in Texas', fn: () => { S.town = 'Elsewhere in Texas'; fitReach(); }},
    {t: 'Outside Texas', fn: () => { S.town = 'Outside Texas'; track('chat_fit_no', {reason: 'outside_tx'}); bot('King Connect is Texas-only for now, starting around Cedar Creek Lake. If you’d like a heads-up when that changes, leave your info and Jordan will reach out.', [{t: 'Leave my info', go: true, fn: leaveInfo}, {t: 'Back to the menu', fn: () => menu()}]); }}
  ]));
}
function fitReach() {
  const extra = S.town === 'Elsewhere in Texas' ? 'We’re local to Cedar Creek Lake, but everything runs on your phone, so Texas businesses outside the lake area can still sign up. ' : '';
  bot(extra + 'How do most new customers reach you?', [
    {t: 'They call', fn: () => { S.reach = 'calls'; fitMissed(); }},
    {t: 'They walk in', fn: () => { S.reach = 'walk-ins'; fitMissed(); }},
    {t: 'They book online', fn: () => { S.reach = 'online'; fitMissed(); }},
    {t: 'Mostly word of mouth', fn: () => { S.reach = 'referrals'; fitMissed(); }}
  ]);
}
function fitMissed() {
  bot('When you’re busy and can’t pick up, what happens to the call?', [
    {t: 'Goes to voicemail', fn: () => { S.missed = 'voicemail'; fitPhone(); }},
    {t: 'I call back when I can', fn: () => { S.missed = 'call back later'; fitPhone(); }},
    {t: 'Someone always answers', fn: () => { S.missed = 'always answered'; fitPhone(); }},
    {t: 'Not sure', fn: () => { S.missed = 'not sure'; fitPhone(); }}
  ]);
}
function fitPhone() {
  const lead = S.missed === 'always answered' ? 'Nice, that’s rare. The review side still pays off, and you’re covered when that person is out. ' : S.missed === 'voicemail' ? 'That’s where most jobs slip away: most callers hang up on voicemail and call the next name on Google. ' : '';
  bot(lead + 'How does your business phone work?', PHONE_SETUP.map(([v, t]) => ({t, fn: () => { S.phoneSetup = v; fitGoogle(); }})));
}
function fitGoogle() {
  const note = S.phoneSetup === 'My cell phone is the business number' ? 'That works. Your cell still rings first; only the calls you miss get a text back, from a local number signed with your business name. ' : S.phoneSetup === 'Office landline or business VoIP line' ? 'Good news: office lines can usually text from that same number. ' : '';
  bot(note + 'Do you have a Google Business Profile (the listing with your reviews on Google Maps)?', [
    {t: 'Yes', fn: () => { S.google = 'yes'; fitWant(); }},
    {t: 'No', fn: () => { S.google = 'no'; fitWant(); }},
    {t: 'Not sure', fn: () => { S.google = 'not sure'; fitWant(); }}
  ]);
}
function fitWant() {
  if (S.want && mode === 'fit' && S._preset !== false) { S._preset = false; return result(); }
  bot('Last one. What do you want help with?', [
    {t: 'Catch missed calls and get more reviews', fn: () => { S.want = 'Knight'; result(); }},
    {t: 'That, plus my Google profile, a website and booking', fn: () => { S.want = 'Crown'; result(); }},
    {t: 'All of it, plus social media posts', fn: () => { S.want = 'Kingdom'; result(); }},
    {t: 'Not sure, recommend one', fn: () => { S.want = ''; result(); }}
  ]);
}
const recommend = () => {
  if (S.want) return S.want;
  if (S.google !== 'yes' || S.reach === 'online' || STAY.includes(S.type)) return 'Crown';
  return 'Knight';
};
function result() {
  S.plan = recommend(); save(); track('chat_fit_done', {plan: S.plan, type: S.type});
  const p = PLANS[S.plan], left = spotsLeft();
  const why = [];
  if (S.reach === 'calls' || S.missed === 'voicemail' || S.missed === 'call back later') why.push('you get work by phone, so every missed call that gets a text back is a job you keep');
  if (S.google !== 'yes') why.push('you’ll want a Google profile set up so reviews have somewhere to land (Crown covers that)');
  if (EMERGENCY.includes(S.type)) why.push('emergency callers can reply and you get an alert right away');
  if (STAY.includes(S.type)) why.push('the Guest Texts add-on (+$99/mo) handles booking, arrival and checkout texts for your guests');
  const reason = why.length ? 'Looks like a good fit: ' + why.join('; ') + '.' : 'Looks like a good fit. Even with steady work, one caught call a month usually pays for it.';
  say('<div>' + esc(reason) + '</div>');
  const card = say('<b>' + S.plan + ' · $' + p.price + '/mo</b><div class="p">' + esc(p.line) + '</div><div class="p">' + (left ? '<strong>Founding Ten:</strong> ' + left + ' of 10 spots left. No setup fee and your price is locked for 12 months.' : 'Setup $' + p.setup + ', billed after your 10-minute setup.') + ' Month to month. First month back if it isn’t working for you.</div>');
  card.classList.add('kcc-card');
  bot('Want to get started? It’s pay online, then a 10-minute setup on your phone. Texts go live in about 1–2 weeks, once the phone carriers approve your business.', [
    {t: 'Start ' + S.plan + ' now', go: true, fn: () => startPlan(S.plan)},
    S.plan !== 'Crown' ? {t: 'Show me Crown instead', fn: () => { S.want = 'Crown'; result(); }} : {t: 'Show me Knight instead', fn: () => { S.want = 'Knight'; result(); }},
    {t: 'Book a free 15-min call first', href: BOOK, ev: 'booking_click', p: {from: 'chat'}, fn: () => {}},
    {t: 'Have Jordan call me', fn: talk}
  ], 700);
}

/* ---------- start a plan: collect contact info, then the pay link ---------- */
function startPlan(plan) {
  S.plan = plan; mode = 'start'; track('chat_start_plan', {plan});
  collect(['name', 'business', 'phone', 'email'], () => {
    save(); send('Started ' + plan + ' checkout from the website chat');
    const left = spotsLeft(); const url = PAY[left ? 'founding' : 'standard'][plan];
    bot('You’re all set, ' + esc(first(S.name)) + '. Tap below to pay securely (card or bank). Right after, you’ll get a welcome email with your 10-minute setup, and I’ve saved your answers so it opens already filled in on this phone or computer.', [
      {t: 'Pay for ' + plan + (left ? ' (founding rate)' : ''), href: url, go: true, ev: 'chat_checkout', p: {plan}},
      {t: 'I have a question first', fn: () => menu('Sure. What would you like to know?')}
    ]);
  });
}

/* ---------- talk to Jordan ---------- */
function talk() {
  mode = 'talk';
  bot('Happy to. You can call or text Jordan now at <a href="tel:' + PHONE_TEL + '">' + PHONE + '</a>, book a time, or leave your info and he’ll call you within one business day.', [
    {t: 'Leave my info', go: true, fn: leaveInfo},
    {t: 'Book a 15-min call', href: BOOK, ev: 'booking_click', p: {from: 'chat'}},
    {t: 'Call now', href: 'tel:' + PHONE_TEL, ev: 'call_click', p: {from: 'chat'}}
  ]);
}

function leaveInfo() {
  mode = 'talk';
  collect(['name', 'business', 'phone', 'textOk'], () => { send(S.town === 'Outside Texas' ? 'Outside Texas: wants a heads-up when King Connect expands (website chat)' : 'Asked Jordan to call them (website chat)'); bot('Got it, thanks ' + esc(first(S.name)) + '! ' + (S.town === 'Outside Texas' ? 'Jordan will reach out when King Connect comes your way.' : 'Jordan will call you within one business day. Need him sooner? Call or text ' + PHONE + '.'), [{t: 'Back to the menu', fn: () => menu()}]); });
}

/* ---------- collect typed answers ---------- */
const PROMPTS = {
  name: ['What’s your name?', (v) => v.trim().length >= 2 ? '' : 'Just your first and last name is fine.'],
  business: ['And the business name, exactly how customers know it?', (v) => v.trim().length >= 2 ? '' : 'What’s the business called?'],
  phone: ['Best phone number for you?', (v) => v.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1').length === 10 ? '' : 'That doesn’t look like a 10-digit number. Try again?'],
  email: ['And your email? Your receipt and setup link go there.', (v) => /^\S+@\S+\.\S+$/.test(v.trim()) ? '' : 'That email doesn’t look right. Try again?']
};
function collect(keys, done) {
  const todo = keys.filter((k) => k === 'textOk' ? !S._askedText : !S[k]);
  if (!todo.length) return done();
  const k = todo[0];
  if (k === 'textOk') {
    S._askedText = true;
    return bot('Is it okay if Jordan texts you about this? (Msg & data rates may apply. Reply STOP anytime. Not required.)', [
      {t: 'Yes, texts are fine', fn: () => { S.textOk = true; collect(keys, done); }},
      {t: 'Call only, please', fn: () => { S.textOk = false; collect(keys, done); }}
    ]);
  }
  ask = {key: k, check: PROMPTS[k][1], next: () => collect(keys, done)};
  bot(PROMPTS[k][0]).then(() => input.focus());
}
const first = (n) => String(n || '').trim().split(/\s+/)[0] || 'friend';
const fmtPhone = (v) => { const d = String(v).replace(/\D/g, '').replace(/^1(\d{10})$/, '$1'); return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); };

/* ---------- save for the setup wizard + send the lead ---------- */
function save() {
  try {
    const key = 'kc_setup_v1'; const cur = JSON.parse(localStorage.getItem(key) || 'null') || {};
    const [f, ...l] = String(S.name || '').trim().split(/\s+/);
    const put = (k, v) => { if (v && !cur[k]) cur[k] = v; };
    put('first', f); put('last', l.join(' ')); put('email', S.email.trim()); put('phone', S.phone ? fmtPhone(S.phone) : ''); put('business', S.business.trim());
    if (S.type && S.type !== 'Roofing' && !cur.type) cur.type = S.type;
    if (S.phoneSetup && !cur.phoneSetup) cur.phoneSetup = S.phoneSetup;
    if (TOWNS.includes(S.town) && !(cur.towns && cur.towns.length)) cur.towns = [S.town];
    localStorage.setItem(key, JSON.stringify(cur));
  } catch (e) {}
}
function send(what) {
  if (S.sent === what) return; S.sent = what;
  const d = new FormData();
  d.append('entry.1634613612', S.name.trim());
  d.append('entry.740076565', S.business.trim() || '(not given)');
  d.append('entry.1599790933', FORM_TYPE(S.type));
  d.append('entry.1637722511', S.phone ? fmtPhone(S.phone) : '');
  if (S.email) d.append('entry.420473111', S.email.trim());
  d.append('entry.835965389', 'Website chat');
  const summary = [what + '.', S.type && 'Type: ' + S.type, S.town && 'Town: ' + S.town, S.reach && 'Customers reach them by: ' + S.reach, S.missed && 'Missed calls: ' + S.missed, S.phoneSetup && 'Phone: ' + S.phoneSetup, S.google && 'Google profile: ' + S.google, S.plan && 'Plan: ' + S.plan].filter(Boolean).join('\n');
  d.append('entry.986106593', summary);
  d.append('entry.1010973906', S.textOk ? 'Yes - agreed to texts' : 'No');
  try { fetch(FORM, {method: 'POST', mode: 'no-cors', body: d}).catch(() => {}); } catch (e) {}
  track('generate_lead', {source: 'chat'});
}

/* ---------- typed questions ---------- */
const FAQ = [
  ['roof', /\broof/i],
  ['price', /\b(price|pric|cost|how much|\$|fee|cheap|expensive|afford|monthly|plans?)\b/i],
  ['contract', /\b(contract|cancel|commit|lock(ed)? in|refund|money back|month to month)\b/i],
  ['number', /\b(my number|phone number|same number|keep (my|the) number|port|landline|cell)\b/i],
  ['start', /\b(sign ?up|get started|start|buy|pay|join|ready)\b/i],
  ['time', /\b(how long|when|live|start|setup time|set up time|weeks?|days?|fast|quick)\b/i],
  ['how', /\b(how (does|do) (it|this|you) work|what (is|do you do)|explain|missed.?call|text.?back|what is king connect)\b/i],
  ['reviews', /\b(reviews?|stars?|rating|google)\b/i],
  ['tech', /\b(software|app|learn|tech|computer|complicated)\b/i],
  ['spam', /\b(spam|annoy|bother|consent|permission|stop|opt)\b/i],
  ['texting', /\b(texting cost|text cost|messages cost|per text|sms)\b/i],
  ['area', /\b(area|town|where|serve|located|local|texas|lake)\b/i],
  ['addons', /\b(add.?on|guest|rv|marina|freeze|heat|alert|extra location|weekly|newsletter)\b/i],
  ['human', /\b(call me|talk|person|human|contact|phone you|reach you|speak)\b/i],
  ['who', /\b(who|jordan|owner|about you|veteran|pilot)\b/i],
  ['referral', /\b(refer|referral|friend|gift card)\b/i],
  ['emergency', /\b(emergenc|after.?hours|night|weekend)\b/i],
  ['hi', /^(hi|hey|hello|yo|howdy|good (morning|afternoon|evening))\b/i]
];
const ANS = {
  price: () => 'Three monthly plans:\n• Knight $129/mo: missed-call text back, review requests, review replies, service reminders\n• Crown $229/mo: Knight plus Google profile care, a one-page website, instant lead replies and online booking\n• Kingdom $399/mo: Crown plus social posts, win-back campaigns and website chat\n\nSetup is $199 / $299 / $499, billed after your 10-minute setup. ' + (spotsLeft() ? 'Right now the Founding Ten (' + spotsLeft() + ' spots left) pay no setup fee and lock their price for 12 months.' : '') + ' Normal texting is included.',
  contract: () => 'No contract. Plans are month to month and you can cancel any time; service runs through the month you’ve paid for. If it isn’t working for you in your first month, you get that month back. (The setup fee isn’t refundable.)',
  number: () => 'You keep your number. Customers call it like always. Unanswered calls forward through King Connect so the text-back goes out in your business name. Office lines can usually text from that same number; if your business number is your cell, texts come from a local number signed with your business name.',
  time: () => 'Setup takes about 10 minutes on your phone after you sign up. Phone carriers have to approve every business that sends texts, so texting goes live in about 1–2 weeks. King Connect handles that registration and covers its fees.',
  how: () => 'When you can’t pick up, the caller gets a friendly text from your business within seconds, so they don’t call the next name on Google. After each job, your customer gets one text with your Google review link. You get a short monthly text with your numbers. No new software to learn.',
  reviews: () => 'After each job, every customer gets the same friendly text with your Google review link (we never screen out unhappy customers; Google doesn’t allow it). Replies get written for every review in your voice. Nobody honest can delete bad reviews, but more happy ones means one bad review doesn’t define you.',
  tech: () => 'Nothing new to learn. It runs in the background. There’s a simple phone app if you want to read and answer texts, but you don’t have to use it.',
  spam: () => 'It only texts people who just called you, or customers you just finished a job for. Every text says how to reply STOP, and it honors that right away. Marketing texts to past customers only go to people who agreed to get texts.',
  texting: () => 'Normal texting for a local business is included in every plan. If you’d send thousands a month, Jordan will talk it through with you first.',
  area: () => 'King Connect is based at Cedar Creek Lake: Mabank, Gun Barrel City, Seven Points, Tool, Kemp, Eustace, Malakoff and Athens. Everything runs on your phone, so other Texas businesses can sign up too. Texas only for now.',
  addons: () => 'Add-ons for any plan:\n• Guest Texts +$99/mo for RV parks, marinas and rentals (booking, arrival and checkout texts)\n• Freeze & Heat Alert +$149/mo for plumbers, HVAC and pool companies\n• Extra location +$79/mo\n• Lake Weekly sponsor +$75/mo',
  who: () => 'King Connect is run by Jordan King: a U.S. Army veteran, FAA commercial pilot and Malakoff High grad who lives in the Mabank area and has helped run his family’s local businesses for years. No call center. You can call or text him at ' + PHONE + '.',
  referral: () => 'Know a business that could use this? When someone you refer signs up, you get a $50 Amazon gift card and they get their first month free. Just have them mention your name.',
  roof: () => 'Right now King Connect isn’t taking on roofing companies.',
  emergency: () => 'For HVAC, plumbing, septic and electrical, the missed-call text asks if it’s an emergency. If the caller says yes, you (or your on-call person) get an alert right away so you can call back. After-hours calls get an after-hours text.',
  hi: () => 'Hey there! I can check if King Connect fits your business, answer questions, or get you to Jordan.'
};
function answer(text) {
  const hit = FAQ.find(([, re]) => re.test(text));
  if (!hit) { track('chat_unknown'); return bot('Good question. I’m a simple helper, so let me get you to Jordan for that one. He usually answers the same day.', [{t: 'Have Jordan call me', go: true, fn: talk}, {t: 'Call or text now', href: 'tel:' + PHONE_TEL, ev: 'call_click', p: {from: 'chat'}}, {t: 'Back to the menu', fn: () => menu()}]); }
  const k = hit[0];
  if (k === 'start') return S.plan ? startPlan(S.plan) : bot('Let’s make sure it’s a fit first. It takes six taps.', [{t: 'Check if it fits', go: true, fn: fit}, {t: 'Talk to Jordan', fn: talk}]);
  if (k === 'human') return talk();
  faq(k);
}
function faq(k) {
  if (!ANS[k]) return menu();
  track('chat_faq', {topic: k});
  const next = k === 'roof' ? [{t: 'Back to the menu', fn: () => menu()}] : [
    S.plan ? {t: 'Start ' + S.plan, go: true, fn: () => startPlan(S.plan)} : {t: 'See if it fits my business', go: true, fn: fit},
    {t: 'Another question', quiet: true, fn: () => { input.focus(); }},
    {t: 'Talk to Jordan', fn: talk}
  ];
  bot(esc(ANS[k]()), next);
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim(); if (!text) return;
  input.value = ''; me(text); clearChips();
  if (ask) {
    const msg = ask.check(text);
    if (msg) return bot(msg);
    S[ask.key] = ask.key === 'phone' ? fmtPhone(text) : text;
    const nx = ask.next; ask = null; return nx();
  }
  answer(text);
});

/* ---------- open / close ---------- */
let started = false;
const open = () => {
  box.hidden = false; btn.hidden = true; track('chat_open');
  if (!started) { started = true; bot('Hi! I’m the King Connect helper. I can check if we’re a fit for your business in about a minute, or answer questions.', null, 200).then(() => menu('Where would you like to start?')); }
  setTimeout(() => input.focus({preventScroll: true}), 250);
};
const close = () => { box.hidden = true; btn.hidden = false; btn.focus(); };
btn.addEventListener('click', open);
box.querySelector('.kcc-x').addEventListener('click', close);
box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#chat"],[data-open-chat]'); if (!a) return;
  e.preventDefault(); const plan = a.getAttribute('data-plan');
  if (plan && PLANS[plan]) { S.want = plan; track('chat_plan_button', {plan}); if (!started) { started = true; box.hidden = false; btn.hidden = true; track('chat_open'); bot('Hi! Before you sign up for ' + plan + ', six quick taps to make sure it fits your business.', null, 200).then(fit); setTimeout(() => input.focus({preventScroll: true}), 250); return; } open(); clearChips(); me('I want ' + plan); fit(); return; }
  open();
});
window.KCChat = {open};
})();
