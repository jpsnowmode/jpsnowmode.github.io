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
    durations: { half: '半日（3 小時）', full: '全日（6 小時，含午休 1 小時）' },
    // Google Apps Script web app (jpsnowmode@gmail.com) → Sheet「SNOWMODE 預約」+ email notification
    endpoint: 'https://script.google.com/macros/s/AKfycbyD39ReMO2oVTR2xeL7jdfpwYkeOgSsJrtw1Qgy2IilnJnvKLG9VS2c0twrH7DG68T7/exec'
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
    balanceDue: '於上課前結清'
  };

  const ntd = v => 'NT$' + Math.round(v).toLocaleString('en-US');
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
    async submitBooking(payload) {
      // text/plain avoids a CORS preflight, which Apps Script doesn't support
      const r = await fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'submit failed');
      return data;
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

  /* ---------- skill levels (descriptions depend on 單板 / 雙板; submitted value = "Lv.N 描述") ---------- */
  const LEVELS = {
    '單板': ['第一次滑雪，或學過但忘光光了', '能用後刃、前刃推落葉飄', '能在初級道連續轉彎，能自己搭纜車', '能在中級道穩定轉彎、控制速度', '能刻滑，開始挑戰陡坡、公園或粉雪'],
    '雙板': ['第一次滑雪，或學過但忘光光了', '能用八字停下、轉彎', '能在初級道連續八字轉彎，開始平行式', '能在中級道平行式轉彎', '能刻滑，開始挑戰陡坡、蘑菇或粉雪']
  };
  function renderLevels(disc) {
    const list = LEVELS[disc] || LEVELS['雙板'];
    $$('#level-field input[name="level"]').forEach(r => {
      const n = +r.dataset.lv, d = list[n - 1];
      r.value = `Lv.${n} ${d}`;
      r.nextElementSibling.nextElementSibling.textContent = d;
    });
    const sel = form.querySelector('input[name="level"]:checked');   // keeps the same Lv number
    booking.level = sel ? sel.value : '';
  }

  /* ---------- discipline (ski / board) sync ---------- */
  function setDiscipline(v) {
    booking.discipline = v;
    renderLevels(v);
    const sw = $('#disc-switch');
    if (sw) {
      sw.setAttribute('aria-checked', String(v === '雙板'));
      sw.closest('.disc-switch').dataset.state = v;
      $$('.disc-switch .ds-label').forEach(l => l.classList.toggle('on', l.dataset.disc === v));
    }
    const hv = $('#disc-val'); if (hv) hv.value = v;
    $$('.disc-name').forEach(s => s.textContent = v);
    const q = $(`#quick input[name="q-discipline"][value="${v}"]`); if (q) q.checked = true;
    updateLive();
  }
  /* booking step-1 switch: knob left = 單板 (off), right = 雙板 (on).
     Native <button> gives Space/Enter → click; ←/→ pick a side; each label selects its own side. */
  const discSwitch = $('#disc-switch');
  if (discSwitch) {
    discSwitch.addEventListener('click', () => setDiscipline(booking.discipline === '單板' ? '雙板' : '單板'));
    discSwitch.addEventListener('keydown', e => {
      const v = { ArrowLeft: '單板', ArrowRight: '雙板', Home: '單板', End: '雙板' }[e.key];
      if (v) { e.preventDefault(); setDiscipline(v); }
    });
  }
  $$('.disc-switch .ds-label').forEach(l => l.addEventListener('click', () => { setDiscipline(l.dataset.disc); discSwitch && discSwitch.focus({ preventScroll: true }); }));

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
    if (e.target.name === 'level') setErr('level', '');
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
    const el = k === 'level' ? $('#level-field') : form.elements[k];
    if (el && el.setAttribute) el.setAttribute('aria-invalid', t ? 'true' : 'false');
  };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate(n) {
    readForm();
    const errs = [];
    if (n === 1) {
      if (!booking.level) { setErr('level', '請選擇程度'); errs.push('level'); } else setErr('level', '');
      // 人數 lives in step 1 (same as the hero quick card), so it is always reachable right after the quick-card slide
      if (booking.totalPeople < 1) { setErr('people', '至少需要 1 位大人或小孩'); errs.push('people'); } else setErr('people', '');
      const agesValid = booking.children === booking.childAges.length && booking.childAges.every(age => Number.isInteger(age) && age >= 3 && age <= 15);
      if (!agesValid) { setErr('childAges', '請填寫每位小孩的年齡（3–15 歲）'); errs.push('childAges'); } else setErr('childAges', '');
    }
    if (n === 2) {
      if (!booking.dates.length) { setErr('dates', '請至少選擇一天上課日期'); errs.push('dates'); }
      if (booking.dates.some(d => d.date < todayISO)) { setErr('dates', '有日期已經過去，請重新選擇'); errs.push('dates'); }
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
    const rows = [['板類', booking.discipline], ['程度', booking.level], ['語言', booking.language],
      ['日期', datesText(false)], ['時數', booking.durationLabel || '—'], ['大人', booking.adults + ' 人'], ['小孩', booking.children + ' 人'], ['小孩年齡', agesText], ['總人數', booking.totalPeople + ' 人'], ['雪場', booking.resort],
      ['聯絡人', booking.name], [c.method, c.id]];
    if (c.method !== 'Email') rows.push(['Email', c.email || '（未填）']);
    rows.push(['備註', booking.notes || '（無）']);
    $('#summary').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd>`).join('');
    $('#est-price').textContent = price.display;
    $('#est-deposit').textContent = price.depositDisplay;
    $('#est-balance').textContent = price.balanceDisplay;
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
      toast('預約需求已送出');
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
  /* returns true when the visitor was sent on to the full booking flow */
  function quickGo() {
    syncQuickParty();
    const partyError = booking.totalPeople < 1 ? '至少需要 1 位大人或小孩' : (booking.childAges.length !== booking.children || booking.childAges.some(age => !Number.isInteger(age) || age < 3 || age > 15) ? '請填寫每位小孩的年齡（3–15 歲）' : '');
    setErr('q-party', partyError);
    if (partyError) { toast(partyError); $('[data-err="q-party"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return false; }
    setParty(booking.adults, booking.children);
    const d = qDate.value;
    if (d) {
      if (d < todayISO) { toast('請選擇今天之後的日期'); qDate.focus(); return false; }
      toggleDate(d, true);
      const dd = new Date(d + 'T00:00:00'); view = new Date(dd.getFullYear(), dd.getMonth(), 1); renderCal();
    }
    showDoneOrForm(false);
    go(booking.level ? 2 : 1, false);
    const toBooking = () => $('#booking').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    // hero-snow.js: SWITCH ON light-up + full-screen snow, scroll after ~800ms (falls back to a plain scroll)
    window.SMHeroSnow ? window.SMHeroSnow.run(toBooking) : toBooking();
    if (!booking.level) msg('確認人數、選擇程度後，再到下一步挑日期。');
    return true;
  }
  quick.addEventListener('submit', e => { e.preventDefault(); quickGo(); });

  /* hero quick card: slide-to-book switch (tap / Enter / Space / drag right).
     Knob slides, track lights up, then ~400ms later runs exactly what the old submit button did. */
  const goSw = $('#quick-go');
  if (goSw) {
    let goBusy = false, goTimer = 0, goLeft = false, drag = null, lastDrag = 0;
    const goReset = () => {
      clearTimeout(goTimer); goBusy = false; goLeft = false; drag = null;
      goSw.classList.remove('is-on', 'dragging');
      goSw.style.removeProperty('--x'); goSw.style.removeProperty('--p');
    };
    const goFire = () => {
      if (goBusy) return;
      goBusy = true; drag = null;
      goSw.classList.remove('dragging'); goSw.style.removeProperty('--x'); goSw.style.removeProperty('--p');
      goSw.classList.add('is-on');
      goTimer = setTimeout(() => {
        if (!quickGo()) { goTimer = setTimeout(goReset, 450); return; }   // validation failed → snap back
        // still looking at the card a moment later (nothing scrolled)? reset so it can be used again
        goTimer = setTimeout(() => { if (!goLeft && isInView(quick)) goReset(); }, 3500);
      }, 0);   // validate + prefill at once; hero-snow.js holds the scroll ~800ms while the hero lights up
    };
    const isInView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    // implicit form submission (Enter in a field) also arrives here as a click on the default button
    goSw.addEventListener('click', e => {
      e.preventDefault();
      if (Date.now() - lastDrag < 450) return;   // the click that ends a drag
      goFire();
    });
    goSw.addEventListener('pointerdown', e => {
      if (goBusy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const knob = goSw.querySelector('.go-knob'), r = goSw.getBoundingClientRect(), k = knob.getBoundingClientRect();
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, max: r.width - k.width - 2 * (k.left - r.left), dx: 0, moved: false };
    });
    goSw.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const raw = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(raw) < 6 || Math.abs(raw) < Math.abs(e.clientY - drag.y0)) return;
        drag.moved = true; goSw.classList.add('dragging');
        try { goSw.setPointerCapture(e.pointerId); } catch (_) {}
      }
      drag.dx = Math.max(0, Math.min(drag.max, raw));
      goSw.style.setProperty('--x', drag.dx + 'px');
      goSw.style.setProperty('--p', (drag.dx / drag.max).toFixed(3));
    });
    const endDrag = (e, cancelled) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved) return;          // plain tap → click handler
      lastDrag = Date.now();
      if (!cancelled && d.dx > d.max * 0.6) goFire();
      else { goSw.classList.remove('dragging'); goSw.style.removeProperty('--x'); goSw.style.removeProperty('--p'); }
    };
    goSw.addEventListener('pointerup', e => endDrag(e, false));
    goSw.addEventListener('pointercancel', e => endDrag(e, true));
    goSw.addEventListener('dragstart', e => e.preventDefault());
    // reset to OFF when the visitor comes back to the card (scrolled away and back, or back/forward cache)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        if (!goBusy) return;
        if (!es[0].isIntersecting) goLeft = true;
        else if (goLeft) goReset();
      }).observe(quick);
    }
    addEventListener('pageshow', e => { if (e.persisted) goReset(); });
  }

  /* ---------- WeChat copy + floating contact dock ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const target = $(b.dataset.copy);
    if (!target) return;
    const txt = target.textContent.trim();
    try { await navigator.clipboard.writeText(txt); toast(`已複製 WeChat ID：${txt}`); }
    catch (_) {
      const r = document.createRange(); r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      toast('已選取 ID，請按複製');
    }
  }));

  $$('[data-qr-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '隱藏 QR' : '顯示 QR';
  }));

  (() => {
    const dock = $('.social-float');
    if (!dock) return;
    const wechatToggle = $('[data-wechat-toggle]', dock);
    const wechatPopover = $('#wechat-popover');
    const whatsappToggle = $('[data-whatsapp-toggle]', dock);
    const whatsappPopover = $('#whatsapp-popover');
    const dockToggle = $('.social-toggle', dock);
    const mobile = matchMedia('(max-width:768px)');
    const desktopWhatsApp = matchMedia('(min-width:769px) and (hover:hover)');
    const setPopover = open => {
      if (!wechatToggle || !wechatPopover) return;
      wechatPopover.hidden = !open;
      wechatToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const setWhatsAppPopover = open => {
      if (!whatsappToggle || !whatsappPopover) return;
      whatsappPopover.hidden = !open;
      whatsappToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const setDockOpen = open => {
      const active = Boolean(open && mobile.matches);
      dock.classList.toggle('is-open', active);
      dockToggle?.setAttribute('aria-expanded', active ? 'true' : 'false');
      dockToggle?.setAttribute('aria-label', active ? '關閉快速聯絡' : '開啟快速聯絡');
      if (!active) { setPopover(false); setWhatsAppPopover(false); }
    };
    wechatToggle?.addEventListener('click', () => { setWhatsAppPopover(false); setPopover(wechatPopover.hidden); });
    whatsappToggle?.addEventListener('click', e => {
      if (!desktopWhatsApp.matches) return;
      e.preventDefault();
      setPopover(false);
      setWhatsAppPopover(whatsappPopover.hidden);
    });
    dockToggle?.addEventListener('click', () => setDockOpen(!dock.classList.contains('is-open')));
    mobile.addEventListener?.('change', () => setDockOpen(false));
    desktopWhatsApp.addEventListener?.('change', () => setWhatsAppPopover(false));
    addEventListener('keydown', e => { if (e.key === 'Escape') setDockOpen(false); });
    addEventListener('click', e => { if (!dock.contains(e.target)) setDockOpen(false); });
    addEventListener('scroll', () => setDockOpen(false), { passive: true });

    const targets = ['#top', '#booking', '#contact'].map(sel => $(sel)).filter(Boolean);
    const inView = new Map(targets.map(el => [el, false]));
    const sync = () => {
      const hidden = [...inView.values()].some(Boolean);
      dock.classList.toggle('is-hidden', hidden);
      if (hidden) setDockOpen(false);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => inView.set(entry.target, entry.isIntersecting));
        sync();
      }, { threshold: .05 });
      targets.forEach(el => io.observe(el));
    } else {
      const syncFallback = () => targets.forEach(el => {
        const r = el.getBoundingClientRect();
        inView.set(el, r.bottom > 0 && r.top < innerHeight);
      });
      addEventListener('scroll', () => { syncFallback(); sync(); }, { passive: true });
      syncFallback(); sync();
    }
  })();

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const els = $$('.pkg,.principles li,.coach,.coach-note,.yz-facts li,.voice,.qa details,.timeline li,.ct-list li,.line-card,.route,.method-photo');
    els.forEach(el => el.classList.add('rv'));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- coach note: "繼續閱讀" collapse on small screens ---------- */
  (() => {
    const note = $('.coach-note'); if (!note) return;
    const btn = $('.cn-more', note); const mq = matchMedia('(max-width:640px)');
    const set = open => { note.classList.toggle('is-collapsed', !open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.textContent = open ? '收合' : '繼續閱讀'; };
    const sync = () => { btn.hidden = !mq.matches; set(!mq.matches); };
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true'; set(open);
      if (!open) note.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    sync();
  })();

  /* ---------- reviews: 顯示更多評價 (desktop) ---------- */
  (() => {
    const btn = $('.rv-all'), row = $('.rv-row'); if (!btn || !row) return;
    const n = $$('.rv-extra', row).length; if (!n) { btn.parentElement.remove(); return; }
    btn.addEventListener('click', () => {
      const open = row.classList.toggle('show-all');
      btn.setAttribute('aria-expanded', open);
      btn.firstChild.textContent = open ? '收合評價' : '顯示更多評價';
      $('.rv-all-n', btn).hidden = open;
      window.dispatchEvent(new Event('resize'));
      if (!open) $('#voices').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  })();

  /* ---------- reviews: 展開 / 收合 long texts ---------- */
  (() => {
    const items = $$('.rv-body');
    const check = () => items.forEach(b => {
      const t = $('.rv-text', b), btn = $('.rv-more', b);
      if (b.classList.contains('open')) return;
      btn.hidden = t.scrollHeight <= t.clientHeight + 2;
    });
    items.forEach(b => $('.rv-more', b).addEventListener('click', e => {
      const open = b.classList.toggle('open');
      e.currentTarget.textContent = open ? '收合' : '展開';
      e.currentTarget.setAttribute('aria-expanded', open);
      if (!open) b.closest('.rv-card').scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }));
    check(); window.addEventListener('resize', check);
    if (document.fonts) document.fonts.ready.then(check);
  })();

  /* ---------- init ---------- */
  syncMethod(); renderCal(); renderDays(); setParty(1, 0); updateLive(); go(1, false);
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();

/* SNOWMODE hero snow switch — off: calm hero; on: colour + snowfall + booking CTA */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  var sw = document.getElementById('snow-switch');
  var onBox = document.getElementById('snow-on');
  var live = document.getElementById('snow-live');
  var canvas = document.getElementById('snow-canvas');
  if (!hero || !sw || !onBox) return;

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  hero.classList.add('ss');

  /* ---------- snowfall v2: 3 parallax layers of soft pre-rendered sprites ---------- */
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var flakes = [], W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0;
  var falling = false;      // spawning / respawning flakes
  var heroVisible = true;
  var level = 0, levelTarget = 0;   // global fade 0..1 (≈1.5s in / out)
  var FADE = 1.5;

  // soft radial sprites, rendered once (blur baked into the gradient → no ctx.filter per frame)
  function sprite(px, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d'), r = px / 2;
    var grd = g.createRadialGradient(r, r, 0, r, r, r);
    for (var i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grd; g.fillRect(0, 0, px, px);
    return c;
  }
  var SPR = {
    // far: tiny, already blurry
    far: sprite(32, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.7)'], [0.6, 'rgba(240,246,255,.18)'], [1, 'rgba(240,246,255,0)']]),
    // mid: soft-edged flake with a brighter core
    mid: sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.85)'], [0.62, 'rgba(245,249,255,.3)'], [1, 'rgba(245,249,255,0)']]),
    // near: bokeh disc — flat plateau, very wide falloff, faint cool tint
    near: sprite(128, [[0, 'rgba(255,255,255,.75)'], [0.45, 'rgba(250,252,255,.6)'], [0.72, 'rgba(232,240,255,.22)'], [1, 'rgba(232,240,255,0)']])
  };
  //            share  size(px dia)  alpha       fall px/s   sway    wind
  var LAYERS = {
    far:  { d: [6, 11],   a: [0.3, 0.55], v: [9, 16],   s: [4, 10],  w: 0.35 },
    mid:  { d: [12, 20],  a: [0.5, 0.8],   v: [20, 32],  s: [8, 18],  w: 0.7 },
    near: { d: [36, 72],  a: [0.16, 0.32], v: [48, 72],  s: [14, 30], w: 1.35 }
  };
  function rnd(a) { return a[0] + Math.random() * (a[1] - a[0]); }

  function size() {
    if (!ctx) return;
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    // only snow over the first screen of the hero (tall mobile hero = wasted pixels)
    H = Math.min(r.height, Math.round(window.innerHeight * 1.1));
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function counts() {
    var n = Math.round(Math.max(44, Math.min(85, W * H / 7500)));   // ~48 mobile, ~85 desktop
    var near = W < 600 ? 3 : 5;
    var far = Math.round((n - near) * 0.58);
    return { far: far, mid: n - near - far, near: near };
  }
  function makeFlake(kind, initial) {
    var L = LAYERS[kind], d = rnd(L.d);
    return {
      k: kind, img: SPR[kind], d: d,
      x: Math.random() * (W + 2 * d) - d,
      y: initial ? Math.random() * (H + d) - d : -d - Math.random() * H * (kind === 'near' ? 0.8 : 0.25),
      vy: rnd(L.v), sway: rnd(L.s), wf: L.w * (0.8 + Math.random() * 0.4),
      ph: Math.random() * 6.283, fq: 0.25 + Math.random() * 0.5,
      a: rnd(L.a), sx: 0
    };
  }
  // wind: slow base drift + two slow sines + occasional smoothed gusts (px/s)
  var gust = 0, gustTarget = 0, nextGust = 4;
  function wind(dt) {
    if (clock > nextGust) {
      gustTarget = gustTarget ? 0 : (8 + Math.random() * 14) * (Math.random() < 0.8 ? 1 : -0.6);
      nextGust = clock + (gustTarget ? 1.8 + Math.random() * 2 : 5 + Math.random() * 6);
    }
    gust += (gustTarget - gust) * Math.min(1, dt * 0.9);
    return 7 + Math.sin(clock * 0.11) * 6 + Math.sin(clock * 0.29 + 1.3) * 3 + gust;
  }
  var ORDER = { far: 0, mid: 1, near: 2 };
  function frame(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t; clock += dt;
    // global fade
    if (level < levelTarget) level = Math.min(levelTarget, level + dt / FADE);
    else if (level > levelTarget) level = Math.max(levelTarget, level - dt / FADE);
    var wv = wind(dt);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy * dt;
      f.ph += f.fq * dt;
      f.x += wv * f.wf * dt;
      var x = f.x + Math.sin(f.ph) * f.sway, d = f.d;
      if (x > W + d) f.x -= W + 2 * d; else if (x < -2 * d) f.x += W + 2 * d;
      if (f.y - d > H) {
        flakes[i] = makeFlake(f.k, false);   // recycle (fade-out hides any respawns)
        continue;
      }
      ctx.globalAlpha = f.a * level;
      ctx.drawImage(f.img, x - d / 2, f.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    if (level > 0 || levelTarget > 0) schedule();
    else { ctx.clearRect(0, 0, W, H); flakes = []; last = 0; }
  }
  function schedule() {
    if (!raf && !document.hidden && heroVisible && flakes.length) raf = requestAnimationFrame(frame);
  }
  function startSnow() {
    if (!ctx || mqReduce.matches) return;
    size();
    falling = true; levelTarget = 1;
    if (!flakes.length) {
      var c = counts();
      ['far', 'mid', 'near'].forEach(function (k) { for (var i = 0; i < c[k]; i++) flakes.push(makeFlake(k, true)); });
      flakes.sort(function (a, b) { return ORDER[a.k] - ORDER[b.k]; });   // paint far → near
    }
    schedule();
  }
  function stopSnow() { falling = false; levelTarget = 0; schedule(); /* flakes keep drifting while fading out */ }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; } else schedule();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroVisible = es[0].isIntersecting;
      if (!heroVisible && raf) { cancelAnimationFrame(raf); raf = 0; last = 0; } else schedule();
    }).observe(hero);
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (flakes.length) size(); }, 150);
  });
  mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) {
    if (e.matches) { flakes = []; falling = false; level = levelTarget = 0; if (ctx) ctx.clearRect(0, 0, W, H); }
    else if (hero.classList.contains('is-on')) startSnow();
  });

  /* ---------- switch ---------- */
  function setOn(on) {
    hero.classList.toggle('is-on', on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    onBox.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) onBox.removeAttribute('inert'); else onBox.setAttribute('inert', '');
    if (live) live.textContent = on ? 'SNOW MODE: ON' : 'SNOW MODE: OFF';
    if (on) startSnow(); else stopSnow();
  }
  // <button> already fires click on Enter/Space
  sw.addEventListener('click', function () {
    setOn(sw.getAttribute('aria-checked') !== 'true');
  });

  var cta = onBox.querySelector('.snow-cta');
  if (cta) cta.addEventListener('click', function (e) {
    var target = document.getElementById('booking');
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#booking');
  });
})();
