/* =====================================================================
   Kisan Saathi – main app
   1. Kheti Gyan   2. Fruits & Vegetables (+ Nutrient Finder)
   3. Farmers      4. Delivery      5. Shop
   Uses: STR (i18n.js), KHETI (kheti.js), FOODS/NUTRIENTS (foods.js),
         FARM_METHODS (methods.js), Ask (ask.js), Voice (voice.js), Store (store.js)
   ===================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------------
   Settings remembered on this phone
   --------------------------------------------------------------------- */
const Prefs = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
};

const LANGS = ['hi', 'en', 'mr', 'te', 'ta'];
const TABS = ['kheti', 'food', 'farmers', 'delivery', 'shop'];
const NAME_INDEX = { en: 0, hi: 1, mr: 2, te: 3, ta: 4 };      // order of names in foods.js
const DATE_LOCALE = { hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN' };
const ROLES = ['consumer', 'farmer', 'shop', 'delivery'];
const METHODS = ['organic', 'natural', 'mixed', 'chemical'];
const VEHICLES = ['bike', 'erickshaw', 'auto', 'pickup', 'tractor', 'truck'];
const VEHICLE_ICON = { bike: '🏍️', erickshaw: '🛺', auto: '🛺', pickup: '🛻', tractor: '🚜', truck: '🚚' };
const CATS = ['fertilizer', 'manure', 'seeds', 'tools', 'plants', 'sprays', 'other'];
const LIST_EL = { farmer: '#list-farmers', delivery: '#list-delivery', shop: '#list-shop' };
const ADD_BTN = { farmer: '#add-farmer', delivery: '#add-delivery', shop: '#add-shop' };
const MAX_PHOTOS = 4;

let lang = Prefs.get('ks-lang'); if (!LANGS.includes(lang)) lang = null;
let mode = Prefs.get('ks-mode'); if (mode !== 'read' && mode !== 'voice') mode = null;
let tab = Prefs.get('ks-tab'); if (!TABS.includes(tab)) tab = 'kheti';
let topicId = 'grow';
let khetiSub = Prefs.get('ks-kheti-sub') === 'methods' ? 'methods' : 'topics';
let foodSub = Prefs.get('ks-food-sub') === 'finder' ? 'finder' : 'foods';
let finderKey = 'protein', finderType = 'all';
let foodQuery = '', farmerQuery = '', farmerMethod = '', deliveryQuery = '', shopQuery = '', shopCat = '';

let user = null, profile = null, profileLoaded = false, askedProfile = false, afterLogin = null;
const lists = { farmer: null, delivery: null, shop: null };   // null = still loading
const listFailed = { farmer: false, delivery: false, shop: false };
const watching = {};
const contactCache = {};

/* ---------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------- */
const L = () => lang || 'hi';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* Text in the current language, with {x} filled in */
function t(key, vars) {
  const pack = STR[L()] || STR.en;
  let s = pack[key] !== undefined ? pack[key] : STR.en[key];
  if (s === undefined) return key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}

/* Build an element: h('div', {class:'x', text:'hi'}, child1, child2) */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;            // only used for our own icons
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  kids.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}

const ICON = {
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1z"/><path d="M21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  login: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5"/><path d="M3 12h11M10 8l4 4-4 4"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5"/><path d="M21 12H10M17 8l4 4-4 4"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
};

let toastTimer = null;
function toast(msg, ms) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms || 3500);
}

/* 0.367 → 0.37, 13.81 → 13.8, 482.9 → 483 */
function fmtNum(v) {
  if (v === null || v === undefined) return '—';
  const a = Math.abs(v);
  const digits = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return String(Number(v.toFixed(digits)));
}
function firstLetter(s) {
  s = String(s || '').trim();
  if (!s) return '';
  try { return new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next().value.segment; }
  catch (e) { return s.charAt(0); }
}
const placeText = x => [x.village, x.district, x.state].filter(Boolean).join(', ');
const prettyPhone = p => String(p).slice(0, 5) + ' ' + String(p).slice(5);
const unitName = i => (t('units')[i] || '');
const isImage = s => typeof s === 'string' && s.startsWith('data:image/');
function dateText(ms) {
  try { return new Date(ms).toLocaleDateString(DATE_LOCALE[L()], { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (e) { return new Date(ms).toDateString(); }
}
function emptyBox(title, body) { return h('p', { class: 'empty' }, h('b', { text: title }), body || null); }

/* ---------------------------------------------------------------------
   Voice helpers
   --------------------------------------------------------------------- */
const warnedNoVoice = {};
function say(text, btn) {
  if (!Voice.canSpeak) { toast(t('voiceNone')); return; }
  Voice.speak(text, L(), btn);
  const has = Voice.hasVoice(L());
  if (has === false && !warnedNoVoice[L()]) {
    warnedNoVoice[L()] = true;
    toast(t('voiceMissing', { l: LANG_NAMES[L()] }), 8000);
  }
}

/* Yellow Listen button – only shown in Voice mode.
   label: undefined = "Listen", '' = icon only, or any text */
function listenBtn(getText, label) {
  if (mode !== 'voice') return null;
  const text = label === undefined ? t('listen') : label;
  const b = h('button', { type: 'button', class: text ? 'speak' : 'speak icon', 'aria-pressed': 'false', 'aria-label': t('listen'), html: ICON.speaker });
  if (text) b.append(h('span', { text }));
  b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    say(typeof getText === 'function' ? getText() : getText, b);
  });
  return b;
}

/* Mic button next to a box: speak instead of typing */
function micBtn(input) {
  const b = h('button', { type: 'button', class: 'mic', 'aria-label': t('mic'), 'aria-pressed': 'false', html: ICON.mic });
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') { Voice.stopListening(); return; }
    Voice.stop();
    const started = Voice.listen(L(),
      said => {
        if (input.inputMode === 'tel' || input.inputMode === 'numeric' || input.type === 'number') {
          input.value = said.replace(/[^0-9]/g, '');
        } else if (input.type === 'search') {
          input.value = said;
        } else {
          input.value = (input.value ? input.value + ' ' : '') + said;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      () => { toast(t('micNo')); input.focus(); },
      active => b.setAttribute('aria-pressed', active ? 'true' : 'false'));
    if (started) toast(t('micListening'));
  });
  return b;
}

/* ---------------------------------------------------------------------
   The pop-up window (details, login, forms). Phone "back" closes it.
   --------------------------------------------------------------------- */
const dlg = $('#dlg');
let dlgView = null, dlgInHistory = false;

function openDialog(view, title, content) {
  Voice.stop(); Voice.stopListening();
  if (view !== 'ask') askState = null;
  dlgView = view;
  $('#dlg-title').textContent = title;
  $('#dlg-body').replaceChildren(content);
  $('#dlg-body').scrollTop = 0;
  if (!dlg.open) {
    dlg.showModal();
    if (!dlgInHistory) { history.pushState({ ksDialog: true }, ''); dlgInHistory = true; }
  }
}
function closeDialog() { if (dlg.open) dlg.close(); }

dlg.addEventListener('close', () => {
  Voice.stop(); Voice.stopListening();
  dlgView = null; askState = null;
  if (dlgInHistory) {
    dlgInHistory = false;
    if (history.state && history.state.ksDialog) history.back();
  }
});
window.addEventListener('popstate', () => {
  if (dlg.open) { dlgInHistory = false; dlg.close(); }
});
dlg.addEventListener('click', e => {
  // Tap outside closes details, but not forms (so typed text is not lost)
  if (e.target === dlg && dlgView && !dlgView.startsWith('form') && dlgView !== 'profile') closeDialog();
});
$('#dlg-close').addEventListener('click', closeDialog);

/* Close the pop-up, then do something on the page (after the phone's history has settled) */
function closeDialogThen(fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  const goesBack = dlg.open && dlgInHistory;
  if (goesBack) { window.addEventListener('popstate', () => setTimeout(run, 0), { once: true }); setTimeout(run, 400); }
  closeDialog();
  if (!goesBack) run();
}

/* Listen button that is always shown (used in Ask answers, which are often asked by voice) */
function speakBtn(getText) {
  const b = h('button', { type: 'button', class: 'speak', 'aria-pressed': 'false', hidden: !Voice.canSpeak, html: ICON.speaker });
  b.append(h('span', { text: t('listen') }));
  b.addEventListener('click', e => { e.preventDefault(); say(typeof getText === 'function' ? getText() : getText, b); });
  return b;
}

/* ---------------------------------------------------------------------
   First screens: language, then Read or Voice
   --------------------------------------------------------------------- */
const startEl = $('#start');

function showStart(step) {
  Voice.stop();
  startEl.hidden = false;
  document.body.classList.add('locked');
  $('#step-lang').hidden = step !== 'lang';
  $('#step-mode').hidden = step !== 'mode';
  if (step === 'lang') renderPlates(false);
  startEl.scrollTop = 0;
}
function hideStart() {
  startEl.hidden = true;
  document.body.classList.remove('locked');
}

function renderPlates(more) {
  const box = $('#plates');
  box.replaceChildren();
  const codes = more ? ['mr', 'te', 'ta'] : ['hi', 'en'];
  codes.forEach(code => {
    const plate = h('button', { type: 'button', class: 'plate', lang: code },
      h('span', { class: 'plate-name', text: LANG_NAMES[code] }),
      LANG_LATIN[code] ? h('span', { class: 'plate-sub', text: LANG_LATIN[code] }) : null);
    plate.addEventListener('click', () => chooseLang(code));
    const sayBtn = h('button', { type: 'button', class: 'plate-say', 'aria-label': LANG_NAMES[code] + ' – listen', 'aria-pressed': 'false', html: ICON.speaker });
    sayBtn.addEventListener('click', () => Voice.speak(STR[code].pickThis, code, sayBtn));
    box.append(h('div', { class: 'plate-row' }, plate, sayBtn));
  });
  if (!more) {
    const other = h('button', { type: 'button', class: 'plate more' },
      h('span', { class: 'plate-name', text: 'अन्य भाषाएँ / Other languages' }),
      h('span', { class: 'plate-sub', text: 'मराठी, తెలుగు, தமிழ்' }));
    other.addEventListener('click', () => renderPlates(true));
    box.append(other);
  } else {
    const back = h('button', { type: 'button', class: 'linkbtn', text: '← हिंदी / English' });
    back.addEventListener('click', () => renderPlates(false));
    box.append(back);
  }
  if (lang && mode) {
    const close = h('button', { type: 'button', class: 'linkbtn', text: '✕ ' + t('close') });
    close.addEventListener('click', hideStart);
    box.append(close);
  }
}

function chooseLang(code) {
  Voice.stop();
  lang = code;
  Prefs.set('ks-lang', code);
  applyLang();
  if (!mode) {
    showStart('mode');
    say(t('modeAsk'));
  } else {
    hideStart();
    if (mode === 'voice') say(sectionSpeech(tab));
  }
}

function chooseMode(m) {
  mode = m;
  Prefs.set('ks-mode', m);
  hideStart();
  renderAll();
  if (m === 'voice') say(t('welcomeVoice'));
  else Voice.stop();
}

function toggleMode() {
  chooseMode(mode === 'voice' ? 'read' : 'voice');
  toast(mode === 'voice' ? t('nowVoice') : t('nowRead'));
}

/* ---------------------------------------------------------------------
   Language + whole-page drawing
   --------------------------------------------------------------------- */
let searchInputs = {};

function applyLang() {
  const l = L();
  document.documentElement.lang = l;
  document.title = l === 'en' ? 'Kisan Saathi' : t('brand') + ' – Kisan Saathi';
  $$('[data-i]').forEach(el => {
    const v = t(el.dataset.i);
    if (typeof v === 'string') el.textContent = v;
  });
  if (searchInputs.food) {
    searchInputs.food.placeholder = t('searchFood');
    searchInputs.farmers.placeholder = t('searchFarmers');
    searchInputs.delivery.placeholder = t('searchDelivery');
    searchInputs.shop.placeholder = t('searchShop');
    Object.values(searchInputs).forEach(i => i.setAttribute('aria-label', i.placeholder));
  }
  $$('.mic').forEach(b => b.setAttribute('aria-label', t('mic')));
  const fm = $('#f-method');
  fm.replaceChildren(h('option', { value: '', text: t('allMethods') }), ...METHODS.map(m => h('option', { value: m, text: t('methods')[m] })));
  fm.value = farmerMethod;
  $('#dlg-close').setAttribute('aria-label', t('close'));
  const stop = $('#stop-speak');
  stop.innerHTML = ICON.stop;
  stop.append(h('span', { text: t('stop') }));
  if (dlg.open) closeDialog();
  renderAll();
}

function renderAll() {
  renderHeader();
  renderSectionListen();
  renderKheti();
  renderFood();
  ['farmer', 'delivery', 'shop'].forEach(renderList);
  renderAddButtons();
}

function renderHeader() {
  const lb = $('#btn-lang');
  $('#lang-short').textContent = LANG_SHORT[L()];
  lb.setAttribute('aria-label', t('langLabel') + ': ' + LANG_NAMES[L()]);

  const mb = $('#btn-mode');
  mb.innerHTML = mode === 'voice' ? ICON.speaker : ICON.book;
  mb.setAttribute('aria-pressed', mode === 'voice' ? 'true' : 'false');
  mb.setAttribute('aria-label', mode === 'voice' ? t('switchToRead') : t('switchToVoice'));
  mb.title = mb.getAttribute('aria-label');

  const ab = $('#btn-account');
  const label = $('#acct-label');
  const svg = ab.querySelector('svg');
  if (user) {
    const nm = (profile && profile.name) || user.displayName || user.email || '';
    label.replaceChildren(h('span', { class: 'initial', text: firstLetter(nm).toUpperCase() || '✓' }));
    svg.setAttribute('hidden', '');
    ab.setAttribute('aria-label', t('account'));
  } else {
    label.textContent = t('login');
    svg.removeAttribute('hidden');
    ab.setAttribute('aria-label', t('login'));
  }
}

const SECTION_TEXT = {
  kheti: ['khetiTitle', 'khetiIntro'], food: ['foodTitle', 'foodIntro'], farmers: ['farmersTitle', 'farmersIntro'],
  delivery: ['deliveryTitle', 'deliveryIntro'], shop: ['shopTitle', 'shopIntro']
};
function sectionSpeech(name) {
  const [a, b] = SECTION_TEXT[name];
  let s = t(a) + '. ' + t(b);
  if (name === 'delivery') s += ' ' + t('howTitle') + '. ' + t('how1') + ' ' + t('how2') + ' ' + t('how3');
  return s;
}
function renderSectionListen() {
  $$('[data-listen]').forEach(box => {
    box.replaceChildren();
    const b = listenBtn(() => sectionSpeech(box.dataset.listen));
    if (b) box.append(b);
  });
}

function showTab(name, speak) {
  tab = name;
  Prefs.set('ks-tab', name);
  $$('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'));
  TABS.forEach(n => { $('#s-' + n).hidden = n !== name; });
  Voice.stop();
  window.scrollTo(0, 0);
  if (name === 'farmers') ensureWatch('farmer');
  if (name === 'delivery') ensureWatch('delivery');
  if (name === 'shop') ensureWatch('shop');
  if (location.hash !== '#' + name) history.replaceState(history.state, '', '#' + name);
  if (speak && mode === 'voice') say(sectionSpeech(name));
}

