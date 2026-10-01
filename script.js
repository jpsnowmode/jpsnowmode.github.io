/* SNOWMODE — front-end interactions (no backend yet)
 * Booking data lives in one plain object (see `booking` / buildPayload()).
 * To wire a backend later, replace SNOWMODE.submitBooking() with a real fetch().
 */
(function () {
  'use strict';
  const $ = (q, c = document) => c.querySelector(q);
  const $$ = (q, c = document) => [...c.querySelectorAll(q)];
  const body = document.body;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- config / placeholders ---------- */
  const CONFIG = {
    currency: 'TWD',
    maxDays: 14,
    monthsAhead: 12,
    slots: ['半日（上午）', '半日（下午）', '全日'],
    // 早鳥回饋價 2026–27 — PRICE_TABLE[half|full][totalPeople - 1] = group total in TWD (not per person).
    // half = 半日 3 小時, full = 全日 6 小時（含午休 1 小時）. 5 人以上 → 私訊報價.
    priceLabel: '早鳥回饋價 2026–27',
    PRICE_TABLE: {
      half: [7000, 8000, 9000, 10000],
      full: [12000, 14000, 15000, 16000]
    },
    maxPricedPeople: 4,
    // Approximate JPY reference only (actual JPY cash = rate on the payment day).
    // 1 TWD ≈ 4.958 JPY — Bank of Taiwan spot rate, JPY buy 0.1992 / sell 0.2042 TWD → mid 0.2017
    // (1 / 0.2017), quoted 2026-10-01 21:00 (Asia/Taipei), https://rate.bot.com.tw/xrt
    // The static 約 ¥ values in index.html (price table, package card) use this same rate; update both together.
    JPY_PER_TWD: 4.958,
    durations: { half: '半日（3 小時）', full: '全日（6 小時，含午休 1 小時）' },
    endpoint: null         // TODO: e.g. '/api/bookings'
  };

  /* ---------- the booking data object ---------- */
  const booking = {
    name: '',
    contact: { method: 'LINE', id: '', email: '' },
    dates: [],            // [{ date: 'YYYY-MM-DD', slot: '全日' }]
    discipline: '雙板',
    level: '',
    language: '中文',
    adults: 1,
    children: 0,
    childAges: [],
    totalPeople: 1,
    resort: '由教練建議',
    notes: '',
    price: { currency: CONFIG.currency, amount: null, display: '—' },
    duration: null,       // 'half' | 'full' | 'mixed' (per-day slot lives in dates[].slot)
    durationLabel: '',
    depositRate: 0.3,
    deposit: null,
    balance: null,
    balanceDue: '上課日前一個月內銀行轉帳，或上課當天以現金支付，日圓、台幣皆可，日圓依當天匯率換算'
  };

  const ntd = v => 'NT$' + Math.round(v).toLocaleString('en-US');
  const jpy = v => '約 ¥' + (Math.round(v * CONFIG.JPY_PER_TWD / 1000) * 1000).toLocaleString('en-US');
  const slotKey = slot => slot === '全日' ? 'full' : 'half';
  function computePrice(b) {
    const people = Number(b.totalPeople) || 0;
    const halfDays = b.dates.filter(d => slotKey(d.slot) === 'half').length;
    const fullDays = b.dates.filter(d => slotKey(d.slot) === 'full').length;
    const duration = !b.dates.length ? null : (halfDays && fullDays ? 'mixed' : (fullDays ? 'full' : 'half'));
    b.duration = duration;
    b.durationLabel = duration === 'mixed' ? `半日 ${halfDays} 天・全日 ${fullDays} 天` : (duration ? `${CONFIG.durations[duration]} × ${b.dates.length} 天` : '');
    const overMax = people > CONFIG.maxPricedPeople;
    let amount = null;
    if (!overMax && people >= 1 && b.dates.length) {
      amount = b.dates.reduce((sum, d) => sum + CONFIG.PRICE_TABLE[slotKey(d.slot)][people - 1], 0);
    }
    const deposit = amount == null ? null : Math.round(amount * b.depositRate);
    const balance = amount == null ? null : amount - deposit;
    b.deposit = deposit;
    b.balance = balance;
    const quote = overMax ? '5 人以上請私訊報價' : '—';
    const show = value => value == null ? quote : ntd(value);
    return {
      currency: CONFIG.currency,
      label: CONFIG.priceLabel,
      amount,
      display: show(amount),
      deposit,
      balance,
      depositDisplay: overMax ? '私訊報價' : show(deposit),
      balanceDisplay: overMax ? '私訊報價' : show(balance),
      quoteRequired: overMax,
      duration,
      durationLabel: b.durationLabel,
      breakdown: { halfDays, fullDays, totalPeople: people }
    };
  }
  function buildPayload() {
    booking.price = computePrice(booking);
    return JSON.parse(JSON.stringify({ ...booking, submittedAt: new Date().toISOString(), source: 'snowmode-site' }));
  }

  window.SNOWMODE = {
    booking, CONFIG, computePrice, buildPayload,
    /** Replace with a real request, e.g.
     *  return fetch(CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
     */
    submitBooking(payload) {
      return new Promise(res => setTimeout(() => res({ ok: true, ref: 'SM-' + Math.random().toString(36).slice(2, 6).toUpperCase(), payload }), 700));
    }
  };

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let tt;
  const toast = m => { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('show'), 2400); };

  /* ---------- header ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menuBtn = $('.menu-btn');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  addEventListener('resize', () => { if (innerWidth > 860) setMenu(false); });

  /* placeholder links */
  $$('[data-todo]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(a.dataset.todo); }));

  /* ---------- form refs ---------- */
  const form = $('#book-form');
  const setRadio = (name, val) => { const r = form.querySelector(`input[name="${name}"][value="${val}"]`); if (r) r.checked = true; };

  /* ---------- discipline (ski / board) sync ---------- */
  function setDiscipline(v) {
    booking.discipline = v;
    const sw = $('#disc-switch');
    if (sw) {
      sw.setAttribute('aria-checked', String(v === '單板'));
      sw.closest('.disc-switch').dataset.state = v;
      $$('.disc-switch .ds-label').forEach(l => l.classList.toggle('on', l.dataset.disc === v));
    }
    $$('.disc-name').forEach(s => s.textContent = v);
    setRadio('discipline', v);
    const q = $(`#quick input[name="q-discipline"][value="${v}"]`); if (q) q.checked = true;
    updateLive();
  }
  /* switch: native <button> gives Space/Enter → click; labels pick their own side */
  const discSwitch = $('#disc-switch');
  if (discSwitch) discSwitch.addEventListener('click', () => setDiscipline(booking.discipline === '單板' ? '雙板' : '單板'));
  $$('.disc-switch .ds-label').forEach(l => l.addEventListener('click', () => {
    setDiscipline(booking.discipline === l.dataset.disc ? (l.dataset.disc === '單板' ? '雙板' : '單板') : l.dataset.disc);
  }));

  /* ---------- calendar (multi, non-consecutive) ---------- */
  const pad2 = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const now = new Date(); const todayISO = iso(now);
  const minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const maxMonth = new Date(now.getFullYear(), now.getMonth() + CONFIG.monthsAhead, 1);
  let view = new Date(minMonth);
  const DOW = '日一二三四五六';
  const fmtDate = s => { const d = new Date(s + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）`; };
  const calGrid = $('#cal-grid'), calMonth = $('#cal-month');

  function renderCal() {
    const y = view.getFullYear(), m = view.getMonth();
    calMonth.textContent = `${y} 年 ${m + 1} 月`;
    const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
    let html = '';
    for (let i = 0; i < first; i++) html += '<span aria-hidden="true"></span>';
    for (let d = 1; d <= n; d++) {
      const s = `${y}-${pad2(m + 1)}-${pad2(d)}`;
      const sel = booking.dates.some(x => x.date === s);
      const past = s < todayISO;
      html += `<button type="button" data-date="${s}" aria-pressed="${sel}" aria-label="${m + 1} 月 ${d} 日（${DOW[new Date(y, m, d).getDay()]}）${sel ? '，已選' : ''}"${past ? ' disabled' : ''}${s === todayISO ? ' class="today"' : ''}>${d}</button>`;
    }
    calGrid.innerHTML = html;
    $('[data-cal="-1"]').disabled = view <= minMonth;
    $('[data-cal="1"]').disabled = view >= maxMonth;
  }
  $$('[data-cal]').forEach(b => b.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + +b.dataset.cal, 1); renderCal(); }));
  function toggleDate(s, force) {
    const i = booking.dates.findIndex(x => x.date === s);
    if (i > -1 && force !== true) booking.dates.splice(i, 1);
    else if (i === -1 && force !== false) {
      if (booking.dates.length >= CONFIG.maxDays) { toast(`最多可選 ${CONFIG.maxDays} 天，更多天數請在備註說明`); return; }
      booking.dates.push({ date: s, slot: '全日' });
    }
    booking.dates.sort((a, b) => a.date.localeCompare(b.date));
    renderCal(); renderDays(); setErr('dates', ''); updateLive();
  }
  calGrid.addEventListener('click', e => { const b = e.target.closest('[data-date]'); if (b && !b.disabled) toggleDate(b.dataset.date); });

  const daysEl = $('#days'), daysEmpty = $('#days-empty');
  function renderDays() {
    daysEl.innerHTML = booking.dates.map((d, i) => `<li><span class="d-date">${fmtDate(d.date)}</span>
      <select data-slot="${i}" aria-label="${fmtDate(d.date)} 的時段">${CONFIG.slots.map(s => `<option${s === d.slot ? ' selected' : ''}>${s}</option>`).join('')}</select>
      <button type="button" class="d-del" data-del="${d.date}" aria-label="移除 ${fmtDate(d.date)}">✕</button></li>`).join('');
    daysEmpty.textContent = booking.dates.length ? `已選 ${booking.dates.length} 天` : '還沒有選日期。';
  }
  daysEl.addEventListener('change', e => { const s = e.target.closest('[data-slot]'); if (s) { booking.dates[+s.dataset.slot].slot = s.value; updateLive(); } });
  daysEl.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) toggleDate(b.dataset.del, false); });

  /* ---------- adults, children, and child ages ---------- */
  const count = v => Math.max(0, parseInt(v, 10) || 0);
  const ageOptions = selected => ['<option value="">請選擇</option>', ...Array.from({ length: 13 }, (_, i) => {
    const age = i + 3; return `<option value="${age}"${String(selected) === String(age) ? ' selected' : ''}>${age} 歲</option>`;
  })].join('');
  function renderChildAges(container, n, prefix) {
    if (!container) return;
    container.innerHTML = Array.from({ length: n }, (_, i) => {
      const value = booking.childAges[i] ?? '';
      return `<label class="age-field">小孩 ${i + 1} 年齡<select name="${prefix}-${i}" data-child-age="${i}" required aria-label="小孩 ${i + 1} 年齡">${ageOptions(value)}</select></label>`;
    }).join('');
  }
  function setParty(adults, children) {
    booking.adults = count(adults);
    booking.children = count(children);
    booking.childAges = booking.childAges.slice(0, booking.children);
    booking.totalPeople = booking.adults + booking.children;
    ['#adults', '#q-adults'].forEach(q => { const el = $(q); if (el) el.value = booking.adults; });
    ['#children', '#q-children'].forEach(q => { const el = $(q); if (el) el.value = booking.children; });
    renderChildAges($('#child-ages'), booking.children, 'child-age');
    renderChildAges($('#q-child-ages'), booking.children, 'q-child-age');
    setErr('people', ''); setErr('childAges', ''); setErr('q-party', '');
    updateLive();
  }
  function syncQuickParty() {
    booking.adults = count($('#q-adults')?.value);
    booking.children = count($('#q-children')?.value);
    booking.childAges = [...document.querySelectorAll('#q-child-ages [data-child-age]')].map(el => el.value ? Number(el.value) : null);
    booking.totalPeople = booking.adults + booking.children;
  }
  $$('[data-person]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.person;
    setParty(key === 'adults' ? booking.adults + +b.dataset.n : booking.adults, key === 'children' ? booking.children + +b.dataset.n : booking.children);
  }));
  $$('[data-person-input]').forEach(input => input.addEventListener('input', () => {
    const quickInput = input.id.startsWith('q-');
    setParty($(quickInput ? '#q-adults' : '#adults')?.value, $(quickInput ? '#q-children' : '#children')?.value);
  }));

  /* ---------- contact method label ---------- */
  const cid = form.elements.contactId, cidL = $('#cid-l');
  const CID = { LINE: ['LINE ID', '你的 LINE ID'], WeChat: ['WeChat ID', '你的 WeChat ID'], WhatsApp: ['WhatsApp 號碼', '+886 912 345 678'], Email: ['Email', 'jpsnowmode@gmail.com'], '電話': ['電話號碼', '+886 912 345 678'] };
  function syncMethod() { const m = form.elements.contactMethod.value; booking.contact.method = m; cidL.textContent = CID[m][0]; cid.placeholder = CID[m][1]; cid.type = m === 'Email' ? 'email' : 'text'; form.elements.email.closest('label').hidden = m === 'Email'; }
  form.elements.contactMethod.addEventListener('change', syncMethod);

  /* ---------- read form → booking ---------- */
  form.addEventListener('input', e => {
    if (e.target.matches('[data-person-input]')) setParty($('#adults').value, $('#children').value);
    else readForm();
  });
  form.addEventListener('change', e => {
    if (e.target.name === 'discipline') setDiscipline(e.target.value);
    if (e.target.matches('[data-person-input]')) setParty($('#adults').value, $('#children').value);
    readForm();
  });
  $('#q-child-ages').addEventListener('change', syncQuickParty);
  function readForm() {
    const f = form.elements;
    booking.level = f.level.value;
    booking.language = f.language.value;
    booking.resort = f.resort.value;
    booking.adults = count(f.adults.value);
    booking.children = count(f.children.value);
    booking.childAges = [...form.querySelectorAll('[data-child-age]')].map(el => el.value ? Number(el.value) : null);
    booking.totalPeople = booking.adults + booking.children;
    booking.name = f.name.value.trim();
    booking.contact.method = f.contactMethod.value;
    booking.contact.id = f.contactId.value.trim();
    booking.contact.email = f.email.value.trim() || (f.contactMethod.value === 'Email' ? booking.contact.id : '');
    booking.notes = f.notes.value.trim();
    updateLive();
  }

  /* ---------- live summary ---------- */
  function datesText(short) {
    if (!booking.dates.length) return '尚未選擇';
    const t = booking.dates.map(d => `${fmtDate(d.date)} ${d.slot}`);
    return short && t.length > 3 ? t.slice(0, 3).join('、') + ` 等 ${t.length} 天` : t.join('\n');
  }
  function updateLive() {
    booking.price = computePrice(booking);
    const map = { discipline: booking.discipline, level: booking.level || '—', dates: datesText(true), people: `大人 ${booking.adults}・小孩 ${booking.children}（共 ${booking.totalPeople} 人）`, price: booking.price.display };
    $$('[data-live]').forEach(el => { el.textContent = map[el.dataset.live]; });
  }

  /* ---------- validation ---------- */
  const setErr = (k, t) => {
    const e = $(`[data-err="${k}"]`); if (e) e.textContent = t;
    const el = form.elements[k];
    if (el && el.setAttribute) el.setAttribute('aria-invalid', t ? 'true' : 'false');
  };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate(n) {
    readForm();
    const errs = [];
    if (n === 1) { if (!booking.level) { setErr('level', '請選擇程度'); errs.push('level'); } else setErr('level', ''); }
    if (n === 2) {
      if (!booking.dates.length) { setErr('dates', '請至少選擇一天上課日期'); errs.push('dates'); }
      if (booking.dates.some(d => d.date < todayISO)) { setErr('dates', '有日期已經過去，請重新選擇'); errs.push('dates'); }
      if (booking.totalPeople < 1) { setErr('people', '至少需要 1 位大人或小孩'); errs.push('people'); } else setErr('people', '');
      const agesValid = booking.children === booking.childAges.length && booking.childAges.every(age => Number.isInteger(age) && age >= 3 && age <= 15);
      if (!agesValid) { setErr('childAges', '請填寫每位小孩的年齡（3–15 歲）'); errs.push('childAges'); } else setErr('childAges', '');
    }
    if (n === 3) {
      if (!booking.name) { setErr('name', '請填寫聯絡人姓名'); errs.push('name'); } else setErr('name', '');
      const m = booking.contact.method, v = booking.contact.id;
      if (!v) { setErr('contactId', `請填寫${CID[m][0]}`); errs.push('contactId'); }
      else if (m === 'Email' && !EMAIL.test(v)) { setErr('contactId', 'Email 格式不正確'); errs.push('contactId'); }
      else if ((m === 'WhatsApp' || m === '電話') && !/^\+?[\d\s\-()]{6,20}$/.test(v)) { setErr('contactId', '號碼格式不正確（可含國碼，例如 +886）'); errs.push('contactId'); }
      else setErr('contactId', '');
      if (booking.contact.method !== 'Email' && booking.contact.email && !EMAIL.test(booking.contact.email)) { setErr('email', 'Email 格式不正確'); errs.push('email'); } else setErr('email', '');
    }
    if (n === 4) { if (!form.elements.agree.checked) { setErr('agree', '請勾選同意後再送出'); errs.push('agree'); } else setErr('agree', ''); }
    if (errs.length) {
      msg('請檢查標示的欄位。');
      const el = form.elements[errs[0]];
      if (el && el.focus) el.focus(); else if (errs[0] === 'dates') calGrid.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    msg(''); return true;
  }
  form.elements.agree.addEventListener('change', () => setErr('agree', ''));

  /* ---------- wizard nav ---------- */
  const steps = $$('.step', form), prog = $$('.prog li'), back = $('#wiz-back'), next = $('#wiz-next'), send = $('#wiz-send'), msgEl = $('#wiz-msg');
  let cur = 1;
  function msg(t, type) { msgEl.textContent = t; msgEl.className = 'wiz-msg' + (type ? ' ' + type : ''); }
  function go(n, focus = true) {
    cur = n;
    steps.forEach(s => s.classList.toggle('on', +s.dataset.step === n));
    prog.forEach(p => {
      const k = +p.dataset.p; p.classList.toggle('on', k === n); p.classList.toggle('done', k < n);
      const b = $('button', p); b.tabIndex = k < n ? 0 : -1; if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    back.hidden = n === 1; next.hidden = n === 4; send.hidden = n !== 4;
    if (n === 4) buildSummary();
    msg('');
    if (focus) { const t = $('.step.on .step-title', form); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } if ($('#wizard').getBoundingClientRect().top < 0) $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function buildSummary() {
    const price = computePrice(booking);
    const c = booking.contact;
    const agesText = booking.children ? booking.childAges.map((age, i) => `小孩 ${i + 1}：${age ? age + ' 歲' : '未填'}`).join('、') : '—';
    const rows = [['雪具', booking.discipline], ['程度', booking.level], ['語言', booking.language],
      ['日期', datesText(false)], ['時數', booking.durationLabel || '—'], ['大人', booking.adults + ' 人'], ['小孩', booking.children + ' 人'], ['小孩年齡', agesText], ['總人數', booking.totalPeople + ' 人'], ['雪場', booking.resort],
      ['聯絡人', booking.name], [c.method, c.id]];
    if (c.method !== 'Email') rows.push(['Email', c.email || '（未填）']);
    rows.push(['備註', booking.notes || '（無）']);
    $('#summary').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd>`).join('');
    $('#est-price').textContent = price.display;
    $('#est-deposit').textContent = price.depositDisplay;
    $('#est-balance').textContent = price.balanceDisplay;
    const yen = (id, v) => { const el = $(id); if (!el) return; const t = v == null || price.quoteRequired ? '' : jpy(v); el.textContent = t; el.hidden = !t; };
    yen('#est-price-jpy', price.amount);
    yen('#est-deposit-jpy', price.deposit);
    yen('#est-balance-jpy', price.balance);
  }
  next.addEventListener('click', () => { if (validate(cur)) go(cur + 1); });
  back.addEventListener('click', () => go(cur - 1));
  prog.forEach(p => $('button', p).addEventListener('click', () => { const k = +p.dataset.p; if (k < cur) go(k); }));

  const done = $('#done');
  function showDoneOrForm(showDone) { done.hidden = !showDone; form.hidden = showDone; $('.prog').hidden = showDone; }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    for (let n = 1; n <= 4; n++) if (!validate(n)) { if (n !== cur) go(n); validate(n); return; }
    send.disabled = true; send.textContent = '送出中…';
    const payload = buildPayload();
    try {
      const res = await window.SNOWMODE.submitBooking(payload);
      window.SNOWMODE.lastSubmission = res;
      $('#done-ref').textContent = res.ref;
      $('#done-method').textContent = booking.contact.method;
      showDoneOrForm(true); done.focus();
      toast('預約需求已送出（示意）');
    } catch (err) {
      msg('送出失敗，請稍後再試，或直接用 LINE 聯絡我們。');
    } finally { send.disabled = false; send.textContent = '送出預約需求'; }
  });
  $('#done-again').addEventListener('click', () => {
    form.reset(); booking.dates = []; booking.childAges = []; setParty(1, 0); syncMethod(); setDiscipline('雙板');
    renderCal(); renderDays(); readForm(); showDoneOrForm(false); go(1);
  });

  /* ---------- hero quick card → full flow ---------- */
  const quick = $('#quick');
  quick.addEventListener('change', e => {
    if (e.target.name === 'q-discipline') setDiscipline(e.target.value);
    if (e.target.matches('[data-person-input]')) setParty($('#q-adults').value, $('#q-children').value);
    if (e.target.matches('[data-child-age]')) syncQuickParty();
  });
  const qDate = $('#q-date'); qDate.min = todayISO;
  quick.addEventListener('submit', e => {
    e.preventDefault();
    syncQuickParty();
    const partyError = booking.totalPeople < 1 ? '至少需要 1 位大人或小孩' : (booking.childAges.length !== booking.children || booking.childAges.some(age => !Number.isInteger(age) || age < 3 || age > 15) ? '請填寫每位小孩的年齡（3–15 歲）' : '');
    setErr('q-party', partyError);
    if (partyError) { toast(partyError); return; }
    setParty(booking.adults, booking.children);
    const d = qDate.value;
    if (d) {
      if (d < todayISO) { toast('請選擇今天之後的日期'); qDate.focus(); return; }
      toggleDate(d, true);
      const dd = new Date(d + 'T00:00:00'); view = new Date(dd.getFullYear(), dd.getMonth(), 1); renderCal();
    }
    showDoneOrForm(false);
    go(booking.level ? 2 : 1, false);
    $('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!booking.level) msg('先選擇程度，再到下一步挑日期。');
  });

  /* ---------- WeChat copy (inline, no modal) ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const txt = $(b.dataset.copy).textContent.trim();
    try { await navigator.clipboard.writeText(txt); toast(`已複製 WeChat ID：${txt}`); }
    catch (_) {
      const r = document.createRange(); r.selectNodeContents($(b.dataset.copy)); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('已選取 ID，請按複製');
    }
  }));

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const els = $$('.pkg,.principles li,.coach,.yz-facts li,.voice,.qa details,.timeline li,.ct-list li,.line-card,.route,.method-photo');
    els.forEach(el => el.classList.add('rv'));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- init ---------- */
  syncMethod(); renderCal(); renderDays(); setParty(1, 0); updateLive(); go(1, false);
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
