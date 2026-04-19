'use strict';
/* ============================================================
   نظام إدارة الطلبات — Vanilla JS + localStorage
   ✔ Real Excel (.xlsx) via SheetJS
   ✔ Web Push Notifications (PWA + Service Worker)
   ✔ Currency Selector (SAR / YER / USD)
   ✔ Auto Order Number
   ✔ Full CRUD, Filters, Sort, Print, Import/Export
   ============================================================ */

/* ── KEYS ── */
const K = {
  ORDERS:    'orders_system_data',
  FILTERS:   'orders_system_filters',
  SORT:      'orders_system_sort',
  VIEW:      'orders_system_view_mode',
  DARK:      'orders_system_dark_mode',
  CURRENCY:  'orders_system_currency',
  HEADER_COLLAPSED: 'orders_system_header_collapsed',
  ORDER_NUM: 'orders_system_counter',
  NOTIF_DISMISSED: 'orders_notif_dismissed',
  FIRED_ALERTS: 'orders_fired_alerts',
};

/* ── CURRENCIES ── */
const CURRENCIES = {
  SAR: { symbol: '\uFDFC', label: 'ريال سعودي', suffix: 'ر.س' },
  YER: { symbol: '\uFDFC', label: 'ريال يمني',  suffix: 'ر.ي' },
  USD: { symbol: '$',       label: 'دولار',       suffix: '$'   },
};
const MONEY_CURRENCIES = ['YER','SAR','USD'];
const MONEY_FIELDS = ['totalAmount','paid','remaining'];
const FX = {
  YER: { YER:1, SAR:1/410, USD:1/1553 },
  SAR: { YER:410, SAR:1, USD:0.27 },
  USD: { YER:1553, SAR:3.80, USD:1 },
};
const FX_TEXT = '1 دولار = 1553 ريال يمني • 1 ريال سعودي = 410 ريال يمني • 1 دولار = 3.80 ريال سعودي';
const FX_BANNER_ITEMS = [
  { from: '1 دولار', rate: '1553', to: 'ريال يمني' },
  { from: '1 ريال سعودي', rate: '410', to: 'ريال يمني' },
  { from: '1 دولار', rate: '3.80', to: 'ريال سعودي' },
];
const STATUS_OPTIONS = ['جديد','قيد التنفيذ','مكتمل','مؤجل','ملغي'];
const STATUS_META = {
  'جديد': {
    pill: 'status-new',
    tone: 'status-tone-new',
    desc: 'طلب جديد بانتظار البدء',
  },
  'قيد التنفيذ': {
    pill: 'status-inprogress',
    tone: 'status-tone-inprogress',
    desc: 'العمل جارٍ على الطلب',
  },
  'مكتمل': {
    pill: 'status-completed',
    tone: 'status-tone-completed',
    desc: 'تم إنجاز الطلب بالكامل',
  },
  'مؤجل': {
    pill: 'status-postponed',
    tone: 'status-tone-postponed',
    desc: 'تم تأجيل التنفيذ مؤقتًا',
  },
  'ملغي': {
    pill: 'status-cancelled',
    tone: 'status-tone-cancelled',
    desc: 'تم إلغاء الطلب',
  },
};
const IMPORT_FIELD_ALIASES = {
  id: ['المعرف','معرف','رقم المعرف','id','identifier'],
  orderNumber: ['رقم الطلب','رقمالطلب','الرقم','order number','ordernumber','order no','order #'],
  clientName: ['اسم العميل','العميل','client name','client','customer','customer name'],
  orderName: ['اسم الطلب','الطلب','اسم المنتج','الخدمة','order name','order','item'],
  clientPhone: ['رقم الهاتف','الهاتف','رقم الجوال','الجوال','phone','mobile','phone number'],
  source: ['المصدر','source','channel'],
  currency: ['عملة الطلب','العملة','currency','order currency'],
  displayCurrency: ['عملة العرض','عرض العملة','display currency'],
  receivedDate: ['تاريخ الاستلام','تاريخ الطلب','received date','received','order date'],
  deliveryDate: ['تاريخ التسليم','موعد التسليم','delivery date','delivery'],
  deliveryTime: ['وقت التسليم','ميعاد التسليم','delivery time','time'],
  status: ['الحالة','status'],
  employee: ['الموظف المسؤول','الموظف','employee','staff','assigned to'],
  totalAmount: ['الإجمالي','اجمالي الطلب','إجمالي الطلب','قيمة الطلب','المبلغ الإجمالي','total','total amount','amount'],
  paid: ['المدفوع','المبلغ المدفوع','paid','paid amount'],
  remaining: ['الباقي','المتبقي','المتبقي عليه','remaining','balance','due'],
  paymentMethod: ['طريقة الدفع','الدفع','payment method','payment'],
  alertNote: ['نص التنبيه','التنبيه','ملاحظة التنبيه','alert note','alert'],
  alertDate: ['تاريخ التنبيه','موعد التنبيه','alert date','reminder date'],
  details: ['تفاصيل الطلب','التفاصيل','details','description'],
  internalNotes: ['ملاحظات داخلية','ملاحظات','notes','internal notes'],
  createdAt: ['تاريخ الإنشاء','تاريخ الانشاء','created at','created'],
  updatedAt: ['آخر تعديل','اخر تعديل','updated at','updated','last update'],
};
const IMPORT_STATUS_ALIASES = {
  'جديد': 'جديد',
  'new': 'جديد',
  'pending': 'جديد',
  'قيدالتنفيذ': 'قيد التنفيذ',
  'قيد التنفيذ': 'قيد التنفيذ',
  'inprogress': 'قيد التنفيذ',
  'processing': 'قيد التنفيذ',
  'working': 'قيد التنفيذ',
  'مكتمل': 'مكتمل',
  'مكتملة': 'مكتمل',
  'completed': 'مكتمل',
  'done': 'مكتمل',
  'finished': 'مكتمل',
  'مؤجل': 'مؤجل',
  'مؤجلة': 'مؤجل',
  'postponed': 'مؤجل',
  'delayed': 'مؤجل',
  'onhold': 'مؤجل',
  'ملغي': 'ملغي',
  'ملغى': 'ملغي',
  'cancelled': 'ملغي',
  'canceled': 'ملغي',
  'cancel': 'ملغي',
};
const IMPORT_PAYMENT_ALIASES = {
  'نقدي': 'نقدي',
  'cash': 'نقدي',
  'كاش': 'نقدي',
  'تحويل': 'تحويل',
  'حوالة': 'تحويل',
  'banktransfer': 'تحويل',
  'transfer': 'تحويل',
  'آجل': 'آجل',
  'اجل': 'آجل',
  'credit': 'آجل',
  'later': 'آجل',
  'أخرى': 'أخرى',
  'اخرى': 'أخرى',
  'other': 'أخرى',
};
const IMPORT_CURRENCY_ALIASES = {
  'yer': 'YER',
  'yemeni': 'YER',
  'yemeniriyal': 'YER',
  'رياليمني': 'YER',
  'اليمني': 'YER',
  'sar': 'SAR',
  'saudi': 'SAR',
  'saudiriyal': 'SAR',
  'ريالسعودي': 'SAR',
  'السعودي': 'SAR',
  'usd': 'USD',
  'دولار': 'USD',
  'دولارامريكي': 'USD',
  'امريكي': 'USD',
  'us dollar': 'USD',
};

/* ── STATE ── */
let S = {
  orders:       [],
  filters: {
    search:'', status:'', employee:'', paymentMethod:'',
    source:'', dateFrom:'', dateTo:'', datePreset:'', delayedOnly:false,
  },
  sort:         { field:'createdAt', direction:'desc' },
  viewMode:     'cards',
  darkMode:     false,
  currency:     'SAR',
  headerCollapsed: false,
  orderCounter: 0,
  selectedIds:  new Set(),
  editingId:    null,
  viewingId:    null,
  pendingImport:null,
  recentId:     null,
  recentTimer:  null,
  swReg:        null,
  statusMenu:   { orderId:null, trigger:null },
};

/* ── ID ── */
function genId() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
}

/* ── ORDER NUMBER ── */
function getNextOrderNum() {
  S.orderCounter++;
  localStorage.setItem(K.ORDER_NUM, String(S.orderCounter));
  return S.orderCounter;
}
function syncOrderNumbers() {
  const withoutNum = S.orders.filter(o => !o.orderNumber);
  if (!withoutNum.length) {
    const maxN = Math.max(0, ...S.orders.map(o => o.orderNumber || 0));
    if (maxN > S.orderCounter) { S.orderCounter = maxN; localStorage.setItem(K.ORDER_NUM, String(maxN)); }
    return;
  }
  withoutNum.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
  const maxExist = Math.max(0, ...S.orders.filter(o=>o.orderNumber).map(o=>o.orderNumber||0));
  let c = maxExist;
  withoutNum.forEach(o => { o.orderNumber = ++c; });
  S.orderCounter = Math.max(S.orderCounter, c);
  localStorage.setItem(K.ORDER_NUM, String(S.orderCounter));
  saveOrders(S.orders);
}

/* ════════════════════════════════════════
   STORAGE
════════════════════════════════════════ */
function loadOrders() {
  try { const d=JSON.parse(localStorage.getItem(K.ORDERS)||'[]'); return Array.isArray(d)?d:[]; }
  catch { return []; }
}
function saveOrders(o) {
  try { localStorage.setItem(K.ORDERS, JSON.stringify(o)); } catch(e){ console.error(e); }
}
function loadPrefs() {
  try { Object.assign(S.filters, JSON.parse(localStorage.getItem(K.FILTERS)||'{}')); } catch{}
  try { const s=JSON.parse(localStorage.getItem(K.SORT)||'{}'); if(s.field) Object.assign(S.sort,s); } catch{}
  const v=localStorage.getItem(K.VIEW); if(v==='table'||v==='cards') S.viewMode=v;
  S.darkMode = localStorage.getItem(K.DARK)==='true';
  const cur=localStorage.getItem(K.CURRENCY); if(CURRENCIES[cur]) S.currency=cur;
  S.headerCollapsed = localStorage.getItem(K.HEADER_COLLAPSED)==='true';
  S.orderCounter = parseInt(localStorage.getItem(K.ORDER_NUM)||'0')||0;
}
function savePrefs() {
  try { localStorage.setItem(K.FILTERS, JSON.stringify(S.filters)); } catch{}
  try { localStorage.setItem(K.SORT, JSON.stringify(S.sort)); } catch{}
  try { localStorage.setItem(K.VIEW, S.viewMode); } catch{}
}

/* ════════════════════════════════════════
   SERVICE WORKER + NOTIFICATIONS
════════════════════════════════════════ */
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    S.swReg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('[SW] registered');
  } catch(e) { console.warn('[SW] failed:', e); }
}

function getNotifPermission() { return ('Notification' in window) ? Notification.permission : 'unsupported'; }

function showNotifBanner() {
  const perm = getNotifPermission();
  const dismissed = localStorage.getItem(K.NOTIF_DISMISSED);
  if (perm === 'granted' || perm === 'denied' || dismissed === 'true') return;
  const banner = document.getElementById('notif-banner');
  if (banner) banner.classList.remove('hidden');
}

async function requestNotifPermission() {
  if (!('Notification' in window)) {
    showToast('المتصفح لا يدعم الإشعارات', 'error');
    return false;
  }
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    showToast('تم تفعيل الإشعارات بنجاح', 'success');
    document.getElementById('notif-banner')?.classList.add('hidden');
    scheduleAllAlerts();
    return true;
  } else {
    showToast('تم رفض صلاحية الإشعارات', 'warning');
    return false;
  }
}