/* ---------------------------------------------------------------------
   1. Kheti Gyan
   --------------------------------------------------------------------- */
function topicText(tp) { return tp[L()] || tp.en; }
function articleSpeech(tp) {
  const c = topicText(tp);
  return c.t + '. ' + c.p.map(p => p[0] + '. ' + p[1]).join(' ');
}

function renderKheti() {
  $$('[data-ksub]').forEach(b => b.setAttribute('aria-selected', b.dataset.ksub === khetiSub ? 'true' : 'false'));
  $('#kheti-topics').hidden = khetiSub !== 'topics';
  $('#kheti-methods').hidden = khetiSub !== 'methods';
  renderMethods();
  const box = $('#topics');
  box.replaceChildren();
  KHETI.forEach(tp => {
    const c = topicText(tp);
    const b = h('button', { type: 'button', class: 'topic', 'aria-current': tp.id === topicId ? 'true' : 'false' },
      h('span', { class: 'ico', 'aria-hidden': 'true', text: tp.icon }), h('b', { text: c.t }), h('span', { text: c.s }));
    b.addEventListener('click', () => {
      topicId = tp.id;
      renderKheti();
      const a = $('#article');
      a.scrollIntoView({ behavior: 'smooth', block: 'start' });
      a.focus({ preventScroll: true });
      if (mode === 'voice') say(articleSpeech(tp), $('#article .art-head .speak'));
    });
    box.append(b);
  });
  renderArticle();
}

function renderArticle() {
  const tp = KHETI.find(x => x.id === topicId) || KHETI[0];
  const c = topicText(tp);
  const a = $('#article');
  a.replaceChildren(h('div', { class: 'art-head' }, h('h2', { text: c.t }), listenBtn(() => articleSpeech(tp), t('listenAll'))));
  c.p.forEach(([title, body]) => {
    a.append(h('div', { class: 'point' }, h('div', null, h('h3', { text: title }), h('p', { text: body })), listenBtn(title + '. ' + body, '')));
  });
  if (c.tb) {
    const tbody = h('tbody');
    c.tb.forEach(([k, v]) => tbody.append(h('tr', null, h('td', { text: k }), h('td', { text: v }))));
    a.append(h('table', { class: 'facts' }, tbody));
  }
  a.append(h('p', { class: 'note', text: t('khetiNote') }));
}

/* ---------- Farming methods ---------- */
const methodText = m => m[L()] || m.en;
function methodSpeech(m) { const c = methodText(m); return c.t + '. ' + c.s + '. ' + c.how; }

function renderMethods() {
  $('#methods-intro').textContent = t('methodsIntro', { n: FARM_METHODS.length });
  const box = $('#methods-list');
  box.replaceChildren();
  FARM_METHOD_CATS.forEach(cat => {
    box.append(h('h2', { class: 'group-h', text: t('mcat')[cat] }));
    box.append(h('div', { class: 'topics' }, ...FARM_METHODS.filter(m => m.cat === cat).map(m => {
      const c = methodText(m);
      const b = h('button', { type: 'button', class: 'topic' },
        h('span', { class: 'ico', 'aria-hidden': 'true', text: m.icon }), h('b', { text: c.t }), h('span', { text: c.s }));
      b.addEventListener('click', () => openMethod(m));
      return b;
    })));
  });
}

function openMethod(m) {
  const c = methodText(m);
  const box = h('div', null,
    h('div', { class: 'method-top' }, h('span', { class: 'big', 'aria-hidden': 'true', text: m.icon }), h('p', { text: c.s })),
    h('p', { class: 'method-how', text: c.how }),
    h('p', { class: 'hint', text: t('khetiMethods') + ': ' + t('mcat')[m.cat] }),
    h('p', { class: 'note', text: t('khetiNote') }),
    h('div', { class: 'detail-actions' }, listenBtn(() => methodSpeech(m))));
  openDialog('method', c.t, box);
  if (mode === 'voice') say(methodSpeech(m), box.querySelector('.speak'));
}

/* ---------------------------------------------------------------------
   2. Fruits & Vegetables + Nutrient Finder
   --------------------------------------------------------------------- */
const foodName = (f, l) => f.n[NAME_INDEX[l || L()]] || f.n[0];
const dvOf = k => NUTRIENTS.find(n => n.k === k).dv;
const unitOf = k => NUTRIENTS.find(n => n.k === k).unit;
function unitWord(u) { return u === 'kcal' ? t('kcalWord') : u === 'g' ? t('uG') : u === 'mg' ? t('uMg') : t('uUg'); }

/* Nutrients with 20% or more of daily need in 100 g, biggest first */
function highIn(f) {
  return HIGH_KEYS.filter(k => f.d[k] !== null && f.d[k] !== undefined && f.d[k] / dvOf(k) >= 0.2)
    .sort((a, b) => f.d[b] / dvOf(b) - f.d[a] / dvOf(a));
}
function foodIcon(f, big) {
  return h('span', { class: 'fico ' + (f.type === 'fruit' ? 'fruit' : 'veg') + (big ? ' big' : ''), 'aria-hidden': 'true', text: f.e || firstLetter(foodName(f)) });
}

function renderFood() {
  $$('[data-sub]').forEach(b => b.setAttribute('aria-selected', b.dataset.sub === foodSub ? 'true' : 'false'));
  $('#food-foods').hidden = foodSub !== 'foods';
  $('#food-finder').hidden = foodSub !== 'finder';
  if (foodSub === 'foods') renderFoodLists(); else renderFinder();
}

function matchesFood(f, q) {
  if (!q) return true;
  return (f.n.join(' ') + ' ' + f.alias).toLowerCase().includes(q);
}

function renderFoodLists() {
  const q = foodQuery.trim().toLowerCase();
  const groups = [
    ['fruit', '#h-fruits', '#list-fruits', 'fruits'],
    ['veg', '#h-veg', '#list-veg', 'vegetables']
  ];
  let total = 0;
  groups.forEach(([type, hSel, listSel, key]) => {
    const items = FOODS.filter(f => f.type === type && matchesFood(f, q));
    total += items.length;
    $(hSel).replaceChildren(t(key), ' ', h('small', { text: '(' + items.length + ')' }));
    $(hSel).hidden = !items.length;
    const list = $(listSel);
    list.hidden = !items.length;
    list.replaceChildren(...items.map(foodCard));
  });
  const none = $('#food-none');
  none.hidden = total > 0;
  none.textContent = t('noFood');
}

function foodCard(f) {
  const top = highIn(f)[0];
  const b = h('button', { type: 'button', class: 'food' },
    h('span', { class: 'row1' }, foodIcon(f), h('span', { class: 'kc', text: fmtNum(f.d.kcal) + ' kcal' })),
    h('b', { text: foodName(f) }),
    top ? h('span', { class: 'tag', text: t('highInX', { n: t('n')[top] }) }) : null);
  b.addEventListener('click', () => openFood(f));
  return b;
}

function foodSpeech(f) {
  const N = t('n');
  const parts = [foodName(f) + '.', t('per100') + ':'];
  NUTRIENTS.forEach(n => {
    const v = f.d[n.k];
    if (v === null || v === undefined) return;
    parts.push(N[n.k] + ' ' + fmtNum(v) + ' ' + unitWord(n.unit) + '.');
  });
  const hi = highIn(f);
  if (hi.length) parts.push(t('highIn') + ': ' + hi.map(k => N[k]).join(', ') + '.');
  return parts.join(' ');
}

function openFood(f) {
  const N = t('n');
  const others = LANGS.map(l => foodName(f, l)).filter((v, i, a) => a.indexOf(v) === i && v !== foodName(f)).join(', ');
  const box = h('div');
  box.append(h('div', { class: 'food-top' }, foodIcon(f, true),
    h('div', { class: 'names' }, h('b', { text: foodName(f) }), h('span', { text: others })),
    listenBtn(() => foodSpeech(f), '')));

  const hi = highIn(f);
  if (hi.length) box.append(h('div', { class: 'tags' }, h('span', { text: t('highIn') + ':' }), ...hi.map(k => h('span', { class: 'tag', text: N[k] }))));

  const tbody = h('tbody');
  let hasMissing = false;
  NUTRIENTS.forEach(n => {
    const v = f.d[n.k];
    const missing = v === null || v === undefined;
    if (missing) hasMissing = true;
    tbody.append(h('tr', { class: hi.includes(n.k) ? 'hi' : null },
      h('td', { text: N[n.k] }),
      h('td', { class: missing ? 'na' : null, text: missing ? '—' : fmtNum(v) + ' ' + n.unit }),
      h('td', { text: missing ? '' : Math.round(v / n.dv * 100) + '%' })));
  });
  box.append(h('table', { class: 'ntable' },
    h('thead', null, h('tr', null, h('th', { text: t('nutrientCol') }), h('th', { text: t('per100') }), h('th', { text: t('dvShort') }))),
    tbody));
  if (hasMissing) box.append(h('p', { class: 'hint', text: '— = ' + t('notMeasured') }));
  box.append(h('p', { class: 'source', text: t('source') }));
  openDialog('food', foodName(f), box);
  if (mode === 'voice') say(foodSpeech(f), box.querySelector('.speak'));
}

function finderRank(key = finderKey, type = finderType) {
  return FOODS.filter(f => (type === 'all' || f.type === type) && f.d[key] !== null && f.d[key] > 0)
    .sort((a, b) => b.d[key] - a.d[key])
    .slice(0, 15);
}
function finderSpeech(key = finderKey, type = finderType) {
  const N = t('n');
  const u = unitWord(unitOf(key));
  const top = finderRank(key, type).slice(0, 8);
  let s = t('finderTop', { n: N[key] }) + ': ' + top.map(f => foodName(f) + ' ' + fmtNum(f.d[key]) + ' ' + u).join(', ') + '.';
  if (key === 'vitD') s = t('vitDNote') + ' ' + s;
  if (key === 'b6' || key === 'folate') s = t('bNote') + ' ' + s;
  return s;
}

function renderFinder() {
  const N = t('n');
  const chips = $('#nchips');
  chips.replaceChildren(...FINDER_KEYS.map(k => {
    const b = h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': k === finderKey ? 'true' : 'false', text: N[k] });
    b.addEventListener('click', () => {
      finderKey = k;
      renderFinder();
      if (mode === 'voice') say(finderSpeech(), $('#finder-out .speak'));
    });
    return b;
  }));

  const ff = $('#finder-filter');
  ff.replaceChildren(...[['all', t('all')], ['fruit', t('fruits')], ['veg', t('vegetables')]].map(([v, label]) => {
    const b = h('button', { type: 'button', role: 'tab', 'aria-selected': v === finderType ? 'true' : 'false', text: label });
    b.addEventListener('click', () => { finderType = v; renderFinder(); });
    return b;
  }));

  const out = $('#finder-out');
  out.replaceChildren(h('div', { class: 'art-head' }, h('h2', { class: 'finder-h', text: t('finderTop', { n: N[finderKey] }) }), listenBtn(finderSpeech, '')));
  if (finderKey === 'vitD') out.append(h('p', { class: 'info', text: t('vitDNote') }));
  if (finderKey === 'b6' || finderKey === 'folate') out.append(h('p', { class: 'info', text: t('bNote') }));

  const ranked = finderRank();
  const max = ranked.length ? ranked[0].d[finderKey] : 1;
  const unit = unitOf(finderKey);
  out.append(h('ol', { class: 'rank' }, ...ranked.map((f, i) => {
    const v = f.d[finderKey];
    const b = h('button', { type: 'button' },
      h('span', { class: 'pos', text: String(i + 1) }),
      foodIcon(f),
      h('span', { class: 'nm' }, h('b', { text: foodName(f) }), h('span', { class: 'bar' }, h('i', { style: 'width:' + Math.max(3, v / max * 100).toFixed(1) + '%' }))),
      h('span', { class: 'val', text: fmtNum(v) + ' ' + unit }));
    b.addEventListener('click', () => openFood(f));
    return h('li', null, b);
  })));
}

/* ---------------------------------------------------------------------
   Lists from the database (3. Farmers, 4. Delivery, 5. Shop)
   --------------------------------------------------------------------- */
function ensureWatch(role) {
  if (watching[role] || !Store.online) return;
  watching[role] = true;
  Store.watch(role,
    items => {
      lists[role] = items; listFailed[role] = false;
      renderList(role); renderAddButtons();
      if (dlgView === 'account') openAccount();
    },
    err => {
      console.warn(err);
      lists[role] = []; listFailed[role] = true; watching[role] = false;
      renderList(role);
    });
}
function myListing(role) {
  return user && lists[role] ? (lists[role].find(x => x.id === user.uid) || null) : null;
}

function renderList(role) {
  const box = $(LIST_EL[role]);
  box.replaceChildren();
  if (!Store.online || listFailed[role]) { box.append(emptyBox(t('offline'))); return; }
  const items = lists[role];
  if (items === null) { box.append(emptyBox(t('loading'))); return; }
  if (role === 'farmer') renderFarmers(box, items);
  else if (role === 'delivery') renderDelivery(box, items);
  else renderShops(box, items);
}

function renderAddButtons() {
  const keys = { farmer: ['addFarm', 'editFarm'], delivery: ['addDelivery', 'editDelivery'], shop: ['addShop', 'editShop'] };
  Object.keys(ADD_BTN).forEach(role => {
    const b = $(ADD_BTN[role]);
    const mine = myListing(role);
    b.innerHTML = mine ? ICON.edit : ICON.plus;
    b.append(h('span', { text: t(keys[role][mine ? 1 : 0]) }));
    b.onclick = () => startListingFlow(role);
  });
}

/* Call button: needs login + own profile. Shows the number after tapping. */
function callLink(c) {
  const a = h('a', { class: 'btn call ready', href: 'tel:+91' + c.phone, html: ICON.phone });
  a.append(h('span', { text: t('callNow', { p: prettyPhone(c.phone) }) }));
  return a;
}
function callBtn(uid) {
  if (user && contactCache[uid]) return callLink(contactCache[uid]);
  const b = h('button', { type: 'button', class: 'btn call', html: ICON.phone });
  b.append(h('span', { text: user ? t('call') : t('loginToCall') }));
  b.addEventListener('click', async e => {
    e.stopPropagation();
    if (!Store.online) { toast(t('loginOff')); return; }
    if (!user) { openLogin(); return; }
    if (!profileLoaded) { toast(t('loading')); return; }
    if (!profile) { toast(t('needProfile')); openProfile({}); return; }
    b.disabled = true;
    try {
      const c = await Store.getContact(uid);
      if (!c || !c.phone) { toast(t('noContact')); return; }
      contactCache[uid] = c;
      b.replaceWith(callLink(c));
    } catch (err) {
      console.warn(err);
      toast(err && err.code === 'permission-denied' ? t('needProfile') : t('offline'));
    } finally {
      b.disabled = false;
    }
  });
  return b;
}
function editBtn(role) {
  const keys = { farmer: 'editFarm', delivery: 'editDelivery', shop: 'editShop' };
  const b = h('button', { type: 'button', class: 'btn ghost', html: ICON.edit });
  b.append(h('span', { text: t(keys[role]) }));
  b.addEventListener('click', e => { e.stopPropagation(); startListingFlow(role); });
  return b;
}