function sendNotification(title, body, tag='alert') {
  if (getNotifPermission() !== 'granted') return;
  if (S.swReg) {
    S.swReg.active?.postMessage({ type:'SHOW_NOTIFICATION', title, body, tag });
  } else {
    try { new Notification(title, { body, tag, icon:'./icon-192.png', dir:'rtl', lang:'ar' }); } catch{}
  }
}

/* Schedule alerts that haven't fired yet */
function scheduleAllAlerts() {
  if (getNotifPermission() !== 'granted') return;
  const fired = getFiredAlerts();
  const now   = Date.now();

  S.orders.forEach(order => {
    if (!order.alertDate || !order.alertNote) return;
    if (order.status === 'مكتمل' || order.status === 'ملغي') return;
    const tag = `alert-${order.id}`;
    if (fired.has(tag)) return;
    const dueAt = new Date(order.alertDate).getTime();
    if (isNaN(dueAt)) return;
    const delay = dueAt - now;
    if (delay < 0 && dueAt > now - 3600000) {
      // Due within last hour — fire now
      markAlertFired(tag);
      sendNotification(`⏰ تنبيه: ${order.orderName}`, `${order.clientName}: ${order.alertNote}`, tag);
    } else if (delay > 0 && delay < 7 * 24 * 60 * 60000) {
      // Due within next 7 days — schedule
      setTimeout(() => {
        if (!getFiredAlerts().has(tag)) {
          markAlertFired(tag);
          sendNotification(`⏰ تنبيه: ${order.orderName}`, `${order.clientName}: ${order.alertNote}`, tag);
        }
      }, delay);
    }
  });
}

function getFiredAlerts() {
  try { return new Set(JSON.parse(localStorage.getItem(K.FIRED_ALERTS)||'[]')); } catch{ return new Set(); }
}
function markAlertFired(tag) {
  const fired = getFiredAlerts(); fired.add(tag);
  localStorage.setItem(K.FIRED_ALERTS, JSON.stringify([...fired]));
}

/* Periodic check every minute */
function startAlertPoller() {
  setInterval(() => {
    if (getNotifPermission() === 'granted') scheduleAllAlerts();
  }, 60000);
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function esc(s) {
  if (s===null||s===undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function num(v) { return Number(v)||0; }
function normalizeArabicDigits(v) {
  return String(v ?? '')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',');
}
function normalizeLookup(v) {
  return normalizeArabicDigits(v)
    .toLowerCase()
    .replace(/[\u200e\u200f]/g, '')
    .replace(/[(){}\[\]#_*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseMoneyValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw = normalizeArabicDigits(value)
    .replace(/[^\d,.\-]/g, '')
    .trim();
  if (!raw) return 0;
  const commaCount = (raw.match(/,/g) || []).length;
  if (raw.includes('.') && raw.includes(',')) raw = raw.replace(/,/g, '');
  else if (!raw.includes('.') && commaCount === 1) raw = raw.replace(',', '.');
  else raw = raw.replace(/,/g, '');
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
function parseOrderNumberValue(value) {
  const raw = normalizeArabicDigits(value).replace(/[^\d]/g, '');
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function parseExcelDateSerial(value) {
  if (typeof value !== 'number' || typeof XLSX === 'undefined' || !XLSX.SSF?.parse_date_code) return null;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)));
}
function parseImportDate(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  const fromSerial = parseExcelDateSerial(value);
  if (fromSerial && !isNaN(fromSerial)) return fromSerial.toISOString().slice(0, 10);
  const raw = normalizeArabicDigits(value).trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})$/);
  if (m) {
    let y, mo, d;
    if (m[1].length === 4) { y = m[1]; mo = m[2]; d = m[3]; }
    else { d = m[1]; mo = m[2]; y = m[3]; }
    const iso = `${y.padStart(4, '20').slice(-4)}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const dt = new Date(`${iso}T00:00:00`);
    if (!isNaN(dt)) return iso;
  }
  const dt = new Date(raw);
  return isNaN(dt) ? raw : dt.toISOString().slice(0, 10);
}
function parseImportDateTime(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !isNaN(value)) return value.toISOString();
  const fromSerial = parseExcelDateSerial(value);
  if (fromSerial && !isNaN(fromSerial)) return fromSerial.toISOString();
  const raw = normalizeArabicDigits(value).trim();
  if (!raw) return '';
  const dt = new Date(raw);
  if (!isNaN(dt)) return dt.toISOString();
  const plainDate = parseImportDate(raw);
  return plainDate ? `${plainDate}T00:00:00.000Z` : '';
}
function parseImportTime(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(11, 16);
  }
  const fromSerial = parseExcelDateSerial(value);
  if (fromSerial && !isNaN(fromSerial)) return fromSerial.toISOString().slice(11, 16);
  const raw = normalizeArabicDigits(value).trim();
  const m = raw.match(/(\d{1,2})[:.](\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return raw;
}
function mapAliasedValue(value, aliases, fallback='') {
  const key = normalizeLookup(value).replace(/\s+/g, '');
  return aliases[key] || fallback;
}
function canonicalStatus(value) { return mapAliasedValue(value, IMPORT_STATUS_ALIASES, 'جديد'); }
function canonicalPaymentMethod(value) { return mapAliasedValue(value, IMPORT_PAYMENT_ALIASES, 'نقدي'); }
function canonicalCurrency(value) {
  if (MONEY_CURRENCIES.includes(value)) return value;
  return mapAliasedValue(value, IMPORT_CURRENCY_ALIASES, 'YER');
}
function findCanonicalImportField(header) {
  const key = normalizeLookup(header).replace(/\s+/g, '');
  return Object.entries(IMPORT_FIELD_ALIASES).find(([, aliases]) => aliases.some(alias => normalizeLookup(alias).replace(/\s+/g, '') === key))?.[0] || '';
}
function buildImportFingerprint(order) {
  const parts = [
    order.orderNumber ? `n:${order.orderNumber}` : '',
    normalizeLookup(order.clientName).replace(/\s+/g, ''),
    normalizeLookup(order.orderName).replace(/\s+/g, ''),
    normalizeLookup(order.clientPhone).replace(/\s+/g, ''),
    normalizeLookup(order.deliveryDate).replace(/\s+/g, ''),
  ].filter(Boolean);
  return parts.join('|');
}

function getCur() { return CURRENCIES[S.currency] || CURRENCIES.SAR; }
function getCurrencyMeta(currency) { return CURRENCIES[currency] || CURRENCIES.YER; }
function roundMoney(amount, currency) {
  const n = num(amount);
  return currency === 'YER' ? Math.round(n) : Math.round(n * 100) / 100;
}
function convertAmount(amount, fromCurrency='YER', toCurrency=S.currency) {
  const from = MONEY_CURRENCIES.includes(fromCurrency) ? fromCurrency : 'YER';
  const to = MONEY_CURRENCIES.includes(toCurrency) ? toCurrency : 'YER';
  if (from === to) return roundMoney(amount, to);
  return roundMoney(num(amount) * (FX[from]?.[to] || 1), to);
}
function buildMoneyMap(amount, fromCurrency='YER') {
  return MONEY_CURRENCIES.reduce((acc, currency) => {
    acc[currency] = convertAmount(amount, fromCurrency, currency);
    return acc;
  }, {});
}
function getOrderCurrency(order) {
  return MONEY_CURRENCIES.includes(order?.currency) ? order.currency : 'YER';
}
function normalizeOrderMoney(order) {
  const normalized = { ...order };
  const currency = getOrderCurrency(normalized);
  normalized.currency = currency;
  normalized.convertedAmounts = normalized.convertedAmounts && typeof normalized.convertedAmounts === 'object'
    ? { ...normalized.convertedAmounts }
    : {};
  MONEY_FIELDS.forEach(field => {
    const rawValue = roundMoney(normalized[field], currency);
    normalized[field] = rawValue;
    const existingMap = normalized.convertedAmounts[field];
    if (existingMap && MONEY_CURRENCIES.every(code => Number.isFinite(num(existingMap[code])))) {
      normalized.convertedAmounts[field] = {
        YER: roundMoney(existingMap.YER, 'YER'),
        SAR: roundMoney(existingMap.SAR, 'SAR'),
        USD: roundMoney(existingMap.USD, 'USD'),
      };
    } else {
      normalized.convertedAmounts[field] = buildMoneyMap(rawValue, currency);
    }
  });
  return normalized;
}
function migrateOrdersCurrencyData() {
  let changed = false;
  S.orders = S.orders.map(order => {
    const normalized = normalizeOrderMoney(order);
    if (JSON.stringify(normalized) !== JSON.stringify(order)) changed = true;
    return normalized;
  });
  if (changed) saveOrders(S.orders);
}
function getOrderAmount(order, field, currency=S.currency) {
  const safeCurrency = MONEY_CURRENCIES.includes(currency) ? currency : S.currency;
  const moneyMap = order?.convertedAmounts?.[field];
  if (moneyMap && moneyMap[safeCurrency] !== undefined) return num(moneyMap[safeCurrency]);
  return convertAmount(order?.[field], getOrderCurrency(order), safeCurrency);
}
function formatCurrency(amount, currency=S.currency) {
  if (amount===null||amount===undefined||isNaN(amount)) return '—';
  const cur=getCurrencyMeta(currency), n=roundMoney(amount, currency);
  if(currency==='USD') return `${cur.symbol}${n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  if(currency==='SAR') return `${n.toLocaleString('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:2})} ${cur.symbol}`;
  return `${n.toLocaleString('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:0})} ${cur.symbol}`;
}
function formatMoneyInputValue(amount, currency) {
  const n = roundMoney(amount, currency);
  return currency === 'YER' ? String(Math.round(n)) : String(n);
}
function getRateTextForForm(currency) {
  return {
    YER: 'الإدخال بالريال اليمني. يتم احتساب ما يعادله بالدولار والريال السعودي مباشرة.',
    SAR: 'الإدخال بالريال السعودي. يتم التحويل فوراً إلى الريال اليمني والدولار.',
    USD: 'الإدخال بالدولار. يتم التحويل فوراً إلى الريال اليمني والريال السعودي.',
  }[currency] || FX_TEXT;
}
function updateCurrencyUI() {
  const sel=document.getElementById('currency-select');
  if(sel) sel.value=S.currency;
  const bannerText = document.getElementById('exchange-banner-text');
  if (bannerText) {
    bannerText.innerHTML = FX_BANNER_ITEMS.map(item => `
      <div class="exchange-rate-item">
        <span class="exchange-rate-side">${esc(item.from)}</span>
        <span class="exchange-rate-eq">=</span>
        <span class="exchange-rate-side">
          <span class="exchange-rate-num">${esc(item.rate)}</span>
          <span class="exchange-rate-to">${esc(item.to)}</span>
        </span>
      </div>
    `).join('');
  }
  localStorage.setItem(K.CURRENCY,S.currency);
}
function formatDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}); }
  catch { return s; }
}
function formatDateTime(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return s; }
}
function formatOrderNumber(n) {
  return n ? `#${String(n).padStart(4,'0')}` : '—';
}
function today() { return new Date().toISOString().slice(0,10); }