/* ---------- 3. Farmers ---------- */
function farmerSpeech(f) {
  const parts = [f.name + '.', t('location') + ': ' + placeText(f) + '.'];
  if (f.method) parts.push(t('method') + ': ' + (t('methods')[f.method] || '') + '.');
  if (f.crops && f.crops.length) parts.push(t('cropsLabel') + ': ' + f.crops.join(', ') + '.');
  if (f.produce && f.produce.length) {
    parts.push(t('produceLabel') + ': ' + f.produce.map(p => p.name + (p.price ? ' ₹' + p.price + ' ' + unitName(p.unit) : '')).join(', ') + '.');
  }
  if (f.inputs) parts.push(t('inputsLabel') + ': ' + f.inputs + '.');
  parts.push((f.visit ? t('visitYes') : t('visitNo')) + '.');
  return parts.join(' ');
}

function renderFarmers(box, items) {
  const q = farmerQuery.trim().toLowerCase();
  const rows = items.filter(f => (!farmerMethod || f.method === farmerMethod) &&
    (!q || [f.name, f.village, f.district, f.state, (f.crops || []).join(' '), f.about, (f.produce || []).map(p => p.name).join(' ')].join(' ').toLowerCase().includes(q)));
  if (!rows.length) {
    box.append(q || farmerMethod ? emptyBox(t('nothing'), t('tryOther')) : emptyBox(t('emptyFarmers'), t('emptyFarmersHow')));
    return;
  }
  rows.forEach(f => box.append(farmerCard(f)));
}

function farmerCard(f) {
  const mine = !!(user && f.id === user.uid);
  const thumb = isImage(f.thumb) ? h('img', { class: 'thumb', src: f.thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'thumb', 'aria-hidden': 'true', text: '🌾' });
  const main = h('button', { type: 'button', class: 'card-main' }, thumb,
    h('div', null,
      h('h3', { text: f.name }),
      h('p', { class: 'meta', text: placeText(f) }),
      h('div', { class: 'chips' },
        f.method ? h('span', { class: 'chip ' + f.method, text: t('methods')[f.method] || '' }) : null,
        ...(f.crops || []).slice(0, 4).map(c => h('span', { class: 'chip', text: c })))));
  main.addEventListener('click', () => openFarmer(f));
  return h('article', { class: 'card' + (mine ? ' mine' : '') }, main,
    h('div', { class: 'card-actions' }, mine ? editBtn('farmer') : callBtn(f.id), listenBtn(() => farmerSpeech(f), '')));
}

function openFarmer(f) {
  const mine = !!(user && f.id === user.uid);
  const box = h('div');
  const gallery = h('div', { class: 'gallery' });
  if (isImage(f.thumb)) gallery.append(h('img', { src: f.thumb, alt: '' }));
  else gallery.hidden = true;
  if (f.photoCount > 0) {
    Store.getFarmPhotos(f.id).then(photos => {
      const ok = photos.filter(isImage);
      if (ok.length) { gallery.hidden = false; gallery.replaceChildren(...ok.map(src => h('img', { src, alt: '' }))); }
    }).catch(err => console.warn(err));
  }
  box.append(gallery);
  box.append(h('div', { class: 'chips' },
    f.method ? h('span', { class: 'chip ' + f.method, text: t('methods')[f.method] || '' }) : null,
    h('span', { class: 'chip ' + (f.visit ? 'yes' : 'no'), text: f.visit ? t('visitYes') : t('visitNo') })));

  const dl = h('dl', { class: 'dl' });
  const add = (label, value) => { if (value) dl.append(h('dt', { text: label }), h('dd', { text: value })); };
  add(t('location'), placeText(f));
  add(t('cropsLabel'), (f.crops || []).join(', '));
  add(t('inputsLabel'), f.inputs);
  add(t('aboutLabel'), f.about);
  box.append(dl);

  if (f.produce && f.produce.length) {
    box.append(h('h3', { text: t('produceLabel') }));
    const tbody = h('tbody');
    f.produce.forEach(p => tbody.append(h('tr', null, h('td', { text: p.name }), h('td', { text: p.price ? '₹' + p.price + ' ' + unitName(p.unit) : t('priceOnCall') }))));
    box.append(h('table', { class: 'sale' }, tbody));
  }
  if (f.updatedAt) box.append(h('p', { class: 'hint', text: t('updated', { d: dateText(f.updatedAt) }) }));
  box.append(h('p', { class: 'trust', text: t('trust') }));
  box.append(h('div', { class: 'detail-actions' }, mine ? editBtn('farmer') : callBtn(f.id), listenBtn(() => farmerSpeech(f))));
  openDialog('farmer', f.name, box);
  if (mode === 'voice') say(farmerSpeech(f), box.querySelector('.detail-actions .speak'));
}

/* ---------- 4. Delivery ---------- */
function deliverySpeech(d) {
  return [d.name + '.', (t('vehicles')[d.vehicle] || '') + '.', t('areasLabel') + ': ' + d.areas + '.', t('chargesLabel') + ': ' + d.charges + '.',
    (d.available ? t('availableYes') : t('availableNo')) + '.'].join(' ');
}
function renderDelivery(box, items) {
  const q = deliveryQuery.trim().toLowerCase();
  const rows = items.filter(d => !q || [d.name, d.village, d.district, d.state, d.areas].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
  if (!rows.length) {
    box.append(q ? emptyBox(t('nothing'), t('tryOther')) : emptyBox(t('emptyDelivery'), t('emptyDeliveryHow')));
    return;
  }
  rows.forEach(d => {
    const mine = !!(user && d.id === user.uid);
    const dl = h('dl', { class: 'dl' }, h('dt', { text: t('areasLabel') }), h('dd', { text: d.areas }), h('dt', { text: t('chargesLabel') }), h('dd', { text: d.charges }));
    box.append(h('article', { class: 'card' + (mine ? ' mine' : '') },
      h('div', { class: 'card-main noimg' }, h('div', null,
        h('h3', { text: (VEHICLE_ICON[d.vehicle] || '🚚') + ' ' + d.name }),
        h('p', { class: 'meta', text: [(t('vehicles')[d.vehicle] || ''), placeText(d)].filter(Boolean).join(', ') }),
        h('div', { class: 'chips' }, h('span', { class: 'chip ' + (d.available ? 'yes' : 'no'), text: d.available ? t('availableYes') : t('availableNo') })),
        dl)),
      h('div', { class: 'card-actions' }, mine ? editBtn('delivery') : callBtn(d.id), listenBtn(() => deliverySpeech(d), ''))));
  });
}

/* ---------- 5. Shop ---------- */
function shopHay(s) { return [s.shopName, s.village, s.district, s.state, s.about].join(' '); }
function productSpeech(s, p) {
  if (!p) return s.shopName + '. ' + placeText(s) + '.';
  return [p.name + '.', p.price ? '₹' + p.price + ' ' + unitName(p.unit) + '.' : t('priceOnCall') + '.', s.shopName + ', ' + placeText(s) + '.'].join(' ');
}
function shopSpeech(s) {
  const prods = (s.products || []).slice(0, 12).map(p => p.name + (p.price ? ' ₹' + p.price + ' ' + unitName(p.unit) : '')).join(', ');
  return [s.shopName + '.', placeText(s) + '.', s.about ? s.about + '.' : '', prods ? t('products') + ': ' + prods + '.' : ''].filter(Boolean).join(' ');
}

function renderCatChips() {
  const box = $('#catchips');
  box.replaceChildren(...[['', t('allCats')], ...CATS.map(c => [c, t('cats')[c]])].map(([v, label]) => {
    const b = h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': v === shopCat ? 'true' : 'false', text: label });
    b.addEventListener('click', () => { shopCat = v; renderList('shop'); });
    return b;
  }));
}

function renderShops(box, items) {
  renderCatChips();
  const q = shopQuery.trim().toLowerCase();
  const rows = [];
  items.forEach(s => {
    const prods = Array.isArray(s.products) ? s.products : [];
    if (!prods.length) {
      if (!shopCat && (!q || shopHay(s).toLowerCase().includes(q))) rows.push({ s, p: null });
      return;
    }
    prods.forEach(p => {
      if (shopCat && p.cat !== shopCat) return;
      if (q && !(p.name + ' ' + shopHay(s)).toLowerCase().includes(q)) return;
      rows.push({ s, p });
    });
  });
  if (!rows.length) {
    box.append(q || shopCat ? emptyBox(t('nothing'), t('tryOther')) : emptyBox(t('emptyShop'), t('emptyShopHow')));
    return;
  }
  rows.forEach(({ s, p }) => {
    const mine = !!(user && s.id === user.uid);
    const main = h('button', { type: 'button', class: 'card-main noimg' }, h('div', null,
      p ? h('span', { class: 'cat-label', text: t('cats')[p.cat] || '' }) : null,
      h('h3', { text: p ? p.name : s.shopName }),
      p ? h('p', { class: 'price' }, p.price ? '₹' + p.price + ' ' : t('priceOnCall'), p.price ? h('small', { text: unitName(p.unit) }) : null) : null,
      h('p', { class: 'meta', text: (p ? s.shopName + ', ' : '') + placeText(s) })));
    main.addEventListener('click', () => openShop(s));
    box.append(h('article', { class: 'card' + (mine ? ' mine' : '') }, main,
      h('div', { class: 'card-actions' }, mine ? editBtn('shop') : callBtn(s.id), listenBtn(() => productSpeech(s, p), ''))));
  });
}

function openShop(s) {
  const mine = !!(user && s.id === user.uid);
  const box = h('div');
  const dl = h('dl', { class: 'dl' }, h('dt', { text: t('location') }), h('dd', { text: placeText(s) }));
  if (s.about) dl.append(h('dt', { text: t('shopAbout') }), h('dd', { text: s.about }));
  box.append(dl);
  const prods = Array.isArray(s.products) ? s.products : [];
  if (prods.length) {
    box.append(h('h3', { text: t('products') + ' (' + prods.length + ')' }));
    const tbody = h('tbody');
    prods.forEach(p => tbody.append(h('tr', null,
      h('td', null, h('b', { text: p.name }), h('div', { class: 'hint', text: t('cats')[p.cat] || '' })),
      h('td', { text: p.price ? '₹' + p.price + ' ' + unitName(p.unit) : t('priceOnCall') }))));
    box.append(h('table', { class: 'sale' }, tbody));
  }
  if (s.updatedAt) box.append(h('p', { class: 'hint', text: t('updated', { d: dateText(s.updatedAt) }) }));
  box.append(h('div', { class: 'detail-actions' }, mine ? editBtn('shop') : callBtn(s.id), listenBtn(() => shopSpeech(s))));
  openDialog('shop', s.shopName, box);
  if (mode === 'voice') say(shopSpeech(s), box.querySelector('.detail-actions .speak'));
}

/* ---------------------------------------------------------------------
   Login, account and profile
   --------------------------------------------------------------------- */
function openLogin(opts) {
  afterLogin = (opts && opts.then) || null;
  if (!Store.online) { openDialog('login', t('loginTitle'), h('p', { class: 'info', text: t('loginOff') })); return; }
  const err = h('p', { class: 'err', role: 'alert' });
  const g = h('button', { type: 'button', class: 'btn primary wide', html: ICON.login });
  g.append(h('span', { text: t('loginGoogle') }));
  g.addEventListener('click', async () => {
    g.disabled = true; err.textContent = '';
    try { await Store.login(); }
    catch (e) {
      console.warn(e);
      if (!e || (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request')) err.textContent = t('loginFail');
    } finally { g.disabled = false; }
  });
  openDialog('login', t('loginTitle'), h('div', { class: 'stack' },
    h('p', { text: t('loginWhy') }), g, err, h('p', { class: 'hint', text: t('loginTip') }),
    listenBtn(t('loginWhy') + ' ' + t('loginTip'))));
}

function openAccount() {
  if (!Store.online || !user) { openLogin(); return; }
  if (!profileLoaded) { toast(t('loading')); return; }
  if (!profile) { openProfile({}); return; }
  const role = profile.role;
  const box = h('div', { class: 'stack' });
  box.append(h('div', { class: 'acct-box' },
    h('b', { text: profile.name }),
    h('div', { text: prettyPhone(profile.phone) }),
    h('div', { text: t('roles')[role] + ', ' + placeText(profile) }),
    h('div', { class: 'hint', text: t('loggedInAs', { e: user.email || user.displayName || '' }) })));

  const edit = h('button', { type: 'button', class: 'btn ghost', html: ICON.edit });
  edit.append(h('span', { text: t('editDetails') }));
  edit.addEventListener('click', () => openProfile({}));
  box.append(edit);

  if (role !== 'consumer') {
    ensureWatch(role);
    const mine = myListing(role);
    const keys = { farmer: ['addFarm', 'editFarm'], delivery: ['addDelivery', 'editDelivery'], shop: ['addShop', 'editShop'] };
    const lb = h('button', { type: 'button', class: 'btn primary', html: mine ? ICON.edit : ICON.plus });
    lb.append(h('span', { text: t(keys[role][mine ? 1 : 0]) }));
    lb.addEventListener('click', () => startListingFlow(role));
    box.append(lb);
  }

  const out = h('button', { type: 'button', class: 'btn ghost', html: ICON.logout });
  out.append(h('span', { text: t('logout') }));
  out.addEventListener('click', async () => {
    try { await Store.logout(); } catch (e) { console.warn(e); }
    closeDialog();
  });
  box.append(out);

  const del = h('button', { type: 'button', class: 'btn danger', html: ICON.trash });
  const delText = h('span', { text: t('deleteMe') });
  del.append(delText);
  let armed = false;
  del.addEventListener('click', async () => {
    if (!armed) { armed = true; delText.textContent = t('deleteSure'); return; }
    del.disabled = true;
    try {
      await Store.deleteEverything(user.uid);
      toast(t('deletedMe'));
      closeDialog();
    } catch (e) { console.warn(e); toast(t('saveErr')); del.disabled = false; }
  });
  box.append(del);
  openDialog('account', t('account'), box);
}

/* ---------- Form building blocks ---------- */
let fieldSeq = 0;
function field(label, input, opts) {
  opts = opts || {};
  const id = 'fld-' + (++fieldSeq);
  input.id = id;
  const top = h('div', { class: 'flabel' },
    h('label', { for: id }, label, opts.req ? h('span', { class: 'req', text: ' *' }) : null, opts.opt ? h('span', { class: 'opt', text: ' (' + t('optional') + ')' }) : null),
    listenBtn(label + (opts.hint ? '. ' + opts.hint : ''), ''));
  const control = opts.mic ? h('div', { class: 'inrow' }, input, micBtn(input)) : input;
  return h('div', { class: 'field' }, top, control, opts.hint ? h('p', { class: 'hint', text: opts.hint }) : null);
}
function textBox(value, max, extra) {
  const i = h('input', Object.assign({ type: 'text', maxlength: String(max || 100), autocomplete: 'off' }, extra || {}));
  i.value = value || '';
  return i;
}
function textArea(value, max) {
  const a = h('textarea', { maxlength: String(max || 400), rows: '3' });
  a.value = value || '';
  return a;
}
function selectBox(options, value) {
  const s = h('select', null, ...options.map(([v, label]) => h('option', { value: String(v), text: label })));
  s.value = value !== undefined && value !== null ? String(value) : String(options[0][0]);
  return s;
}
function checkBox(label, checked) {
  const c = h('input', { type: 'checkbox' });
  c.checked = !!checked;
  return { input: c, el: h('label', { class: 'check' }, c, h('span', { text: label })) };
}
function formActions(onSave, extraBtn) {
  const err = h('p', { class: 'err', role: 'alert' });
  const save = h('button', { type: 'submit', class: 'btn primary', text: t('save') });
  const cancel = h('button', { type: 'button', class: 'btn ghost', text: t('cancel') });
  cancel.addEventListener('click', closeDialog);
  const row = h('div', { class: 'form-actions' }, extraBtn || null, cancel, save);
  return { err, save, row };
}
function markBad(el, bad) { el.classList.toggle('bad', !!bad); return !!bad; }
function errText(e) { return e && e.code === 'permission-denied' ? t('permErr') : t('saveErr'); }

/* Phone: keep digits, drop +91 / 0 at the start */
function cleanPhone(v) {
  let d = Voice.digitsToEnglish(String(v || '')).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}
const goodPhone = p => /^[6-9][0-9]{9}$/.test(p);

/* ---------- Profile form ---------- */
function openProfile(opts) {
  opts = opts || {};
  const p = profile || {};
  const name = textBox(p.name || (user && user.displayName) || '', 60);
  const phone = textBox(p.phone || '', 20, { type: 'tel', inputmode: 'tel', autocomplete: 'tel' });
  const village = textBox(p.village, 80);
  const district = textBox(p.district, 60);
  const state = textBox(p.state, 60);

  let chosenRole = opts.presetRole || p.role || '';
  const warn = h('p', { class: 'hint', text: t('roleChangeWarn') });
  const updateWarn = () => { warn.hidden = !(p.role && p.role !== 'consumer' && chosenRole !== p.role); };
  const roleBox = h('div', { class: 'roles', role: 'radiogroup' }, ...ROLES.map(r => {
    const radio = h('input', { type: 'radio', name: 'role', value: r });
    radio.checked = r === chosenRole;
    radio.addEventListener('change', () => { chosenRole = r; roleBox.classList.remove('bad'); updateWarn(); });
    return h('label', { class: 'role-opt' }, radio, h('b', { text: t('roles')[r] }), h('span', { text: t('roleDesc')[r] }));
  }));
  updateWarn();

  const { err, save, row } = formActions();
  const form = h('form', { class: 'form', novalidate: true },
    h('p', { class: 'hint', text: t('profileWhy') }),
    field(t('name'), name, { req: true, mic: true }),
    field(t('phone'), phone, { req: true, hint: t('phoneHint') }),
    h('div', { class: 'field' }, h('div', { class: 'flabel' }, h('span', null, t('role'), h('span', { class: 'req', text: ' *' })), listenBtn(() => t('role') + ' ' + ROLES.map(r => t('roles')[r]).join(', '), '')), roleBox, warn),
    field(t('village'), village, { req: true, mic: true }),
    field(t('district'), district, { req: true, mic: true }),
    field(t('state'), state, { req: true, mic: true }),
    err, row);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const data = {
      name: name.value.trim(), phone: cleanPhone(phone.value), role: chosenRole,
      village: village.value.trim(), district: district.value.trim(), state: state.value.trim(),
      updatedAt: Date.now()
    };
    let bad = false;
    bad = markBad(name, !data.name) || bad;
    bad = markBad(roleBox, !ROLES.includes(data.role)) || bad;
    bad = markBad(village, !data.village) || bad;
    bad = markBad(district, !data.district) || bad;
    bad = markBad(state, !data.state) || bad;
    const phoneBad = markBad(phone, !goodPhone(data.phone));
    if (bad || phoneBad) {
      err.textContent = phoneBad && !bad ? t('phoneBad') : t('needFields') + (phoneBad ? ' ' + t('phoneBad') : '');
      if (mode === 'voice') say(err.textContent);
      return;
    }
    save.disabled = true; save.textContent = t('saving');
    const oldRole = p.role;
    try {
      // Changing role: remove the old public listing first
      if (oldRole && oldRole !== data.role && oldRole !== 'consumer') {
        try { await Store.removeListing(oldRole, user.uid); } catch (x) { console.warn(x); }
      }
      await Store.saveProfile(user.uid, data);
      // Same role: copy the new name / place into the public listing too
      if (oldRole && oldRole === data.role && data.role !== 'consumer') {
        try { await Store.updateListing(data.role, user.uid, { name: data.name, village: data.village, district: data.district, state: data.state, updatedAt: data.updatedAt }); }
        catch (x) { /* no listing yet */ }
      }
      profile = data;
      toast(t('saved'));
      renderHeader(); renderAddButtons(); ['farmer', 'delivery', 'shop'].forEach(r => { if (lists[r]) renderList(r); });
      if (data.role !== 'consumer') ensureWatch(data.role);
      const next = opts.then;
      if (next) next();
      else if (data.role !== 'consumer' && oldRole !== data.role) openListingForm(data.role);
      else closeDialog();
    } catch (x) {
      console.warn(x);
      err.textContent = errText(x);
    } finally {
      save.disabled = false; save.textContent = t('save');
    }
  });
  openDialog('profile', t('profileTitle'), form);
}

/* Login is needed → profile → right role → the farm / shop / delivery form */
function startListingFlow(role) {
  if (!Store.online) { toast(t('loginOff')); return; }
  if (!user) { openLogin({ then: () => startListingFlow(role) }); return; }
  if (!profileLoaded) { toast(t('loading')); return; }
  if (!profile) { openProfile({ presetRole: role, then: () => startListingFlow(role) }); return; }
  if (profile.role !== role) {
    toast(t('roleNeeded', { r: t('roles')[role] }), 6000);
    openProfile({ presetRole: role, then: () => startListingFlow(role) });
    return;
  }
  openListingForm(role);
}

async function openListingForm(role) {
  const view = 'form-' + role;
  const titles = { farmer: 'farmTitle', delivery: 'deliveryFormTitle', shop: 'shopFormTitle' };
  openDialog(view, t(titles[role]), emptyBox(t('loading')));
  let existing = null, photos = [];
  try {
    existing = await Store.getListing(role, user.uid);
    if (role === 'farmer' && existing && existing.photoCount) photos = await Store.getFarmPhotos(user.uid);
  } catch (e) { console.warn(e); }
  if (dlgView !== view) return;     // closed while loading
  const form = role === 'farmer' ? farmerForm(existing, photos) : role === 'delivery' ? deliveryForm(existing) : shopForm(existing);
  openDialog(view, t(titles[role]), form);
}

/* "Remove my listing" – press twice */
function removeListingBtn(role) {
  const b = h('button', { type: 'button', class: 'btn danger', html: ICON.trash });
  const label = h('span', { text: t('removeListing') });
  b.append(label);
  let armed = false;
  b.addEventListener('click', async () => {
    if (!armed) { armed = true; label.textContent = t('removeSure'); return; }
    b.disabled = true;
    try { await Store.removeListing(role, user.uid); toast(t('removed')); closeDialog(); }
    catch (e) { console.warn(e); toast(errText(e)); b.disabled = false; }
  });
  return b;
}

/* Rows of items with price (farm produce, shop products) */
function itemRows(items, withCat, maxRows) {
  const box = h('div', { class: 'rows' });
  const unitOptions = t('units').map((u, i) => [i, u]);
  const catOptions = CATS.map(c => [c, t('cats')[c]]);
  function addRow(it) {
    it = it || {};
    const name = textBox(it.name, 60, { class: 'r-name', placeholder: withCat ? t('productName') : t('itemName'), 'aria-label': withCat ? t('productName') : t('itemName') });
    const price = h('input', { type: 'number', min: '0', step: 'any', inputmode: 'decimal', class: 'r-price', placeholder: t('price'), 'aria-label': t('price') });
    price.value = it.price === null || it.price === undefined ? '' : it.price;
    const unit = selectBox(unitOptions, it.unit !== undefined ? it.unit : 0);
    unit.classList.add('r-unit'); unit.setAttribute('aria-label', t('unit'));
    const del = h('button', { type: 'button', class: 'r-del', 'aria-label': t('removeItem'), html: ICON.trash });
    const row = h('div', { class: 'rowitem' + (withCat ? ' shop' : '') }, name);
    if (withCat) { const cat = selectBox(catOptions, it.cat || 'fertilizer'); cat.classList.add('r-cat'); cat.setAttribute('aria-label', t('category')); row.append(cat); }
    row.append(price, unit, del);
    del.addEventListener('click', () => { row.remove(); addBtn.hidden = box.querySelectorAll('.rowitem').length >= maxRows; });
    box.insertBefore(row, addBtn);
    addBtn.hidden = box.querySelectorAll('.rowitem').length >= maxRows;
  }
  const addBtn = h('button', { type: 'button', class: 'btn ghost', html: ICON.plus });
  addBtn.append(h('span', { text: t('addItem') }));
  addBtn.addEventListener('click', () => { addRow(); const rows = box.querySelectorAll('.r-name'); rows[rows.length - 1].focus(); });
  box.append(addBtn);
  (items && items.length ? items : [{}]).forEach(addRow);
  return {
    el: box,
    read() {
      return Array.from(box.querySelectorAll('.rowitem')).map(r => {
        const name = r.querySelector('.r-name').value.trim().slice(0, 60);
        const pv = r.querySelector('.r-price').value;
        const price = pv === '' ? null : Math.max(0, Math.round(Number(pv) * 100) / 100);
        const it = { name, price: Number.isFinite(price) ? price : null, unit: Number(r.querySelector('.r-unit').value) || 0 };
        if (withCat) it.cat = r.querySelector('.r-cat').value;
        return it;
      }).filter(it => it.name).slice(0, maxRows);
    }
  };
}

/* ---------- Farm photos: made small in the phone before saving ---------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function drawJpeg(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), hgt = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
  ctx.drawImage(img, 0, 0, w, hgt);
  return c.toDataURL('image/jpeg', quality);
}
function drawSquare(img, size, quality) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', quality);
}
async function compressPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let out = drawJpeg(img, 900, 0.6);
    if (out.length > 190000) out = drawJpeg(img, 720, 0.5);
    if (out.length > 190000) out = drawJpeg(img, 560, 0.45);
    return out;
  } finally { URL.revokeObjectURL(url); }
}
async function makeThumb(dataUrl) { return drawSquare(await loadImage(dataUrl), 200, 0.65); }

function photoPicker(initial) {
  let photos = initial.slice(0, MAX_PHOTOS);
  const grid = h('div', { class: 'photos' });
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true });
  const add = h('label', { class: 'ph-add', html: ICON.camera }, input, h('span', { text: t('addPhoto') }));
  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []).slice(0, MAX_PHOTOS - photos.length);
    input.value = '';
    for (const f of files) {
      try { photos.push(await compressPhoto(f)); }
      catch (e) { console.warn(e); toast(t('photoErr')); }
    }
    draw();
  });
  function draw() {
    grid.replaceChildren(...photos.map((src, i) => {
      const rm = h('button', { type: 'button', 'aria-label': t('removePhoto'), html: ICON.close });
      rm.addEventListener('click', () => { photos.splice(i, 1); draw(); });
      return h('div', { class: 'ph' }, h('img', { src, alt: '' }), rm);
    }));
    if (photos.length < MAX_PHOTOS) grid.append(add);
  }
  draw();
  return { el: grid, get: () => photos.slice() };
}

/* ---------- Farm form ---------- */
function farmerForm(ex, oldPhotos) {
  ex = ex || {};
  const crops = textBox((ex.crops || []).join(', '), 300);
  const method = selectBox(METHODS.map(m => [m, t('methods')[m]]), ex.method || 'organic');
  const inputs = textArea(ex.inputs, 300);
  const about = textArea(ex.about, 500);
  const visit = checkBox(t('visit'), ex.visit !== undefined ? ex.visit : true);
  const produce = itemRows(ex.produce, false, 15);
  const pics = photoPicker((oldPhotos || []).filter(isImage));
  const { err, save, row } = formActions(null, ex.updatedAt ? removeListingBtn('farmer') : null);

  const form = h('form', { class: 'form', novalidate: true },
    field(t('crops'), crops, { req: true, mic: true, hint: t('cropsHint') }),
    field(t('method'), method, { req: true }),
    field(t('inputs'), inputs, { mic: true, hint: t('inputsHint') }),
    field(t('about'), about, { opt: true, mic: true, hint: t('aboutHint') }),
    visit.el,
    h('div', { class: 'field' }, h('div', { class: 'flabel' }, h('span', null, t('produce'), h('span', { class: 'opt', text: ' (' + t('optional') + ')' }))), h('p', { class: 'hint', text: t('produceHint') }), produce.el),
    h('div', { class: 'field' }, h('div', { class: 'flabel' }, h('span', null, t('photos'), h('span', { class: 'opt', text: ' (' + t('optional') + ')' }))), h('p', { class: 'hint', text: t('photosHint') }), pics.el),
    err, row);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const cropList = crops.value.split(/[,،、\n;]+/).map(s => s.trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    if (markBad(crops, !cropList.length)) { err.textContent = t('needFields'); if (mode === 'voice') say(err.textContent); return; }
    save.disabled = true; save.textContent = t('saving');
    try {
      const photos = pics.get();
      const data = {
        name: profile.name, village: profile.village, district: profile.district, state: profile.state,
        crops: cropList, method: method.value,
        inputs: inputs.value.trim().slice(0, 300), about: about.value.trim().slice(0, 500),
        visit: visit.input.checked, produce: produce.read(),
        thumb: photos.length ? await makeThumb(photos[0]) : '',
        photoCount: photos.length, updatedAt: Date.now()
      };
      await Store.saveListing('farmer', user.uid, data, photos);
      toast(t('saved'));
      closeDialog();
      showTab('farmers', false);
    } catch (x) { console.warn(x); err.textContent = errText(x); }
    finally { save.disabled = false; save.textContent = t('save'); }
  });
  return form;
}