function isDelayed(order) {
  if (!order.deliveryDate) return false;
  if (order.status==='مكتمل'||order.status==='ملغي') return false;
  const d=new Date(order.deliveryDate); d.setHours(23,59,59,999);
  return d < new Date();
}

function getStatusMeta(status) {
  return STATUS_META[status] || { pill:'', tone:'', desc:'' };
}
function statusClass(s) {
  return getStatusMeta(s).pill;
}
function stripClass(order) {
  if (isDelayed(order)) return 'strip-delayed';
  return {'جديد':'strip-new','قيد التنفيذ':'strip-inprogress','مكتمل':'strip-completed',
          'مؤجل':'strip-postponed','ملغي':'strip-cancelled'}[order.status]||'strip-default';
}
function statusTriggerHTML(order) {
  const meta = getStatusMeta(order.status);
  return `<button type="button" class="status-badge-btn ${meta.pill}" data-id="${esc(order.id)}" aria-haspopup="menu" aria-expanded="false">
    <span class="status-badge-content">
      <span class="status-badge-dot ${meta.tone}"></span>
      <span class="status-badge-label">${esc(order.status)}</span>
    </span>
    <span class="status-badge-caret">${svgIcon('dn',10)}</span>
  </button>`;
}
function buildStatusMenu(orderId, currentStatus) {
  return `
    <div class="status-menu-head">
      <span class="status-menu-kicker">تغيير الحالة</span>
      <span class="status-menu-current">${esc(currentStatus)}</span>
    </div>
    <div class="status-menu-list">
      ${STATUS_OPTIONS.map(status=>{
        const meta = getStatusMeta(status);
        return `<button type="button" class="status-menu-item${currentStatus===status?' active':''}" data-status="${esc(status)}" data-id="${esc(orderId)}">
          <span class="status-option-main">
            <span class="status-option-dot ${meta.tone}"></span>
            <span class="status-option-copy">
              <span class="status-option-title">${esc(status)}</span>
              <span class="status-option-desc">${esc(meta.desc)}</span>
            </span>
          </span>
          <span class="status-option-check">${currentStatus===status ? svgIcon('chk',14) : ''}</span>
        </button>`;
      }).join('')}
    </div>`;
}
function getStatusMenuEl() {
  return document.getElementById('floating-status-menu');
}
function closeStatusMenu() {
  const menu = getStatusMenuEl();
  if (menu) {
    menu.classList.add('hidden');
    menu.classList.remove('status-menu-up');
    menu.innerHTML = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.minWidth = '';
  }
  S.statusMenu.trigger?.classList.remove('menu-open');
  S.statusMenu.trigger?.setAttribute('aria-expanded','false');
  S.statusMenu.trigger?.closest('.status-dropdown')?.classList.remove('status-open');
  S.statusMenu.orderId = null;
  S.statusMenu.trigger = null;
}
function positionStatusMenu() {
  const menu = getStatusMenuEl();
  const trigger = S.statusMenu.trigger;
  if (!menu || menu.classList.contains('hidden') || !trigger || !document.body.contains(trigger)) {
    closeStatusMenu();
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const minWidth = Math.max(220, Math.round(rect.width + 36));
  menu.style.minWidth = `${minWidth}px`;
  const menuWidth = menu.offsetWidth || minWidth;
  const menuHeight = menu.offsetHeight || 0;
  let left = rect.right - menuWidth;
  left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
  let top = rect.bottom + 8;
  menu.classList.remove('status-menu-up');
  if (top + menuHeight > window.innerHeight - 8 && rect.top - menuHeight - 8 >= 8) {
    top = rect.top - menuHeight - 8;
    menu.classList.add('status-menu-up');
  } else if (top + menuHeight > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - menuHeight - 8);
  }
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
function openStatusMenu(trigger, orderId, currentStatus) {
  const menu = getStatusMenuEl();
  if (!menu) return;
  const isSameMenu = !menu.classList.contains('hidden') &&
    S.statusMenu.orderId === orderId &&
    S.statusMenu.trigger === trigger;
  if (isSameMenu) {
    closeStatusMenu();
    return;
  }
  closeStatusMenu();
  S.statusMenu.orderId = orderId;
  S.statusMenu.trigger = trigger;
  trigger.classList.add('menu-open');
  trigger.setAttribute('aria-expanded','true');
  trigger.closest('.status-dropdown')?.classList.add('status-open');
  menu.innerHTML = buildStatusMenu(orderId, currentStatus);
  menu.classList.remove('hidden');
  positionStatusMenu();
}

function svgIcon(name, size=14) {
  const i={
    eye:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    phone:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    copy:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    print:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
    trash:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>`,
    alert:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    clock:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    dn:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`,
    up:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>`,
    chk:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    sq:`<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  };
  return i[name]||'';
}

/* ════════════════════════════════════════
   COMPUTE STATS
════════════════════════════════════════ */
function computeStats(orders) {
  return {
    total:      orders.length,
    newO:       orders.filter(o=>o.status==='جديد').length,
    inProg:     orders.filter(o=>o.status==='قيد التنفيذ').length,
    done:       orders.filter(o=>o.status==='مكتمل').length,
    postponed:  orders.filter(o=>o.status==='مؤجل').length,
    cancelled:  orders.filter(o=>o.status==='ملغي').length,
    delayed:    orders.filter(o=>isDelayed(o)).length,
    totalPaid:  orders.reduce((s,o)=>s+getOrderAmount(o,'paid'),0),
    totalRem:   orders.reduce((s,o)=>s+getOrderAmount(o,'remaining'),0),
    alerts:     orders.filter(o=>{
      if (o.status==='مكتمل'||o.status==='ملغي') return false;
      if (!o.alertNote) return false;
      if (!o.alertDate) return true;
      const dt=new Date(o.alertDate);
      const limit=new Date(); limit.setDate(limit.getDate()+3);
      return dt<=limit;
    }).length,
  };
}

/* ════════════════════════════════════════
   FILTER + SORT
════════════════════════════════════════ */
function filterOrders(orders) {
  const f=S.filters, search=(f.search||'').toLowerCase().trim();
  const tod=new Date(); tod.setHours(0,0,0,0);
  return orders.filter(o=>{
    if(search){
      const hay=[o.clientName,o.orderName,o.clientPhone,o.source,o.employee,o.details,o.id].join(' ').toLowerCase();
      if(!hay.includes(search)) return false;
    }
    if(f.status && o.status!==f.status) return false;
    if(f.employee && !(o.employee||'').toLowerCase().includes(f.employee.toLowerCase())) return false;
    if(f.paymentMethod && o.paymentMethod!==f.paymentMethod) return false;
    if(f.source && !(o.source||'').toLowerCase().includes(f.source.toLowerCase())) return false;
    if(f.delayedOnly && !isDelayed(o)) return false;
    if(f.datePreset){
      const od=new Date(o.receivedDate||o.createdAt); od.setHours(0,0,0,0);
      if(f.datePreset==='today' && od.getTime()!==tod.getTime()) return false;
      if(f.datePreset==='week'){const w=new Date(tod);w.setDate(tod.getDate()-7);if(od<w) return false;}
      if(f.datePreset==='month'){const m=new Date(tod);m.setMonth(tod.getMonth()-1);if(od<m) return false;}
    }
    if(f.dateFrom && new Date(o.receivedDate||o.createdAt)<new Date(f.dateFrom)) return false;
    if(f.dateTo){const to=new Date(f.dateTo);to.setHours(23,59,59,999);if(new Date(o.receivedDate||o.createdAt)>to) return false;}
    return true;
  });
}
function sortOrders(orders) {
  const {field,direction}=S.sort;
  const nums=['paid','remaining','totalAmount'];
  const dates=['createdAt','updatedAt','deliveryDate','receivedDate'];
  return [...orders].sort((a,b)=>{
    let av=a[field],bv=b[field];
    if(nums.includes(field)){av=getOrderAmount(a,field);bv=getOrderAmount(b,field);}
    if(dates.includes(field)){av=av?new Date(av).getTime():0;bv=bv?new Date(bv).getTime():0;}
    if(av<bv) return direction==='asc'?-1:1;
    if(av>bv) return direction==='asc'?1:-1;
    return 0;
  });
}
function getDisplayOrders() { return sortOrders(filterOrders(S.orders)); }
function uniqueValues(key) { return [...new Set(S.orders.map(o=>o[key]).filter(Boolean))].sort(); }

/* ════════════════════════════════════════
   EXCEL EXPORT (SheetJS)
════════════════════════════════════════ */
function exportToExcel(orders) {
  if (typeof XLSX === 'undefined') {
    showToast('مكتبة Excel غير محملة، تحقق من الاتصال', 'error');
    return;
  }
  const headers = [
    'المعرف','رقم الطلب','اسم العميل','اسم الطلب','رقم الهاتف','المصدر','عملة الطلب','عملة العرض',
    'تاريخ الاستلام','تاريخ التسليم','وقت التسليم','الحالة',
    'الموظف المسؤول','الإجمالي','المدفوع','الباقي','طريقة الدفع',
    'نص التنبيه','تاريخ التنبيه','تفاصيل الطلب','ملاحظات داخلية',
    'تاريخ الإنشاء','آخر تعديل'
  ];
  const rows = orders.map(o=>[
    o.id, o.orderNumber?`#${o.orderNumber}`:'—', o.clientName, o.orderName, o.clientPhone, o.source, getCurrencyMeta(getOrderCurrency(o)).label, getCurrencyMeta(S.currency).label,
    o.receivedDate, o.deliveryDate, o.deliveryTime, o.status,
    o.employee, getOrderAmount(o,'totalAmount'), getOrderAmount(o,'paid'), getOrderAmount(o,'remaining'), o.paymentMethod,
    o.alertNote, o.alertDate, o.details, o.internalNotes,
    o.createdAt, o.updatedAt
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws['!cols'] = [
    {wch:20},{wch:10},{wch:18},{wch:20},{wch:16},{wch:14},{wch:14},{wch:14},
    {wch:14},{wch:14},{wch:10},{wch:12},
    {wch:14},{wch:12},{wch:12},{wch:12},{wch:12},
    {wch:24},{wch:18},{wch:30},{wch:24},{wch:18},{wch:18}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');

  // Add stats sheet
  const statsData = computeStats(orders);
  const statsRows = [
    ['الإحصائيات','القيمة'],
    ['إجمالي الطلبات',statsData.total],
    ['طلبات جديدة',statsData.newO],
    ['قيد التنفيذ',statsData.inProg],
    ['مكتملة',statsData.done],
    ['مؤجلة',statsData.postponed],
    ['ملغية',statsData.cancelled],
    ['متأخرة',statsData.delayed],
    ['إجمالي المدفوع',statsData.totalPaid],
    ['إجمالي الباقي',statsData.totalRem],
  ];
  const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
  wsStats['!cols'] = [{wch:20},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsStats, 'الإحصائيات');

  XLSX.writeFile(wb, `orders-${today()}.xlsx`);
}

/* JSON Backup */
function exportToJson(orders) {
  const b=new Blob([JSON.stringify(orders,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download=`orders-backup-${today()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ════════════════════════════════════════
   IMPORT VALIDATION
════════════════════════════════════════ */
function validateImport(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : null;
  if (!Array.isArray(list)) return {valid:false,orders:[],errors:['الملف لا يحتوي على طلبات صالحة']};
  const errors=[], validOrders=[];
  list.forEach((item,i)=>{
    if(typeof item!=='object'||!item){errors.push(`الصف ${i+1}: ليس كائناً`);return;}
    const currency = canonicalCurrency(item.currency || item.displayCurrency);
    const amountCurrency = canonicalCurrency(item.displayCurrency || item.currency);
    const totalAmount = roundMoney(convertAmount(parseMoneyValue(item.totalAmount), amountCurrency, currency), currency);
    const paid = roundMoney(convertAmount(parseMoneyValue(item.paid), amountCurrency, currency), currency);
    const hasRemaining = item.remaining !== undefined && item.remaining !== null && String(item.remaining).trim() !== '';
    const remaining = roundMoney(
      hasRemaining
        ? convertAmount(parseMoneyValue(item.remaining), amountCurrency, currency)
        : Math.max(totalAmount - paid, 0),
      currency
    );
    const createdAt = parseImportDateTime(item.createdAt) || new Date().toISOString();
    const updatedAt = parseImportDateTime(item.updatedAt) || createdAt;
    if(!item.clientName||!item.orderName){errors.push(`الصف ${i+1}: يجب توفر اسم العميل واسم الطلب`);return;}
    validOrders.push({
      id:          item.id||genId(),
      orderNumber: parseOrderNumberValue(item.orderNumber),
      clientName:  String(item.clientName||''),
      orderName:   String(item.orderName||''),
      clientPhone: String(item.clientPhone||''),
      source:      String(item.source||''),
      receivedDate:parseImportDate(item.receivedDate)||today(),
      details:     String(item.details||''),
      deliveryDate:parseImportDate(item.deliveryDate)||'',
      deliveryTime:parseImportTime(item.deliveryTime)||'',
      status:      canonicalStatus(item.status),
      employee:    String(item.employee||''),
      currency,
      paid,
      remaining,
      totalAmount,
      convertedAmounts:item.convertedAmounts&&typeof item.convertedAmounts==='object'?item.convertedAmounts:null,
      paymentMethod:canonicalPaymentMethod(item.paymentMethod),
      alertNote:   String(item.alertNote||''),
      alertDate:   parseImportDate(item.alertDate)||'',
      internalNotes:String(item.internalNotes||''),
      createdAt,
      updatedAt,
    });
  });
  return {valid:validOrders.length>0,orders:validOrders.map(normalizeOrderMoney),errors};
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
let toastN=0;
function showToast(msg,type='success'){
  const c=document.getElementById('toast-container');
  const id=`t${++toastN}`;
  const ico={success:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',error:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',info:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',warning:'<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;el.id=id;
  el.innerHTML=(ico[type]||'')+`<span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(()=>{el.classList.add('exit');setTimeout(()=>el.remove(),300);},3500);
}

/* ════════════════════════════════════════
   RENDER STATS
════════════════════════════════════════ */
function renderStats() {
  const st=computeStats(S.orders);
  const grid=document.getElementById('stats-grid');

  // alerts indicator
  const ai=document.getElementById('alerts-indicator');
  const ac=document.getElementById('alerts-count');
  if(st.alerts>0){ai.classList.remove('hidden');ac.textContent=st.alerts;}
  else ai.classList.add('hidden');

  const CARDS=[
    {label:'إجمالي الطلبات',  value:st.total,                   cls:'stat-blue',    filter:()=>setStatus('')},
    {label:'جديدة',            value:st.newO,                    cls:'stat-cyan',    filter:()=>setStatus('جديد')},
    {label:'قيد التنفيذ',      value:st.inProg,                  cls:'stat-amber',   filter:()=>setStatus('قيد التنفيذ')},
    {label:'مكتملة',           value:st.done,                    cls:'stat-emerald', filter:()=>setStatus('مكتمل')},
    {label:'مؤجلة',            value:st.postponed,               cls:'stat-violet',  filter:()=>setStatus('مؤجل')},
    {label:'ملغية',            value:st.cancelled,               cls:'stat-rose',    filter:()=>setStatus('ملغي')},
    {label:'متأخرة',           value:st.delayed,                 cls:'stat-orange',  filter:()=>{S.filters.delayedOnly=true;S.filters.status='';syncFiltersUI();render();}},
    {label:'إجمالي المدفوع',  value:formatCurrency(st.totalPaid), cls:'stat-teal',  filter:null},
    {label:'إجمالي الباقي',   value:formatCurrency(st.totalRem),  cls:'stat-slate', filter:null},
    {label:'التنبيهات',        value:st.alerts,                  cls:'stat-indigo',  filter:null},
  ];
  const ICONS=[
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  ];

  grid.innerHTML = CARDS.map((c,i)=>`
    <button class="stat-card ${c.cls}${!c.filter?' no-action':''}" data-si="${i}">
      <div class="stat-icon">${ICONS[i]}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </button>`).join('');

  grid.querySelectorAll('.stat-card').forEach((btn,i)=>{
    if(CARDS[i].filter) btn.addEventListener('click',()=>{CARDS[i].filter();});
  });
}

function setStatus(s) {
  S.filters.status=s; S.filters.delayedOnly=false;
  syncFiltersUI(); render();
}

/* ════════════════════════════════════════
   SYNC FILTER UI
════════════════════════════════════════ */
function syncFiltersUI() {
  // Status chips
  document.querySelectorAll('.status-chip').forEach(chip=>{
    const ds=chip.dataset.status;
    if(chip.id==='btn-delayed-chip'){
      chip.classList.toggle('active',S.filters.delayedOnly);
    } else {
      chip.classList.toggle('active', ds===S.filters.status && !S.filters.delayedOnly);
    }
  });

  // Advanced filters
  const sel=v=>document.getElementById(v);
  if(sel('filter-employee'))      sel('filter-employee').value     = S.filters.employee||'';
  if(sel('filter-payment'))       sel('filter-payment').value      = S.filters.paymentMethod||'';
  if(sel('filter-source'))        sel('filter-source').value       = S.filters.source||'';
  if(sel('filter-date-preset'))   sel('filter-date-preset').value  = S.filters.datePreset||'';
  if(sel('filter-date-from'))     sel('filter-date-from').value    = S.filters.dateFrom||'';
  if(sel('filter-date-to'))       sel('filter-date-to').value      = S.filters.dateTo||'';
  if(sel('search-input'))         sel('search-input').value        = S.filters.search||'';

  document.getElementById('btn-clear-search')?.classList.toggle('hidden',!S.filters.search);

  const hasAdv = S.filters.employee||S.filters.paymentMethod||S.filters.source||
                 S.filters.dateFrom||S.filters.dateTo||S.filters.datePreset||S.filters.delayedOnly;
  document.getElementById('btn-clear-filters')?.classList.toggle('hidden',!hasAdv);
  document.getElementById('adv-filter-badge')?.classList.toggle('hidden',!hasAdv);

  // Sort
  const sf=document.getElementById('sort-field');
  const sd=document.getElementById('btn-sort-dir');
  if(sf) sf.value=S.sort.field||'createdAt';
  if(sd) sd.textContent=S.sort.direction==='asc'?'↑':'↓';

  // Rebuild dynamic selects
  rebuildSelect('filter-employee', uniqueValues('employee'), 'الكل', S.filters.employee);
  rebuildSelect('filter-source',   uniqueValues('source'),   'الكل', S.filters.source);

  // Order count
  const displayed=getDisplayOrders();
  const cnt=document.getElementById('order-count');
  if(cnt) cnt.textContent=`${displayed.length} / ${S.orders.length} طلب`;
  document.getElementById('print-count').textContent=`عدد الطلبات: ${displayed.length}`;
  document.getElementById('print-date').textContent=`طُبع: ${new Date().toLocaleDateString('ar-SA')}`;
}

function rebuildSelect(id, items, all, cur) {
  const el=document.getElementById(id);
  if(!el) return;
  el.innerHTML=`<option value="">${all}</option>`+
    items.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}

function clearFilters() {
  Object.assign(S.filters,{status:'',employee:'',paymentMethod:'',source:'',dateFrom:'',dateTo:'',datePreset:'',delayedOnly:false});
}

/* ════════════════════════════════════════
   RENDER CONTENT
════════════════════════════════════════ */
function render() {
  closeStatusMenu();
  renderStats();
  syncFiltersUI();
  renderContent();
  renderBulkBar();
  renderViewBtns();
  renderPrintTable();
  if (S.viewingId && !document.getElementById('modal-detail').classList.contains('hidden')) {
    const activeOrder = S.orders.find(o=>o.id===S.viewingId);
    if (activeOrder) openDetail(activeOrder);
  }
}

function renderViewBtns() {
  document.getElementById('btn-view-cards').classList.toggle('active',S.viewMode==='cards');
  document.getElementById('btn-view-table').classList.toggle('active',S.viewMode==='table');
}

function renderContent() {
  const list=getDisplayOrders();
  const main=document.getElementById('main-content');
  if(S.orders.length===0){ main.innerHTML=emptyHTML(false); bindEmpty(); return; }
  if(list.length===0){ main.innerHTML=emptyHTML(true); bindEmpty(); return; }
  if(S.viewMode==='cards'){
    main.innerHTML=`<div class="cards-grid">${list.map(o=>cardHTML(o)).join('')}</div>`;
    bindCards(list);
  } else {
    main.innerHTML=tableHTML(list);
    bindTable(list);
  }
}

function emptyHTML(filtered) {
  return `<div class="empty-state">
    <div class="empty-icon">
      <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    </div>
    ${filtered
      ?`<p class="empty-title">لا توجد طلبات مطابقة للفلاتر</p>
        <p class="empty-desc">جرب تغيير معايير البحث أو مسح الفلاتر</p>
        <button class="btn-secondary" id="empty-clr-btn">مسح الفلاتر</button>`
      :`<p class="empty-title">لا توجد طلبات بعد</p>
        <p class="empty-desc">أضف أول طلب للبدء في إدارة طلباتك</p>
        <button class="btn-primary" id="empty-add-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة طلب جديد
        </button>`
    }</div>`;
}
function bindEmpty(){
  document.getElementById('empty-add-btn')?.addEventListener('click',openFormNew);
  document.getElementById('empty-clr-btn')?.addEventListener('click',()=>{clearFilters();render();});
}

/* ── CARD ── */
function cardHTML(order) {
  const del=isDelayed(order), comp=order.status==='مكتمل', canc=order.status==='ملغي';
  const sel=S.selectedIds.has(order.id);
  const orderNum=formatOrderNumber(order.orderNumber);

  const classes=['order-card',
    del&&!comp&&!canc?'delayed':'',
    sel?'selected':'',
    S.recentId===order.id?'recently-edited':'',
    comp?'completed':'',
  ].filter(Boolean).join(' ');

  return `
<div class="${classes}" data-id="${esc(order.id)}">
  <div class="card-strip ${stripClass(order)}"></div>
  <div class="card-body">
    <div class="card-header-row">
      <input type="checkbox" class="card-checkbox" data-id="${esc(order.id)}" ${sel?'checked':''} />
      <div class="card-info">
        <div class="card-name-row">
          <span class="card-order-num">${esc(orderNum)}</span>
          <span class="card-order-name" title="${esc(order.orderName)}">${esc(order.orderName)}</span>
          ${del&&!comp&&!canc?`<span class="delayed-chip">${svgIcon('alert',11)} متأخر</span>`:''}
        </div>
        <p class="card-client-name">${esc(order.clientName)}</p>
      </div>
      <div class="status-dropdown">
        ${statusTriggerHTML(order)}
      </div>
    </div>
    <div class="card-info-grid">
      <div class="info-item"><span class="info-label">الموظف</span><div class="info-val">${esc(order.employee||'—')}</div></div>
      <div class="info-item"><span class="info-label">الدفع</span><div class="info-val">${esc(order.paymentMethod)} • ${esc(getCurrencyMeta(getOrderCurrency(order)).label)}</div></div>
      <div class="info-item"><span class="info-label">تاريخ التسليم</span><div class="info-val">${esc(formatDate(order.deliveryDate))}</div></div>
      <div class="info-item"><span class="info-label">المصدر</span><div class="info-val">${esc(order.source||'—')}</div></div>
    </div>
    <div class="card-fin">
      <div class="fin-tile paid-tile">
        <div class="paid-val">${esc(formatCurrency(getOrderAmount(order,'paid')))}</div>
        <div class="paid-lbl">مدفوع</div>
      </div>
      <div class="fin-tile ${getOrderAmount(order,'remaining')>0?'rem-tile-pos':'rem-tile-zero'}">
        <div class="${getOrderAmount(order,'remaining')>0?'rem-val-pos':'rem-val-zero'}">${esc(formatCurrency(getOrderAmount(order,'remaining')))}</div>
        <div class="${getOrderAmount(order,'remaining')>0?'rem-lbl-pos':'rem-lbl-zero'}">باقي</div>
      </div>
    </div>
    ${order.alertNote?`<div class="card-alert"><span class="card-alert-ico">${svgIcon('alert',14)}</span><span>${esc(order.alertNote)}</span></div>`:''}
    <div class="card-actions">
      <button class="card-btn" data-action="view"   data-id="${esc(order.id)}" title="عرض">${svgIcon('eye',15)}</button>
      <button class="card-btn" data-action="edit"   data-id="${esc(order.id)}" title="تعديل">${svgIcon('edit',15)}</button>
      <button class="card-btn" data-action="phone"  data-id="${esc(order.id)}" title="نسخ الرقم" ${!order.clientPhone?'disabled':''}>${svgIcon('phone',15)}</button>
      <button class="card-btn" data-action="dup"    data-id="${esc(order.id)}" title="تكرار">${svgIcon('copy',15)}</button>
      <button class="card-btn" data-action="print"  data-id="${esc(order.id)}" title="طباعة">${svgIcon('print',15)}</button>
      <button class="card-btn c-danger" data-action="del" data-id="${esc(order.id)}" title="حذف">${svgIcon('trash',15)}</button>
    </div>
  </div>
</div>`;
}

function bindCards(list) {
  const grid=document.querySelector('.cards-grid'); if(!grid) return;
  grid.querySelectorAll('.card-checkbox').forEach(cb=>{
    cb.addEventListener('change',e=>{toggleSel(e.target.dataset.id);renderBulkBar();e.stopPropagation();});
    cb.addEventListener('click',e=>e.stopPropagation());
  });
  grid.querySelectorAll('.status-badge-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const order=list.find(o=>o.id===btn.dataset.id);
      if(order) openStatusMenu(btn, order.id, order.status);
    });
  });
  grid.querySelectorAll('.card-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const {action,id}=btn.dataset;
      const o=S.orders.find(x=>x.id===id); if(!o) return;
      if(action==='view')  openDetail(o);
      if(action==='edit')  openFormEdit(o);
      if(action==='phone') copyPhone(o);
      if(action==='dup')   duplicateOrder(id);
      if(action==='print') printSingle(o);
      if(action==='del')   deleteConfirm(id,o.orderName);
    });
  });
}

/* ── TABLE ── */
function tableHTML(list) {
  const allSel=list.length>0&&list.every(o=>S.selectedIds.has(o.id));
  const th=(f,l)=>{
    const active=S.sort.field===f;
    const arrow=active?(S.sort.direction==='asc'?svgIcon('up',11):svgIcon('dn',11)):svgIcon('dn',11);
    return `<th class="sortable" data-field="${f}"><div class="th-inner">${arrow} ${l}</div></th>`;
  };
  const rows=list.map(o=>{
    const del=isDelayed(o),comp=o.status==='مكتمل',canc=o.status==='ملغي';
    const sel=S.selectedIds.has(o.id);
    const oNum=formatOrderNumber(o.orderNumber);
    return `<tr class="${sel?'selected':''} ${comp?'completed':''}" data-id="${esc(o.id)}">
      <td><input type="checkbox" class="row-chk" data-id="${esc(o.id)}" ${sel?'checked':''} /></td>
      <td style="text-align:center"><span class="order-num-badge">${esc(oNum)}</span></td>
      <td><div class="td-name">${esc(o.clientName)}</div>${o.clientPhone?`<div class="td-sub" dir="ltr">${esc(o.clientPhone)}</div>`:''}</td>
      <td><div class="td-order-wrap">${del&&!comp&&!canc?`<span style="color:#f97316">${svgIcon('alert',14)}</span>`:''}<span class="td-order-txt" title="${esc(o.orderName)}">${esc(o.orderName)}</span></div></td>
      <td><div class="status-dropdown">${statusTriggerHTML(o)}</div></td>
      <td><span class="td-muted">${esc(o.employee||'—')}</span></td>
      <td><span class="td-date${del&&!comp&&!canc?' overdue':''}">${esc(formatDate(o.deliveryDate))}</span></td>
      <td><span class="td-paid-val">${esc(formatCurrency(getOrderAmount(o,'paid')))}</span></td>
      <td><span class="${getOrderAmount(o,'remaining')>0?'td-rem-pos':'td-rem-zero'}">${esc(formatCurrency(getOrderAmount(o,'remaining')))}</span></td>
      <td><span class="td-muted">${esc(o.paymentMethod)} • ${esc(getCurrencyMeta(getOrderCurrency(o)).suffix)}</span></td>
      <td>
        <div class="td-acts">
          <button class="tiny-btn" data-action="view"  data-id="${esc(o.id)}" title="عرض">${svgIcon('eye',14)}</button>
          <button class="tiny-btn" data-action="edit"  data-id="${esc(o.id)}" title="تعديل">${svgIcon('edit',14)}</button>
          <button class="tiny-btn" data-action="phone" data-id="${esc(o.id)}" title="نسخ الرقم" ${!o.clientPhone?'disabled':''}>${svgIcon('phone',14)}</button>
          <button class="tiny-btn" data-action="dup"   data-id="${esc(o.id)}" title="تكرار">${svgIcon('copy',14)}</button>
          <button class="tiny-btn tdanger" data-action="del" data-id="${esc(o.id)}" title="حذف">${svgIcon('trash',14)}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<div class="table-wrapper"><table class="orders-table">
    <thead><tr>
      <th style="width:2.5rem">
        <button id="btn-sel-all" title="${allSel?'إلغاء الكل':'تحديد الكل'}">
          ${allSel?`<span style="color:var(--primary)">${svgIcon('chk',16)}</span>`:svgIcon('sq',16)}
        </button>
      </th>
      <th style="width:4rem;text-align:center">رقم</th>
      ${th('clientName','العميل')}
      <th>الطلب</th><th>الحالة</th>
      ${th('employee','الموظف')}
      ${th('deliveryDate','التسليم')}
      ${th('paid','المدفوع')}
      ${th('remaining','الباقي')}
      <th>الدفع</th><th style="min-width:9rem">إجراءات</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function bindTable(list) {
  const wrap=document.querySelector('.table-wrapper'); if(!wrap) return;
  document.getElementById('btn-sel-all')?.addEventListener('click',()=>{
    const allSel=list.every(o=>S.selectedIds.has(o.id));
    if(allSel) S.selectedIds.clear(); else list.forEach(o=>S.selectedIds.add(o.id));
    render();
  });
  wrap.querySelectorAll('.row-chk').forEach(cb=>{
    cb.addEventListener('change',e=>{toggleSel(e.target.dataset.id);renderBulkBar();});
  });
  wrap.querySelectorAll('th.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const f=th.dataset.field;
      S.sort.direction = S.sort.field===f?(S.sort.direction==='asc'?'desc':'asc'):'desc';
      S.sort.field=f; savePrefs(); render();
    });
  });
  wrap.querySelectorAll('.status-badge-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const order=list.find(o=>o.id===btn.dataset.id);
      if(order) openStatusMenu(btn, order.id, order.status);
    });
  });
  wrap.querySelectorAll('.tiny-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const {action,id}=btn.dataset;
      const o=S.orders.find(x=>x.id===id); if(!o) return;
      if(action==='view')  openDetail(o);
      if(action==='edit')  openFormEdit(o);
      if(action==='phone') copyPhone(o);
      if(action==='dup')   duplicateOrder(id);
      if(action==='del')   deleteConfirm(id,o.orderName);
    });
  });
}

function renderPrintTable(){
  const list=getDisplayOrders();
  const w=document.getElementById('print-table-wrapper');
  if(!list.length){w.innerHTML='';return;}
  w.innerHTML=`<table><thead><tr>
    <th>الرقم</th><th>اسم العميل</th><th>اسم الطلب</th><th>الحالة</th>
    <th>تاريخ التسليم</th><th>المدفوع</th><th>الباقي</th><th>الموظف</th>
  </tr></thead><tbody>
  ${list.map(o=>`<tr>
    <td style="text-align:center">${esc(formatOrderNumber(o.orderNumber))}</td><td>${esc(o.clientName)}</td><td>${esc(o.orderName)}</td><td>${esc(o.status)}</td>
    <td>${esc(formatDate(o.deliveryDate))}</td><td>${esc(formatCurrency(getOrderAmount(o,'paid')))}</td>
    <td>${esc(formatCurrency(getOrderAmount(o,'remaining')))}</td><td>${esc(o.employee||'—')}</td>
  </tr>`).join('')}
  </tbody></table>`;
}

/* ════════════════════════════════════════
   BULK
════════════════════════════════════════ */
function renderBulkBar(){
  const el=document.getElementById('bulk-actions');
  if(S.selectedIds.size===0){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  document.getElementById('bulk-count').textContent=`تم تحديد ${S.selectedIds.size} طلب`;
}
function toggleSel(id){ S.selectedIds.has(id)?S.selectedIds.delete(id):S.selectedIds.add(id); }

/* ════════════════════════════════════════
   CRUD
════════════════════════════════════════ */
function addOrder(data) {
  const now=new Date().toISOString();
  const o=normalizeOrderMoney({...data,id:genId(),orderNumber:getNextOrderNum(),createdAt:now,updatedAt:now});
  S.orders.unshift(o); saveOrders(S.orders);
  setRecent(o.id); scheduleAllAlerts();
  showToast('تم إضافة الطلب بنجاح','success'); render();
}
function updateOrder(id,data){
  S.orders=S.orders.map(o=>o.id===id?normalizeOrderMoney({...o,...data,updatedAt:new Date().toISOString()}):o);
  saveOrders(S.orders); setRecent(id); scheduleAllAlerts();
  showToast('تم تحديث الطلب','success'); render();
}
function deleteConfirm(id,name){
  if(confirm(`هل تريد حذف طلب "${name}"؟`)){
    S.orders=S.orders.filter(o=>o.id!==id); S.selectedIds.delete(id);
    saveOrders(S.orders); showToast('تم حذف الطلب','info'); render();
  }
}
function duplicateOrder(id){
  const o=S.orders.find(x=>x.id===id); if(!o) return;
  const now=new Date().toISOString();
  const dup=normalizeOrderMoney({...o,id:genId(),orderNumber:getNextOrderNum(),orderName:`${o.orderName} (نسخة)`,status:'جديد',createdAt:now,updatedAt:now});
  S.orders.unshift(dup); saveOrders(S.orders);
  showToast('تم تكرار الطلب','success'); render();
}
function changeStatus(id,status){
  S.orders=S.orders.map(o=>o.id===id?{...o,status,updatedAt:new Date().toISOString()}:o);
  saveOrders(S.orders); showToast(`الحالة: "${status}"`, 'info'); render();
}
function setRecent(id){
  S.recentId=id;
  if(S.recentTimer) clearTimeout(S.recentTimer);
  S.recentTimer=setTimeout(()=>{S.recentId=null;},2500);
}
function copyPhone(o){
  if(!o.clientPhone) return;
  navigator.clipboard.writeText(o.clientPhone)
    .then(()=>showToast('تم نسخ الرقم','info'))
    .catch(()=>showToast('فشل النسخ','error'));
}

function currentFormCurrency() {
  const el = document.getElementById('f-currency');
  return MONEY_CURRENCIES.includes(el?.value) ? el.value : S.currency;
}
function prepareFinancialData(data) {
  const currency = MONEY_CURRENCIES.includes(data.currency) ? data.currency : 'YER';
  const totalAmount = roundMoney(Math.max(0, data.totalAmount), currency);
  const paid = roundMoney(Math.max(0, data.paid), currency);
  const remaining = roundMoney(Math.max(0, totalAmount - paid), currency);
  return {
    ...data,
    currency,
    totalAmount,
    paid,
    remaining,
    convertedAmounts: {
      totalAmount: buildMoneyMap(totalAmount, currency),
      paid: buildMoneyMap(paid, currency),
      remaining: buildMoneyMap(remaining, currency),
    },
  };
}
function updateMoneyPreviewBlock(id, value, activeCurrency) {
  const host = document.getElementById(id);
  if (!host) return;
  host.innerHTML = MONEY_CURRENCIES.map(currency=>`
    <div class="money-preview-line${currency===activeCurrency?' is-active':''}">
      <span>${esc(getCurrencyMeta(currency).label)}</span>
      <strong>${esc(formatCurrency(convertAmount(value, activeCurrency, currency), currency))}</strong>
    </div>`).join('');
}
function updateMoneyFormUI() {
  const currency = currentFormCurrency();
  const meta = getCurrencyMeta(currency);
  document.querySelectorAll('.money-input-suffix').forEach(el=>el.textContent=meta.suffix);
  const note = document.getElementById('money-exchange-note');
  if (note) note.textContent = `${getRateTextForForm(currency)} السعر المعتمد: ${FX_TEXT}`;
  updateMoneyPreviewBlock('money-preview-total', num(document.getElementById('f-totalAmount')?.value), currency);
  updateMoneyPreviewBlock('money-preview-paid', num(document.getElementById('f-paid')?.value), currency);
  updateMoneyPreviewBlock('money-preview-remaining', num(document.getElementById('f-remaining')?.value), currency);
}
function recalcMoneyFields() {
  const currency = currentFormCurrency();
  const total = Math.max(0, num(document.getElementById('f-totalAmount').value));
  const paid = Math.max(0, num(document.getElementById('f-paid').value));
  const remaining = Math.max(0, total - paid);
  document.getElementById('f-remaining').value = formatMoneyInputValue(remaining, currency);
  updateMoneyFormUI();
}
function changeMoneyFormCurrency(nextCurrency) {
  const selector = document.getElementById('f-currency');
  const prevCurrency = selector.dataset.prevCurrency || selector.value || nextCurrency;
  if (prevCurrency !== nextCurrency) {
    ['f-totalAmount','f-paid','f-remaining'].forEach(id => {
      const input = document.getElementById(id);
      input.value = formatMoneyInputValue(convertAmount(input.value, prevCurrency, nextCurrency), nextCurrency);
    });
  }
  selector.value = nextCurrency;
  selector.dataset.prevCurrency = nextCurrency;
  recalcMoneyFields();
}

/* ════════════════════════════════════════
   ORDER FORM
════════════════════════════════════════ */
function openFormNew(){
  S.editingId=null; resetForm();
  document.getElementById('f-receivedDate').value=today();
  document.getElementById('form-title').textContent='إضافة طلب جديد';
  document.getElementById('form-order-number').textContent=`رقم الطلب: ${formatOrderNumber(S.orderCounter + 1)} سيُعتمد عند الحفظ`;
  changeMoneyFormCurrency(S.currency);
  setSubmitBtn('إضافة الطلب');
  document.getElementById('modal-form').classList.remove('hidden');
  setTimeout(()=>document.getElementById('f-clientName')?.focus(),100);
}
function openFormEdit(o){
  S.editingId=o.id; fillForm(o);
  document.getElementById('form-title').textContent='تعديل الطلب';
  document.getElementById('form-order-number').textContent=`رقم الطلب: ${formatOrderNumber(o.orderNumber)}`;
  setSubmitBtn('حفظ التعديلات');
  document.getElementById('modal-form').classList.remove('hidden');
}
function setSubmitBtn(label){
  document.getElementById('btn-submit-form').innerHTML=`<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ${label}`;
}
function closeForm(){
  document.getElementById('modal-form').classList.add('hidden');
  document.getElementById('form-order-number').textContent='';
  clearFormErrors();
}

function resetForm(){
  ['clientName','orderName','clientPhone','source','details','receivedDate',
   'deliveryDate','deliveryTime','alertNote','alertDate','internalNotes',
   'totalAmount','paid','remaining','employee'].forEach(f=>{
    const el=document.getElementById(`f-${f}`); if(el) el.value='';
  });
  document.getElementById('f-currency').value=S.currency;
  document.getElementById('f-currency').dataset.prevCurrency=S.currency;
  document.getElementById('f-status').value='جديد';
  document.getElementById('f-paymentMethod').value='نقدي';
  updateMoneyFormUI();
  clearFormErrors();
}
function fillForm(o){
  const MAP={clientName:1,orderName:1,clientPhone:1,source:1,receivedDate:1,details:1,
             deliveryDate:1,deliveryTime:1,status:1,employee:1,paid:1,remaining:1,
             totalAmount:1,paymentMethod:1,alertNote:1,alertDate:1,internalNotes:1};
  const currency = getOrderCurrency(o);
  document.getElementById('f-currency').value = currency;
  document.getElementById('f-currency').dataset.prevCurrency = currency;
  Object.keys(MAP).forEach(k=>{
    const el=document.getElementById(`f-${k}`);
    if(!el) return;
    if (MONEY_FIELDS.includes(k)) {
      el.value = formatMoneyInputValue(o[k], currency);
    } else {
      el.value=o[k]??'';
    }
  });
  updateMoneyFormUI();
  clearFormErrors();
}
function getFormData(){
  return {
    clientName:   document.getElementById('f-clientName').value.trim(),
    orderName:    document.getElementById('f-orderName').value.trim(),
    clientPhone:  document.getElementById('f-clientPhone').value.trim(),
    source:       document.getElementById('f-source').value.trim(),
    receivedDate: document.getElementById('f-receivedDate').value,
    details:      document.getElementById('f-details').value.trim(),
    deliveryDate: document.getElementById('f-deliveryDate').value,
    deliveryTime: document.getElementById('f-deliveryTime').value,
    status:       document.getElementById('f-status').value,
    employee:     document.getElementById('f-employee').value.trim(),
    currency:     currentFormCurrency(),
    paid:         Math.max(0,num(document.getElementById('f-paid').value)),
    remaining:    Math.max(0,num(document.getElementById('f-remaining').value)),
    totalAmount:  Math.max(0,num(document.getElementById('f-totalAmount').value)),
    paymentMethod:document.getElementById('f-paymentMethod').value,
    alertNote:    document.getElementById('f-alertNote').value.trim(),
    alertDate:    document.getElementById('f-alertDate').value,
    internalNotes:document.getElementById('f-internalNotes').value.trim(),
  };
}
function validateForm(d){
  const e={};
  if(!d.clientName)  e.clientName='اسم العميل مطلوب';
  if(!d.orderName)   e.orderName='اسم الطلب مطلوب';
  if(d.clientPhone && !/^[\d\s\+\-\(\)]{7,15}$/.test(d.clientPhone)) e.clientPhone='رقم غير صحيح';
  if(d.paid<0)        e.paid='لا يمكن أن يكون سالباً';
  if(d.remaining<0)   e.remaining='لا يمكن أن يكون سالباً';
  if(d.totalAmount<0) e.totalAmount='لا يمكن أن يكون سالباً';
  if(d.paid>d.totalAmount) e.paid='المدفوع لا يمكن أن يكون أكبر من إجمالي الطلب';
  if(d.deliveryDate&&d.receivedDate&&d.deliveryDate<d.receivedDate) e.deliveryDate='تاريخ التسليم يجب أن يكون بعد تاريخ الاستلام';
  return e;
}
function showFormErrors(errors){
  clearFormErrors();
  for(const[k,msg] of Object.entries(errors)){
    document.getElementById(`f-${k}`)?.classList.add('error');
    const el=document.getElementById(`err-${k}`);
    if(el){el.textContent=msg;el.classList.remove('hidden');}
  }
  if(Object.keys(errors).length) document.getElementById('form-errors-msg').classList.remove('hidden');
}
function clearFormErrors(){
  document.querySelectorAll('.f-input.error').forEach(e=>e.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(e=>e.classList.add('hidden'));
  document.getElementById('form-errors-msg')?.classList.add('hidden');
}
function submitForm(){
  const d=prepareFinancialData(getFormData()), errors=validateForm(d);
  if(Object.keys(errors).length){showFormErrors(errors);return;}
  if(S.editingId) updateOrder(S.editingId,d); else addOrder(d);
  closeForm();
}

/* ════════════════════════════════════════
   ORDER DETAIL
════════════════════════════════════════ */
function openDetail(o){
  S.viewingId=o.id;
  const del=isDelayed(o);
  document.getElementById('detail-order-name').textContent=o.orderName;
  document.getElementById('detail-order-number').textContent=`رقم الطلب: ${formatOrderNumber(o.orderNumber)}`;
  document.getElementById('detail-delayed-badge').classList.toggle('hidden',!del);
  const sb=document.getElementById('detail-status-badge');
  sb.className=`status-badge ${statusClass(o.status)}`;
  sb.textContent=o.status;
  document.getElementById('detail-content').innerHTML=buildDetail(o,del);
  document.querySelector('#detail-content .copy-btn')?.addEventListener('click',()=>copyPhone(o));
  document.getElementById('modal-detail').classList.remove('hidden');
}
function closeDetail(){
  document.getElementById('modal-detail').classList.add('hidden');
  document.getElementById('detail-order-number').textContent='';
  S.viewingId=null;
}

function buildDetail(o,del){
  const rem=getOrderAmount(o,'remaining');
  return `
  <div class="detail-sec">
    <div class="detail-sec-title">بيانات العميل</div>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-lbl">رقم الطلب</div><div class="detail-val">${esc(formatOrderNumber(o.orderNumber))}</div></div>
      <div class="detail-item"><div class="detail-lbl">الاسم</div><div class="detail-val">${esc(o.clientName)}</div></div>
      <div class="detail-item"><div class="detail-lbl">رقم الهاتف</div><div class="detail-action-row"><div class="detail-val">${esc(o.clientPhone||'—')}</div>${o.clientPhone?`<button class="copy-btn">${svgIcon('copy',12)} نسخ</button>`:''}</div></div>
      <div class="detail-item"><div class="detail-lbl">المصدر</div><div class="detail-val">${esc(o.source||'—')}</div></div>
      <div class="detail-item"><div class="detail-lbl">الموظف</div><div class="detail-val">${esc(o.employee||'—')}</div></div>
    </div>
  </div>
  <div class="detail-sec">
    <div class="detail-sec-title">تفاصيل الطلب</div>
    ${o.details?`<div class="detail-textbox" style="margin-bottom:.75rem"><p>${esc(o.details)}</p></div>`:''}
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-lbl">تاريخ الاستلام</div><div class="detail-val">${esc(formatDate(o.receivedDate))}</div></div>
      <div class="detail-item"><div class="detail-lbl">تاريخ التسليم</div><div class="detail-val">${del?`<span style="color:#ea580c">${esc(formatDate(o.deliveryDate))}</span>`:esc(formatDate(o.deliveryDate))}${o.deliveryTime?' — '+esc(o.deliveryTime):''}</div></div>
    </div>
  </div>
  <div class="detail-sec">
    <div class="detail-sec-title">المعلومات المالية</div>
    <div class="fin3-grid">
      <div class="fin3-chip fin3-total"><div class="chip-val">${esc(formatCurrency(getOrderAmount(o,'totalAmount')))}</div><div class="chip-lbl">إجمالي الطلب</div></div>
      <div class="fin3-chip fin3-paid" ><div class="chip-val">${esc(formatCurrency(getOrderAmount(o,'paid')))}</div><div class="chip-lbl">المدفوع</div></div>
      <div class="fin3-chip ${rem>0?'fin3-rem-p':'fin3-rem-z'}"><div class="chip-val">${esc(formatCurrency(getOrderAmount(o,'remaining')))}</div><div class="chip-lbl">الباقي</div></div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-lbl">طريقة الدفع</div><div class="detail-val">${esc(o.paymentMethod)}</div></div>
      <div class="detail-item"><div class="detail-lbl">عملة الإدخال</div><div class="detail-val">${esc(getCurrencyMeta(getOrderCurrency(o)).label)}</div></div>
    </div>
  </div>
  ${(o.alertNote||o.alertDate)?`
  <div class="detail-sec">
    <div class="detail-sec-title">التنبيه</div>
    ${o.alertNote?`<div class="det-alert">${svgIcon('alert',16)}<p>${esc(o.alertNote)}</p></div>`:''}
    ${o.alertDate?`<div class="detail-item" style="margin-top:.5rem"><div class="detail-lbl">وقت التنبيه</div><div class="detail-val">${esc(formatDateTime(o.alertDate))}</div></div>`:''}
  </div>`:''}
  ${o.internalNotes?`<div class="detail-sec"><div class="detail-sec-title">ملاحظات داخلية</div><div class="detail-textbox"><p style="color:var(--muted-fg)">${esc(o.internalNotes)}</p></div></div>`:''}
  <div class="detail-meta">
    <span>${svgIcon('clock',13)} أُنشئ: ${esc(formatDateTime(o.createdAt))}</span>
    <span>آخر تعديل: ${esc(formatDateTime(o.updatedAt))}</span>
  </div>`;
}

/* ════════════════════════════════════════
   SINGLE PRINT
════════════════════════════════════════ */
function printSingle(o){
  const win=window.open('','_blank'); if(!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8"><title>${o.orderName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>
      body{font-family:'Tajawal',sans-serif;padding:15mm;font-size:13px;color:#1e293b;direction:rtl}
      .hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:20px}
      .logo{font-size:20px;font-weight:800;color:#2563eb;letter-spacing:-.02em}
      h1{font-size:18px;font-weight:800;margin:0 0 8px}
      .badge{display:inline-block;padding:3px 12px;border-radius:9999px;font-size:11px;font-weight:700;background:#dbeafe;color:#1e40af}
      table{width:100%;border-collapse:collapse;margin-top:14px}
      td{padding:8px 12px;border:1px solid #e2e8f0;font-size:12.5px}
      td:first-child{font-weight:700;width:35%;background:#f8fafc;color:#475569}
    </style></head><body>
    <div class="hdr"><div class="logo">نظام إدارة الطلبات</div><div style="font-size:12px;color:#64748b">طُبع: ${new Date().toLocaleDateString('ar-SA')}</div></div>
    <h1>${esc(o.orderName)}</h1>
    <span class="badge">${esc(formatOrderNumber(o.orderNumber))}</span>
    <table>
      <tr><td>رقم الطلب</td><td>${esc(formatOrderNumber(o.orderNumber))}</td></tr>
      <tr><td>اسم العميل</td><td>${esc(o.clientName)}</td></tr>
      <tr><td>رقم الهاتف</td><td dir="ltr">${esc(o.clientPhone||'—')}</td></tr>
      <tr><td>المصدر</td><td>${esc(o.source||'—')}</td></tr>
      <tr><td>الموظف</td><td>${esc(o.employee||'—')}</td></tr>
      <tr><td>تاريخ الاستلام</td><td>${esc(formatDate(o.receivedDate))}</td></tr>
      <tr><td>تاريخ التسليم</td><td>${esc(formatDate(o.deliveryDate))}${o.deliveryTime?' — '+esc(o.deliveryTime):''}</td></tr>
      <tr><td>الحالة</td><td>${esc(o.status)}${isDelayed(o)?' ⚠ متأخر':''}</td></tr>
      <tr><td>طريقة الدفع</td><td>${esc(o.paymentMethod)}</td></tr>
      <tr><td>عملة الإدخال</td><td>${esc(getCurrencyMeta(getOrderCurrency(o)).label)}</td></tr>
      <tr><td>الإجمالي</td><td>${esc(formatCurrency(getOrderAmount(o,'totalAmount')))}</td></tr>
      <tr><td>المدفوع</td><td>${esc(formatCurrency(getOrderAmount(o,'paid')))}</td></tr>
      <tr><td>الباقي</td><td>${esc(formatCurrency(getOrderAmount(o,'remaining')))}</td></tr>
      ${o.details?`<tr><td>التفاصيل</td><td>${esc(o.details)}</td></tr>`:''}
      ${o.alertNote?`<tr><td>التنبيه</td><td>${esc(o.alertNote)}</td></tr>`:''}
    </table>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
  </body></html>`);
  win.document.close();
}

/* ════════════════════════════════════════
   IMPORT
════════════════════════════════════════ */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('تعذر قراءة الملف النصي'));
    r.readAsText(file);
  });
}
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('تعذر قراءة ملف Excel'));
    r.readAsArrayBuffer(file);
  });
}
function chooseImportSheet(workbook) {
  const candidates = workbook.SheetNames.map(sheetName => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });
    let bestHeaderRow = -1;
    let bestScore = 0;
    rows.slice(0, 8).forEach((row, idx) => {
      if (!Array.isArray(row)) return;
      const score = row.reduce((sum, cell) => sum + (findCanonicalImportField(cell) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestHeaderRow = idx;
      }
    });
    if (bestHeaderRow < 0 || bestScore < 2) return { sheetName, rows: [], score: 0 };
    const fieldMap = rows[bestHeaderRow].map(findCanonicalImportField);
    const mappedRows = rows.slice(bestHeaderRow + 1).map(row => {
      if (!Array.isArray(row)) return null;
      if (row.every(cell => String(cell ?? '').trim() === '')) return null;
      const record = {};
      fieldMap.forEach((field, colIdx) => {
        const cell = row[colIdx];
        if (!field || cell === '' || cell === null || cell === undefined) return;
        record[field] = cell;
      });
      return Object.keys(record).length ? record : null;
    }).filter(Boolean);
    return {
      sheetName,
      rows: mappedRows,
      score: bestScore + Math.min(mappedRows.length, 25) / 100,
    };
  }).filter(item => item.score > 0 && item.rows.length);

  return candidates.sort((a, b) => b.score - a.score)[0] || null;
}
async function parseImportFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const ext = name.split('.').pop();
  if (ext === 'json') {
    const raw = await readFileAsText(file);
    const parsed = JSON.parse(raw);
    return {
      data: Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.orders) ? parsed.orders : parsed),
      meta: { source: 'json', label: 'تم تحليل ملف JSON بنجاح' },
    };
  }
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    throw new Error('صيغة الملف غير مدعومة. استخدم Excel أو CSV أو JSON');
  }
  if (typeof XLSX === 'undefined') {
    throw new Error('مكتبة Excel غير محملة، تحقق من الاتصال ثم أعد المحاولة');
  }
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const bestSheet = chooseImportSheet(workbook);
  if (!bestSheet) throw new Error('تعذر العثور على جدول طلبات صالح داخل ملف Excel');
  return {
    data: bestSheet.rows,
    meta: {
      source: ext,
      label: `تم تحليل ملف ${ext.toUpperCase()} من الورقة "${bestSheet.sheetName}"`,
    },
  };
}
async function handleFile(file){
  try {
    const parsed = await parseImportFile(file);
    const result = validateImport(parsed.data);
    result.meta = parsed.meta;
    S.pendingImport=result;
    showImportModal(result);
  } catch (err) {
    showToast(err?.message || 'تعذر استيراد الملف', 'error');
  }
}
function showImportModal(result){
  const w=document.getElementById('import-warnings');
  if(result.errors.length){
    w.classList.remove('hidden');
    const preview = result.errors.slice(0,5);
    w.innerHTML=`<p style="font-weight:700;margin-bottom:.25rem">تحذيرات:</p>`+
      preview.map(e=>`<p>${esc(e)}</p>`).join('')+
      (result.errors.length>preview.length?`<p>و${result.errors.length-preview.length} تحذير إضافي...</p>`:'');
  } else w.classList.add('hidden');
  const meta = result.meta?.label ? `<span class="import-meta-note">${esc(result.meta.label)}</span>` : '';
  document.getElementById('import-info').innerHTML=`تم العثور على <strong>${result.orders.length}</strong> طلب صالح${meta}`;
  document.getElementById('modal-import').classList.remove('hidden');
}
function confirmImport(mode){
  if(!S.pendingImport?.valid){showToast('لا توجد بيانات صالحة','error');closeImportModal();return;}
  const newOrders=S.pendingImport.orders;
  let importedCount = newOrders.length;
  let skippedCount = 0;
  if(mode==='replace'){
    S.orders=newOrders;
  } else {
    const ids=new Set(S.orders.map(o=>o.id));
    const fingerprints = new Set(S.orders.map(buildImportFingerprint).filter(Boolean));
    const merged = [];
    newOrders.forEach(order => {
      const fp = buildImportFingerprint(order);
      if (ids.has(order.id) || (fp && fingerprints.has(fp))) {
        skippedCount++;
        return;
      }
      ids.add(order.id);
      if (fp) fingerprints.add(fp);
      merged.push(order);
    });
    importedCount = merged.length;
    S.orders=[...S.orders,...merged];
  }
  syncOrderNumbers();
  saveOrders(S.orders);
  showToast(
    skippedCount
      ? `تم استيراد ${importedCount} طلب وتجاهل ${skippedCount} مكرر`
      : `تم استيراد ${importedCount} طلب بنجاح`,
    'success'
  );
  closeImportModal(); scheduleAllAlerts(); render();
}
function closeImportModal(){
  document.getElementById('modal-import').classList.add('hidden');
  S.pendingImport=null;
  document.getElementById('import-file-input').value='';
}