/* ---------- Delivery form ---------- */
function deliveryForm(ex) {
  ex = ex || {};
  const vehicle = selectBox(VEHICLES.map(v => [v, t('vehicles')[v]]), ex.vehicle || 'bike');
  const areas = textArea(ex.areas, 200);
  const charges = textBox(ex.charges, 150);
  const available = checkBox(t('available'), ex.available !== undefined ? ex.available : true);
  const { err, save, row } = formActions(null, ex.updatedAt ? removeListingBtn('delivery') : null);
  const form = h('form', { class: 'form', novalidate: true },
    field(t('vehicle'), vehicle, { req: true }),
    field(t('areas'), areas, { req: true, mic: true, hint: t('areasHint') }),
    field(t('charges'), charges, { req: true, mic: true, hint: t('chargesHint') }),
    available.el, err, row);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    let bad = markBad(areas, !areas.value.trim());
    bad = markBad(charges, !charges.value.trim()) || bad;
    if (bad) { err.textContent = t('needFields'); if (mode === 'voice') say(err.textContent); return; }
    save.disabled = true; save.textContent = t('saving');
    try {
      await Store.saveListing('delivery', user.uid, {
        name: profile.name, village: profile.village, district: profile.district, state: profile.state,
        vehicle: vehicle.value, areas: areas.value.trim().slice(0, 200), charges: charges.value.trim().slice(0, 150),
        available: available.input.checked, updatedAt: Date.now()
      });
      toast(t('saved'));
      closeDialog();
      showTab('delivery', false);
    } catch (x) { console.warn(x); err.textContent = errText(x); }
    finally { save.disabled = false; save.textContent = t('save'); }
  });
  return form;
}

/* ---------- Shop form ---------- */
function shopForm(ex) {
  ex = ex || {};
  const shopName = textBox(ex.shopName, 80, { placeholder: t('shopNameHint') });
  const about = textArea(ex.about, 300);
  const products = itemRows(ex.products, true, 40);
  const { err, save, row } = formActions(null, ex.updatedAt ? removeListingBtn('shop') : null);
  const form = h('form', { class: 'form', novalidate: true },
    field(t('shopName'), shopName, { req: true, mic: true }),
    field(t('shopAbout'), about, { opt: true, mic: true, hint: t('shopAboutHint') }),
    h('div', { class: 'field' }, h('div', { class: 'flabel' }, h('span', null, t('products'))), h('p', { class: 'hint', text: t('productsHint') }), products.el),
    err, row);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    if (markBad(shopName, !shopName.value.trim())) { err.textContent = t('needFields'); if (mode === 'voice') say(err.textContent); return; }
    save.disabled = true; save.textContent = t('saving');
    try {
      await Store.saveListing('shop', user.uid, {
        shopName: shopName.value.trim().slice(0, 80), name: profile.name,
        village: profile.village, district: profile.district, state: profile.state,
        about: about.value.trim().slice(0, 300), products: products.read(), updatedAt: Date.now()
      });
      toast(t('saved'));
      closeDialog();
      showTab('shop', false);
    } catch (x) { console.warn(x); err.textContent = errText(x); }
    finally { save.disabled = false; save.textContent = t('save'); }
  });
  return form;
}

/* ---------------------------------------------------------------------
   Ask by voice. ask.js finds the answer in this app's own content
   (foods, Nutrient Finder, Kheti Gyan, farming methods, lists).
   Here the answer is only shown and read aloud; nothing new is written.
   --------------------------------------------------------------------- */
let askState = null;   // { input, mic, status, out, ex, q, byVoice } while the Ask pop-up is open
const ROLE_TAB = { farmer: 'farmers', shop: 'shop', delivery: 'delivery' };
const ROLE_FOUND = { farmer: 'askFarmersFound', shop: 'askShopsFound', delivery: 'askDeliveryFound' };
const ROLE_TITLE = { farmer: 'farmersTitle', shop: 'shopTitle', delivery: 'deliveryTitle' };

function askLists() {
  const pick = r => (listFailed[r] ? undefined : lists[r]);
  return { farmer: pick('farmer'), shop: pick('shop'), delivery: pick('delivery'), offline: !Store.online };
}

function openAsk() {
  if (Store.online) ['farmer', 'delivery', 'shop'].forEach(ensureWatch);
  const input = h('input', { type: 'search', autocomplete: 'off', enterkeyhint: 'search', placeholder: t('askType'), 'aria-label': t('askType') });
  const mic = h('button', { type: 'button', class: 'askmic', 'aria-pressed': 'false', 'aria-label': t('mic'), html: ICON.mic });
  const status = h('p', { class: 'askstatus', role: 'status', text: Voice.canListen ? t('askTapMic') : '' });
  const form = h('form', { class: 'askform', role: 'search' }, input, h('button', { type: 'submit', class: 'btn primary', text: t('askGo') }));
  const ex = h('div', { class: 'askex' }, ...t('askEx').map(q => {
    const b = h('button', { type: 'button', class: 'chipbtn', text: q });
    b.addEventListener('click', () => { input.value = q; runAsk(q, false); });
    return b;
  }));
  const out = h('div', { class: 'askout' });
  const box = h('div', null,
    h('div', { class: 'ask-top' }, Voice.canListen ? mic : null, status, h('p', { class: 'hint', text: t('askHint') })),
    form, ex, out,
    h('p', { class: 'askonly', text: t('askOnlyApp') }));
  form.addEventListener('submit', e => { e.preventDefault(); input.blur(); runAsk(input.value, false); });
  mic.addEventListener('click', askListen);
  openDialog('ask', t('askTitle'), box);
  askState = { input, mic, status, out, ex, q: '', byVoice: false };
  if (Voice.canListen) askListen();   // the Ask button was the tap: start listening at once
  else input.focus();
}

function askListen() {
  const s = askState;
  if (!s) return;
  if (s.mic.getAttribute('aria-pressed') === 'true') { Voice.stopListening(); return; }
  Voice.stop();
  let heard = false;
  const started = Voice.listen(L(),
    said => { heard = true; s.input.value = said; runAsk(said, true); },
    () => { s.status.textContent = t('micNo'); },
    active => {
      s.mic.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) s.status.textContent = t('askListening');
      else if (!heard && s.status.textContent === t('askListening')) s.status.textContent = t('askTapMic');
    });
  if (!started) s.status.textContent = t('micNo');
}

function runAsk(q, byVoice) {
  const s = askState;
  if (!s) return;
  q = String(q || '').trim();
  if (!q) { s.input.focus(); return; }
  s.q = q; s.byVoice = byVoice;
  s.ex.hidden = true;
  if (Voice.canListen) s.status.textContent = t('askTapMic');
  showAnswer(Ask.search(q, L(), askLists()), byVoice || mode === 'voice');
}

function showAnswer(r, speakIt) {
  const s = askState;
  if (!s) return;
  const view = answerView(r.best);
  s.out.replaceChildren(h('p', { class: 'askq' }, t('askYouAsked') + ': ', h('b', { text: s.q })), view.el);
  if (r.related.length) {
    s.out.append(h('div', { class: 'related' }, h('h4', { text: t('askMore') }),
      h('ul', { class: 'ans-list' }, ...r.related.map(it => {
        const b = h('button', { type: 'button' }, h('b', { text: itemLabel(it) }));
        b.addEventListener('click', () => showAnswer({ best: it, related: r.related.filter(x => x !== it) }, mode === 'voice' || s.byVoice));
        return h('li', null, b);
      }))));
  }
  s.out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (speakIt) say(view.speech, view.el.querySelector('.speak'));
}

function itemLabel(it) {
  if (it.kind === 'method') return it.m.icon + ' ' + methodText(it.m).t;
  if (it.kind === 'kheti') { const c = topicText(it.tp); return it.tp.icon + ' ' + (it.i >= 0 ? c.p[it.i][0] + ' (' + c.t + ')' : c.t); }
  if (it.kind === 'food') return (it.foods[0].e || '') + ' ' + it.foods.map(f => foodName(f)).join(', ');
  return '';
}

/* One nutrient as words, for reading aloud: "Vitamin C 4.6 milligrams, 5% daily need" */
function nutSpeech(f, k) {
  const v = f.d[k];
  if (v === null || v === undefined) return t('n')[k] + ': ' + t('notMeasured');
  return t('n')[k] + ' ' + fmtNum(v) + ' ' + unitWord(unitOf(k)) + ', ' + Math.round(v / dvOf(k) * 100) + t('dvShort');
}