/* ════════════════════════════════════════
   DARK MODE
════════════════════════════════════════ */
function applyDark(){
  document.documentElement.classList.toggle('dark',S.darkMode);
  document.getElementById('icon-moon').classList.toggle('hidden',S.darkMode);
  document.getElementById('icon-sun').classList.toggle('hidden',!S.darkMode);
  localStorage.setItem(K.DARK,String(S.darkMode));
}
function applyHeaderCollapsed() {
  const header = document.getElementById('main-header');
  const brandToggle = document.getElementById('brand-toggle');
  if (!header || !brandToggle) return;
  header.classList.toggle('header-collapsed', S.headerCollapsed);
  brandToggle.setAttribute('aria-expanded', String(!S.headerCollapsed));
  brandToggle.setAttribute('title', S.headerCollapsed ? 'إظهار الشريط العلوي' : 'إخفاء الشريط العلوي');
  localStorage.setItem(K.HEADER_COLLAPSED, String(S.headerCollapsed));
}

/* ════════════════════════════════════════
   BIND ALL EVENTS
════════════════════════════════════════ */
function bindEvents(){
  const floatingStatusMenu = getStatusMenuEl();
  const curSel = document.getElementById('currency-select');
  if(curSel) curSel.addEventListener('change', e => {
    S.currency = e.target.value;
    updateCurrencyUI();
    render();
  });

  floatingStatusMenu?.addEventListener('click',e=>{
    e.stopPropagation();
    const item=e.target.closest('.status-menu-item');
    if(!item) return;
    changeStatus(item.dataset.id,item.dataset.status);
    closeStatusMenu();
  });
  document.addEventListener('click',e=>{
    if (e.target.closest('#floating-status-menu') || e.target.closest('.status-badge-btn')) return;
    closeStatusMenu();
  });
  window.addEventListener('resize',closeStatusMenu);
  window.addEventListener('scroll',closeStatusMenu,true);

  // Header actions
  const brandToggle = document.getElementById('brand-toggle');
  const toggleHeaderCollapsed = () => {
    S.headerCollapsed = !S.headerCollapsed;
    applyHeaderCollapsed();
  };
  brandToggle?.addEventListener('click', toggleHeaderCollapsed);
  brandToggle?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleHeaderCollapsed();
    }
  });
  document.getElementById('btn-add-new').addEventListener('click',openFormNew);
  document.getElementById('btn-dark-mode').addEventListener('click',()=>{S.darkMode=!S.darkMode;applyDark();});
  document.getElementById('btn-export-excel').addEventListener('click',()=>{exportToExcel(S.orders);showToast('تم تصدير ملف Excel بنجاح','success');});
  document.getElementById('btn-backup').addEventListener('click',()=>{exportToJson(S.orders);showToast('تم حفظ النسخة الاحتياطية بنجاح','info');});
  document.getElementById('btn-export-excel-m').addEventListener('click',()=>{exportToExcel(S.orders);showToast('تم التصدير بنجاح','success');});
  document.getElementById('btn-print').addEventListener('click',()=>window.print());
  document.getElementById('btn-print-m').addEventListener('click',()=>window.print());

  // Import
  const trigImp=()=>document.getElementById('import-file-input').click();
  document.getElementById('btn-import').addEventListener('click',trigImp);
  document.getElementById('btn-import-m').addEventListener('click',trigImp);
  document.getElementById('import-file-input').addEventListener('change',e=>{
    const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value='';
  });

  // Search
  document.getElementById('search-input').addEventListener('input',e=>{
    S.filters.search=e.target.value; savePrefs();
    document.getElementById('btn-clear-search').classList.toggle('hidden',!e.target.value);
    render();
  });
  document.getElementById('btn-clear-search').addEventListener('click',()=>{
    S.filters.search='';document.getElementById('search-input').value='';
    document.getElementById('btn-clear-search').classList.add('hidden');
    savePrefs();render();
  });

  // View toggle
  document.getElementById('btn-view-cards').addEventListener('click',()=>{S.viewMode='cards';savePrefs();render();});
  document.getElementById('btn-view-table').addEventListener('click',()=>{S.viewMode='table';savePrefs();render();});

  // Status chips
  document.getElementById('status-chips').addEventListener('click',e=>{
    const chip=e.target.closest('.status-chip'); if(!chip) return;
    if(chip.id==='btn-delayed-chip'){
      S.filters.delayedOnly=!S.filters.delayedOnly;
      if(S.filters.delayedOnly) S.filters.status='';
    } else {
      S.filters.status=chip.dataset.status||'';
      S.filters.delayedOnly=false;
    }
    savePrefs();render();
  });

  // Advanced filters toggle
  document.getElementById('btn-adv-filters').addEventListener('click',()=>{
    const pnl=document.getElementById('adv-filters');
    const btn=document.getElementById('btn-adv-filters');
    pnl.classList.toggle('hidden');
    btn.classList.toggle('open',!pnl.classList.contains('hidden'));
  });

  // Advanced filter selects
  document.getElementById('filter-employee').addEventListener('change',e=>{S.filters.employee=e.target.value;savePrefs();render();});
  document.getElementById('filter-payment').addEventListener('change',e=>{S.filters.paymentMethod=e.target.value;savePrefs();render();});
  document.getElementById('filter-source').addEventListener('change',e=>{S.filters.source=e.target.value;savePrefs();render();});
  document.getElementById('filter-date-preset').addEventListener('change',e=>{S.filters.datePreset=e.target.value;savePrefs();render();});
  document.getElementById('filter-date-from').addEventListener('change',e=>{S.filters.dateFrom=e.target.value;savePrefs();render();});
  document.getElementById('filter-date-to').addEventListener('change',e=>{S.filters.dateTo=e.target.value;savePrefs();render();});
  document.getElementById('btn-clear-filters').addEventListener('click',()=>{clearFilters();savePrefs();render();});

  // Sort
  document.getElementById('sort-field').addEventListener('change',e=>{S.sort.field=e.target.value;savePrefs();render();});
  document.getElementById('btn-sort-dir').addEventListener('click',()=>{
    S.sort.direction=S.sort.direction==='asc'?'desc':'asc';savePrefs();render();
  });

  // Bulk actions
  document.getElementById('btn-delete-selected').addEventListener('click',()=>{
    if(confirm(`حذف ${S.selectedIds.size} طلب؟`)){
      const n=S.selectedIds.size;
      S.orders=S.orders.filter(o=>!S.selectedIds.has(o.id));
      S.selectedIds.clear(); saveOrders(S.orders);
      showToast(`تم حذف ${n} طلب`,'info'); render();
    }
  });
  document.getElementById('btn-clear-selection').addEventListener('click',()=>{S.selectedIds.clear();renderBulkBar();render();});

  // Form Modal
  document.getElementById('btn-close-form').addEventListener('click',closeForm);
  document.getElementById('btn-cancel-form').addEventListener('click',closeForm);
  document.getElementById('btn-submit-form').addEventListener('click',submitForm);
  document.getElementById('modal-form').addEventListener('click',e=>{if(e.target===document.getElementById('modal-form')) closeForm();});

  // Auto-compute remaining
  document.getElementById('f-currency').addEventListener('change',e=>{
    changeMoneyFormCurrency(e.target.value);
  });
  const tot=document.getElementById('f-totalAmount');
  const paid=document.getElementById('f-paid');
  tot.addEventListener('input',recalcMoneyFields);
  paid.addEventListener('input',recalcMoneyFields);

  // Alert date change — schedule notification
  document.getElementById('f-alertDate').addEventListener('change',()=>{
    if(getNotifPermission()==='default') showNotifBanner();
  });

  // Detail Modal
  document.getElementById('btn-close-detail').addEventListener('click',closeDetail);
  document.getElementById('modal-detail').addEventListener('click',e=>{if(e.target===document.getElementById('modal-detail')) closeDetail();});
  document.getElementById('btn-detail-edit').addEventListener('click',()=>{
    const o=S.orders.find(x=>x.id===S.viewingId);
    if(o){closeDetail();openFormEdit(o);}
  });
  document.getElementById('btn-detail-print').addEventListener('click',()=>{
    const o=S.orders.find(x=>x.id===S.viewingId); if(o) printSingle(o);
  });
  document.getElementById('btn-detail-duplicate').addEventListener('click',()=>{
    if(S.viewingId){duplicateOrder(S.viewingId);closeDetail();}
  });

  // Import Modal
  document.getElementById('btn-import-merge').addEventListener('click',()=>confirmImport('merge'));
  document.getElementById('btn-import-replace').addEventListener('click',()=>confirmImport('replace'));
  document.getElementById('btn-import-cancel').addEventListener('click',closeImportModal);
  document.getElementById('modal-import').addEventListener('click',e=>{if(e.target===document.getElementById('modal-import')) closeImportModal();});

  // Notification banner
  document.getElementById('btn-enable-notif').addEventListener('click',requestNotifPermission);
  document.getElementById('btn-dismiss-notif').addEventListener('click',()=>{
    document.getElementById('notif-banner').classList.add('hidden');
    localStorage.setItem(K.NOTIF_DISMISSED,'true');
  });

  // Alerts indicator click
  document.getElementById('alerts-indicator').addEventListener('click',()=>{
    S.filters.status=''; S.filters.delayedOnly=false;
    const hasAlerts=S.orders.some(o=>o.alertNote&&o.status!=='مكتمل'&&o.status!=='ملغي');
    if(hasAlerts) showToast('اضغط على البطاقات ذات التنبيه للمزيد','info');
  });

  // Scroll to top
  window.addEventListener('scroll',()=>{
    document.getElementById('btn-scroll-top').classList.toggle('hidden',window.scrollY<=300);
  });
  document.getElementById('btn-scroll-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  // Keyboard shortcuts
  document.addEventListener('keydown',e=>{
    const fOpen=!document.getElementById('modal-form').classList.contains('hidden');
    const dOpen=!document.getElementById('modal-detail').classList.contains('hidden');
    const iOpen=!document.getElementById('modal-import').classList.contains('hidden');
    if(e.key==='Escape'){
      if(!getStatusMenuEl()?.classList.contains('hidden')){closeStatusMenu();return;}
      if(fOpen){closeForm();return;}
      if(dOpen){closeDetail();return;}
      if(iOpen){closeImportModal();return;}
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='n'&&!fOpen&&!dOpen){e.preventDefault();openFormNew();}
    if((e.ctrlKey||e.metaKey)&&e.key==='e'&&!fOpen&&!dOpen){e.preventDefault();exportToExcel(S.orders);showToast('تم التصدير بنجاح','success');}
  });
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
async function init() {
  // Load data
  S.orders = loadOrders();
  loadPrefs();
  migrateOrdersCurrencyData();
  syncOrderNumbers();
  updateCurrencyUI();

  // Apply dark mode
  applyDark();
  applyHeaderCollapsed();

  // Today's date
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Register Service Worker
  await registerSW();

  // Bind all events
  bindEvents();

  // Initial render
  render();

  // Check notifications after short delay
  setTimeout(()=>{
    const perm=getNotifPermission();
    if(perm==='granted') { scheduleAllAlerts(); startAlertPoller(); }
    else if(perm==='default') showNotifBanner();
  }, 1500);
}

document.addEventListener('DOMContentLoaded', init);