function answerView(it) {
  const el = h('div', { class: 'answer' });
  const actions = h('div', { class: 'ans-actions' });
  const src = text => h('p', { class: 'ans-src', text: t('askFrom', { s: text }) });
  const openBtn = fn => { const b = h('button', { type: 'button', class: 'btn ghost', text: t('askOpen') }); b.addEventListener('click', fn); return b; };
  const N = t('n');
  let speech = '';

  if (it.kind === 'food') {
    const foods = it.foods;
    const f0 = foods[0];
    el.append(src(t('askSrcFood')));
    if (it.mode === 'all' && foods.length === 1) {
      el.append(h('h3', null, foodIcon(f0), foodName(f0)));
      const hi = highIn(f0);
      if (hi.length) el.append(h('div', { class: 'tags' }, h('span', { text: t('highIn') + ':' }), ...hi.map(k => h('span', { class: 'tag', text: N[k] }))));
      speech = foodSpeech(f0);
      el.append(nutTable(foods, ALL_NUT_KEYS));
    } else {
      const title = foods.length === 1 && it.mode === 'vit' ? t('askVitIn', { f: foodName(f0) })
        : foods.length === 1 && it.mode === 'min' ? t('askMinIn', { f: foodName(f0) })
        : foods.map(f => foodName(f)).join(', ');
      el.append(h('h3', null, foods.length === 1 ? foodIcon(f0) : null, title));
      el.append(nutTable(foods, it.keys));
      const parts = foods.map(f => foodName(f) + ', ' + t('per100') + ': ' + it.keys.map(k => nutSpeech(f, k)).join('. ') + '.');
      if (foods.length === 1 && (it.mode === 'vit' || it.mode === 'min')) {
        const hi = highIn(f0).filter(k => it.keys.includes(k));
        const line = hi.length ? t('highIn') + ': ' + hi.map(k => N[k]).join(', ') + '.' : t('askNoneHigh');
        el.append(h('p', { text: line }));
        parts.push(line);
      }
      if (foods.length > 1 && it.keys.length === 1) {
        const k = it.keys[0];
        const has = foods.filter(f => f.d[k] !== null && f.d[k] !== undefined);
        if (has.length > 1) {
          const top = has.reduce((a, b) => (b.d[k] > a.d[k] ? b : a));
          const line = t('askMostIs', { f: foodName(top), n: N[k] });
          el.append(h('p', { text: line }));
          parts.push(line);
        }
      }
      speech = parts.join(' ');
    }
    if (it.mode === 'keys' && it.keys.includes('vitD')) el.append(h('p', { class: 'hint', text: t('vitDNote') }));
    el.append(h('p', { class: 'hint', text: t('source') }));
    actions.append(speakBtn(() => speech), openBtn(() => openFood(f0)));
  }

  else if (it.kind === 'finder') {
    const ranked = finderRank(it.key, it.type).slice(0, 8);
    const unit = unitOf(it.key);
    el.append(src(t('foodTitle') + ' – ' + t('subFinder')), h('h3', { text: t('finderTop', { n: N[it.key] }) + (it.type === 'fruit' ? ' (' + t('fruits') + ')' : it.type === 'veg' ? ' (' + t('vegetables') + ')' : '') }));
    if (it.key === 'vitD') el.append(h('p', { class: 'info', text: t('vitDNote') }));
    if (it.key === 'b6' || it.key === 'folate') el.append(h('p', { class: 'info', text: t('bNote') }));
    el.append(h('ol', { class: 'rank' }, ...ranked.map((f, i) => {
      const b = h('button', { type: 'button' }, h('span', { class: 'pos', text: String(i + 1) }), foodIcon(f),
        h('span', { class: 'nm' }, h('b', { text: foodName(f) })), h('span', { class: 'val', text: fmtNum(f.d[it.key]) + ' ' + unit }));
      b.addEventListener('click', () => openFood(f));
      return h('li', null, b);
    })));
    speech = finderSpeech(it.key, it.type);
    actions.append(speakBtn(() => speech), openBtn(() => closeDialogThen(() => {
      finderKey = it.key; finderType = it.type; foodSub = 'finder'; Prefs.set('ks-food-sub', 'finder');
      showTab('food', false); renderFood();
    })));
  }

  else if (it.kind === 'pick') {
    const vit = it.keys.every(k => ['vitA', 'b6', 'folate', 'vitC', 'vitD', 'vitE', 'vitK'].includes(k));
    const title = vit ? t('askPickVit') : t('askPickNut');
    el.append(src(t('foodTitle') + ' – ' + t('subFinder')), h('h3', { text: title }));
    el.append(h('div', { class: 'nchips' }, ...it.keys.map(k => {
      const b = h('button', { type: 'button', class: 'chipbtn', text: N[k] });
      b.addEventListener('click', () => showAnswer({ best: { kind: 'finder', key: k, type: it.type }, related: [] }, mode === 'voice' || askState.byVoice));
      return b;
    })));
    speech = title + ' ' + it.keys.map(k => N[k]).join(', ') + '.';
    actions.append(speakBtn(() => speech));
  }

  else if (it.kind === 'method') {
    const c = methodText(it.m);
    el.append(src(t('khetiMethods') + ': ' + t('mcat')[it.m.cat]), h('h3', null, h('span', { 'aria-hidden': 'true', text: it.m.icon }), c.t),
      h('p', null, h('b', { text: c.s })), h('p', { text: c.how }), h('p', { class: 'hint', text: t('khetiNote') }));
    speech = methodSpeech(it.m);
    actions.append(speakBtn(() => speech), openBtn(() => openMethod(it.m)));
  }

  else if (it.kind === 'kheti') {
    const c = topicText(it.tp);
    el.append(src(t('khetiTitle') + ': ' + c.t));
    if (it.i >= 0) {
      const [title, body] = c.p[it.i];
      el.append(h('h3', { text: title }), h('p', { text: body }));
      speech = title + '. ' + body;
    } else {
      const tbody = h('tbody');
      c.tb.forEach(([k, v]) => tbody.append(h('tr', null, h('td', { text: k }), h('td', { text: v }))));
      el.append(h('h3', { text: c.t }), h('table', { class: 'facts' }, tbody));
      speech = c.t + '. ' + c.tb.map(([k, v]) => k + ': ' + v).join('. ') + '.';
    }
    el.append(h('p', { class: 'hint', text: t('khetiNote') }));
    actions.append(speakBtn(() => speech), openBtn(() => closeDialogThen(() => {
      khetiSub = 'topics'; Prefs.set('ks-kheti-sub', 'topics'); topicId = it.tp.id;
      showTab('kheti', false); renderKheti();
      $('#article').scrollIntoView({ block: 'start' });
    })));
  }

  else if (it.kind === 'list') {
    const role = it.role;
    el.append(src(t(ROLE_TITLE[role])));
    if (it.status === 'ok') {
      const shown = it.items.slice(0, 5);
      const head = t(ROLE_FOUND[role], { n: it.items.length });
      const line = x => role === 'farmer' ? [x.name, placeText(x) + ((x.crops || []).length ? ' – ' + x.crops.slice(0, 5).join(', ') : '')]
        : role === 'shop' ? [x.shopName, placeText(x) + ((x.products || []).length ? ' – ' + x.products.slice(0, 4).map(p => p.name).join(', ') : '')]
        : [(VEHICLE_ICON[x.vehicle] || '🚚') + ' ' + x.name, [(t('vehicles')[x.vehicle] || ''), x.areas, x.available ? t('availableYes') : t('availableNo')].filter(Boolean).join(', ')];
      el.append(h('h3', { text: head }), h('ul', { class: 'ans-list' }, ...shown.map(x => {
        const [a, b2] = line(x);
        const b = h('button', { type: 'button' }, h('b', { text: a }), h('span', { text: b2 }));
        b.addEventListener('click', () => {
          if (role === 'farmer') openFarmer(x);
          else if (role === 'shop') openShop(x);
          else closeDialogThen(() => { showTab('delivery', false); searchInputs.delivery.value = x.name; deliveryQuery = x.name; renderList('delivery'); });
        });
        return h('li', null, b);
      })));
      speech = head + '. ' + shown.map(x => line(x).join(', ')).join('. ') + '.';
    } else {
      const msg = it.status === 'empty' ? t('askListEmpty') : it.status === 'loading' ? t('askListsLoading') : t('askListsOffline');
      el.append(h('p', { text: msg }));
      speech = msg;
    }
    actions.append(speakBtn(() => speech), openBtn(() => closeDialogThen(() => showTab(ROLE_TAB[role], false))));
  }

  else {
    el.classList.add('none');
    el.append(h('p', { text: t('askNoMatch') }));
    const call = h('a', { class: 'btn call', href: 'tel:18001801551', html: ICON.phone });
    call.append(h('span', { text: t('askCallKcc') }));
    speech = t('askNoMatch');
    actions.append(speakBtn(() => speech), call);
  }

  el.append(actions);
  return { el, speech };
}

const ALL_NUT_KEYS = NUTRIENTS.map(n => n.k);
/* Table of the asked nutrients. One food: value + % daily need. Several foods: one column each. */
function nutTable(foods, keys) {
  const N = t('n');
  const cell = (f, k) => {
    const v = f.d[k];
    return v === null || v === undefined ? h('td', { class: 'na', text: '—' }) : h('td', { text: fmtNum(v) + ' ' + unitOf(k) });
  };
  if (foods.length === 1) {
    const f = foods[0], hi = highIn(f);
    const tbody = h('tbody', null, ...keys.map(k => {
      const v = f.d[k];
      return h('tr', { class: hi.includes(k) ? 'hi' : null }, h('td', { text: N[k] }), cell(f, k),
        h('td', { text: v === null || v === undefined ? '' : Math.round(v / dvOf(k) * 100) + '%' }));
    }));
    return h('table', { class: 'ntable' },
      h('thead', null, h('tr', null, h('th', { text: t('nutrientCol') }), h('th', { text: t('per100') }), h('th', { text: t('dvShort') }))), tbody);
  }
  return h('table', { class: 'ntable multi' },
    h('thead', null, h('tr', null, h('th', { text: t('per100') }), ...foods.map(f => h('th', { text: foodName(f) })))),
    h('tbody', null, ...keys.map(k => h('tr', null, h('td', { text: N[k] }), ...foods.map(f => cell(f, k))))));
}

/* ---------------------------------------------------------------------
   Start the app
   --------------------------------------------------------------------- */
function makeSearch(sel, onInput) {
  const input = h('input', { type: 'search', autocomplete: 'off', enterkeyhint: 'search' });
  input.addEventListener('input', () => onInput(input.value));
  $(sel).append(input, micBtn(input));
  return input;
}

function init() {
  searchInputs = {
    food: makeSearch('#sb-food', v => { foodQuery = v; renderFoodLists(); }),
    farmers: makeSearch('#sb-farmers', v => { farmerQuery = v; renderList('farmer'); }),
    delivery: makeSearch('#sb-delivery', v => { deliveryQuery = v; renderList('delivery'); }),
    shop: makeSearch('#sb-shop', v => { shopQuery = v; renderList('shop'); })
  };
  $$('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab, true)));
  $$('[data-ksub]').forEach(b => b.addEventListener('click', () => {
    khetiSub = b.dataset.ksub;
    Prefs.set('ks-kheti-sub', khetiSub);
    renderKheti();
  }));
  $('#ask-open').addEventListener('click', openAsk);
  $$('[data-sub]').forEach(b => b.addEventListener('click', () => {
    foodSub = b.dataset.sub;
    Prefs.set('ks-food-sub', foodSub);
    renderFood();
  }));
  $$('.mode-card').forEach(b => b.addEventListener('click', () => chooseMode(b.dataset.mode)));
  $('#mode-back').addEventListener('click', () => showStart('lang'));
  $('#btn-lang').addEventListener('click', () => showStart('lang'));
  $('#btn-mode').addEventListener('click', toggleMode);
  $('#btn-account').addEventListener('click', openAccount);
  $('#f-method').addEventListener('change', e => { farmerMethod = e.target.value; renderList('farmer'); });
  $('#stop-speak').addEventListener('click', () => Voice.stop());
  Voice.onChange(on => { $('#stop-speak').hidden = !on; });
  $('#offline-banner').hidden = Store.online;

  const fromLink = location.hash.slice(1);
  if (TABS.includes(fromLink)) tab = fromLink;

  applyLang();
  showTab(tab, false);
  if (!lang) showStart('lang');
  else if (!mode) showStart('mode');

  Store.onUser(async u => {
    // Version 1 logged visitors in anonymously. Only Google (Gmail) login counts now.
    if (u && u.isAnonymous) { Store.logout().catch(() => {}); return; }
    user = u; profile = null; profileLoaded = false;
    renderHeader();
    if (u) {
      try { profile = await Store.getProfile(u.uid); } catch (e) { console.warn(e); }
      profileLoaded = true;
      if (dlgView === 'login') {
        if (!profile) openProfile({ then: afterLogin });
        else {
          const next = afterLogin; afterLogin = null;
          closeDialog(); toast(t('loggedIn'));
          if (next) next();
        }
      } else if (!profile && !askedProfile) {
        askedProfile = true;
        openProfile({});
      }
      if (profile && profile.role !== 'consumer') ensureWatch(profile.role);
    } else {
      profileLoaded = true;
      if (dlgView === 'account' || dlgView === 'profile' || (dlgView && dlgView.startsWith('form'))) closeDialog();
    }
    renderHeader();
    ['farmer', 'delivery', 'shop'].forEach(r => { if (lists[r]) renderList(r); });
    renderAddButtons();
  });
}

init();
})();
