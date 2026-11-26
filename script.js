/* =========================================================
   1277Foods — script.js
   File này vừa là mã chạy trang web, vừa là Service Worker
   (giúp trang mở được và dùng được khi KHÔNG có mạng).
   ========================================================= */
'use strict';

/* ⬇️ DÁN ĐƯỜNG LINK APPS SCRIPT (URL ứng dụng web, đuôi /exec) VÀO GIỮA HAI DẤU NGOẶC KÉP ⬇️ */
const SCRIPT_URL = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4bkZSeVUxcXVLdDBDLW55MTIzazlxZHgtUGR4VTRxLWxRbGlxWkRBdEJXTjAyMktvY1ZYSTYxU1gwYmhOSmNBWlIvZXhlYw==";
/* (Có thể dán link thường, hoặc link đã mã hoá Base64 nếu không muốn lộ link.) */

const APP_CACHE = '1277foods-cache-v1';

if (typeof window === 'undefined') {
  /* ================= SERVICE WORKER (chạy nền, offline) ================= */
  const CORE = ['./', './index.html', './style.css', './script.js'];
  const CDN_HOSTS = ['i.ibb.co', 'fonts.googleapis.com', 'fonts.gstatic.com'];

  self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open(APP_CACHE)
        .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
        .then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (e) => {
    e.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith('1277foods-cache') && k !== APP_CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'precache' && Array.isArray(d.urls)) {
      e.waitUntil(caches.open(APP_CACHE).then((c) => Promise.all(d.urls.map(async (u) => {
        try {
          if (await c.match(u)) return;
          const res = await fetch(u, { mode: 'no-cors' });
          if (res && (res.ok || res.type === 'opaque')) await c.put(u, res);
        } catch (err) { /* bỏ qua */ }
      }))));
    }
  });

  self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch (err) { return; }

    /* Lượt truy cập: luôn lấy từ mạng, không lưu cache */
    if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

    if (url.origin === self.location.origin) {
      /* File của trang: ưu tiên mạng (để luôn mới), mất mạng thì lấy bản đã lưu */
      e.respondWith(
        fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(APP_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() =>
          caches.match(req, { ignoreSearch: true }).then((r) => r ||
            (req.mode === 'navigate' ? caches.match('./index.html').then((x) => x || caches.match('./')) : Response.error()))
        )
      );
      return;
    }

    /* Ảnh tải kiểu CORS (để tạo ảnh chia sẻ) thì lấy thẳng từ mạng */
    if (url.hostname === 'i.ibb.co' && req.mode === 'cors') return;

    if (CDN_HOSTS.includes(url.hostname)) {
      /* Ảnh món ăn & phông chữ: ưu tiên bản đã lưu (chạy offline) */
      e.respondWith(
        caches.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(APP_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }))
      );
    }
  });

  self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const target = (e.notification.data && e.notification.data.url) || './';
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        for (const c of list) {
          if ('focus' in c) { if ('navigate' in c && target !== './') c.navigate(target).catch(() => {}); return c.focus(); }
        }
        return self.clients.openWindow ? self.clients.openWindow(target) : null;
      })
    );
  });
} else {
(function () {
/* ================= ỨNG DỤNG ================= */

/* ---------- Tiện ích ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const fmt = (n) => '₫' + Math.round(n).toLocaleString('en-US');
const fmtRating = (r) => Number(r).toFixed(1).replace('.', ',');
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const now = () => Date.now();
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function ago(t) {
  const s = Math.max(0, Math.floor((now() - t) / 1000));
  if (s < 10) return 'vừa xong';
  if (s < 60) return s + ' giây trước';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' phút trước';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' giờ trước';
  const d = Math.floor(h / 24);
  if (d < 7) return d + ' ngày trước';
  return new Date(t).toLocaleDateString('vi-VN');
}
function dateTime(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} • ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function mmss(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function rndStr(n, chars) {
  chars = chars || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const out = [];
  const buf = new Uint32Array(n);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 4294967296);
  for (let i = 0; i < n; i++) out.push(chars[buf[i] % chars.length]);
  return out.join('');
}
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return rndStr(8, '0123456789abcdef') + '-' + rndStr(4, '0123456789abcdef') + '-' + rndStr(4, '0123456789abcdef') + '-' + rndStr(12, '0123456789abcdef');
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const pageUrl = () => location.origin + location.pathname;

/* ---------- Icon (SVG) ---------- */
const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3h2.6l2.4 11.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.5L21.5 7H6"/>',
  cartPlus: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3h2.6l2.4 11.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.5L21.5 7H6"/><path d="M13.5 8v5M11 10.5h5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  sort: '<path d="m3 8 4-4 4 4M7 4v16M21 16l-4 4-4-4M17 20V4"/>',
  sortDown: '<path d="m3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4"/>',
  sortUp: '<path d="m3 8 4-4 4 4M7 4v16M11 12h4M11 16h7M11 20h10"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20.5h.01M17.5 17.5H21V21h-3.5z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="16" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="16" r="1.4" fill="currentColor"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16.5 9.5"/>',
  receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8M7.5 5.5l9 5"/>',
  bike: '<circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M5.5 17h6l2.5-6h3l1.5 6M14 11l-1.5-4H10M16 7h2"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h.01"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  bank: '<path d="M3 10h18L12 4zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.5-2.6-1.5M12 6.5V8M12 16v1.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  draft: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Dữ liệu món ăn ---------- */
const MENU = [
  { id: 1, name: 'Phở bò', cat: 'bun', emoji: '🍜', rating: 5.0, price: 20000,
    img: 'https://i.ibb.co/G3RzLjMR/8ce5f8f6be5bef52542fd1aa5a12aca3.jpg',
    desc: 'Nước dùng hầm xương thơm quế hồi, bánh phở mềm cùng thịt bò ngọt mềm.',
    giavi: [['Chanh', 2000], ['Ớt tươi', 1000], ['Tương ớt', 2000], ['Tương đen', 2000]],
    ankem: [['Giá đỗ', 5000], ['Húng quế', 3000], ['Ngò gai', 2000], ['Hành lá, hành tây', 3000]] },
  { id: 2, name: 'Phở gà', cat: 'bun', emoji: '🍜', rating: 4.8, price: 50000,
    img: 'https://i.ibb.co/PskMvYD7/ef42d2b194710449677cd9dc51952a25.jpg',
    desc: 'Nước dùng gà thanh ngọt, thịt gà xé dai thơm, rắc hành lá tươi.',
    giavi: [['Chanh', 2000], ['Ớt tươi', 1000], ['Tiêu', 2000], ['Nước mắm', 2000]],
    ankem: [['Rau răm', 3000], ['Giá đỗ', 5000], ['Hành lá', 2000], ['Hành tây', 3000]] },
  { id: 3, name: 'Bánh mì thịt', cat: 'banh', emoji: '🥖', rating: 4.8, price: 35000,
    img: 'https://i.ibb.co/MxCsggdB/b6535a782fa6fb6e1991c15b44379edb.jpg',
    desc: 'Vỏ bánh giòn rụm, nhân thịt đậm đà, pate béo ngậy và rau thơm.',
    giavi: [['Tương ớt', 2000], ['Mayonnaise', 3000], ['Nước tương', 2000], ['Tiêu', 2000]],
    ankem: [['Dưa leo', 3000], ['Đồ chua', 5000], ['Ngò rí', 2000], ['Ớt tươi', 1000]] },
  { id: 4, name: 'Gỏi cuốn tôm thịt', cat: 'banh', emoji: '🥢', rating: 4.5, price: 45000,
    img: 'https://i.ibb.co/gMVgyh22/f7576bc886c91729b6853c4ae1fc91db-1.jpg',
    desc: 'Bánh tráng cuốn tôm, thịt luộc, bún và rau sống tươi mát.',
    giavi: [['Tương đậu phộng', 5000], ['Nước mắm', 2000], ['Chanh', 2000], ['Ớt tươi', 1000]],
    ankem: [['Rau sống', 5000], ['Xà lách', 3000], ['Hẹ', 2000], ['Bún tươi', 5000]] },
  { id: 5, name: 'Chả giò', cat: 'banh', emoji: '🥟', rating: 4.5, price: 50000,
    img: 'https://i.ibb.co/8GRQkdN/4543600e5521f8a2a5495edfabefd796.jpg',
    desc: 'Lớp vỏ chiên vàng giòn, nhân thịt, miến, mộc nhĩ đậm đà.',
    giavi: [['Nước mắm chua ngọt', 3000], ['Tương ớt', 2000], ['Ớt tươi', 1000], ['Tiêu', 2000]],
    ankem: [['Xà lách', 3000], ['Rau thơm', 3000], ['Dưa leo', 3000], ['Đồ chua', 5000]] },
  { id: 6, name: 'Bún chả', cat: 'bun', emoji: '🍢', rating: 4.3, price: 35000,
    img: 'https://i.ibb.co/8qmvXyJ/2f31148eb0fc332cbc552e720ad9bbfd.jpg',
    desc: 'Chả nướng than hoa thơm lừng, chấm nước mắm chua ngọt.',
    giavi: [['Nước mắm chua ngọt', 3000], ['Tỏi', 2000], ['Ớt tươi', 1000], ['Tiêu', 2000]],
    ankem: [['Bún tươi', 5000], ['Rau sống', 5000], ['Xà lách', 3000], ['Dưa leo', 3000]] },
  { id: 7, name: 'Bún bò Huế', cat: 'bun', emoji: '🌶️', rating: 4.9, price: 65000,
    img: 'https://i.ibb.co/pv9QhK4G/5fc8a0e23bae27ed6a2a5e71d03fda28.jpg',
    desc: 'Nước dùng đậm vị sả và mắm ruốc, sợi bún to, cay nồng xứ Huế.',
    giavi: [['Chanh', 2000], ['Sa tế', 3000], ['Nước mắm', 2000], ['Tiêu', 2000]],
    ankem: [['Rau muống bào', 5000], ['Bắp chuối bào', 5000], ['Giá đỗ', 5000], ['Rau thơm', 3000]] },
  { id: 8, name: 'Bún riêu', cat: 'bun', emoji: '🦀', rating: 4.2, price: 55000,
    img: 'https://i.ibb.co/dwC9rbCM/8fd71ff79967d4f3637eb280d893d3d3.jpg',
    desc: 'Riêu cua béo ngậy, cà chua chua dịu, nước dùng đỏ au.',
    giavi: [['Chanh', 2000], ['Mắm tôm', 3000], ['Ớt tươi', 1000], ['Tiêu', 2000]],
    ankem: [['Giá đỗ', 5000], ['Rau muống bào', 5000], ['Rau thơm', 3000], ['Bắp chuối bào', 5000]] },
  { id: 9, name: 'Bún mắm', cat: 'bun', emoji: '🐟', rating: 4.2, price: 50000,
    img: 'https://i.ibb.co/cXkXMCqh/4d042cf5df1726fc037ed775146f6933.jpg',
    desc: 'Nước lèo mắm cá thơm nồng, đậm đà kiểu miền Tây.',
    giavi: [['Chanh', 2000], ['Ớt tươi', 1000], ['Mắm nguyên chất', 3000], ['Tiêu', 2000]],
    ankem: [['Rau muống bào', 5000], ['Bắp chuối bào', 5000], ['Rau thơm', 3000], ['Giá đỗ', 5000]] },
  { id: 10, name: 'Bún cá', cat: 'bun', emoji: '🐠', rating: 4.3, price: 50000,
    img: 'https://i.ibb.co/LDbw04wf/045fbb9728ca44527dc8401a2d443242.jpg',
    desc: 'Chả cá chiên thơm, nước dùng thanh ngọt, ăn kèm rau tươi.',
    giavi: [['Chanh', 2000], ['Ớt tươi', 1000], ['Nước mắm', 2000], ['Tiêu', 2000]],
    ankem: [['Rau thơm', 3000], ['Giá đỗ', 5000], ['Bắp chuối bào', 5000], ['Rau muống bào', 5000]] }
];
const byId = (id) => MENU.find((d) => d.id === Number(id));

const CATS = {
  bun: { title: 'Bún/Mì/Phở', emoji: '🍜' },
  com: { title: 'Cơm', emoji: '🍚' }
};

const PAYS = [
  { k: 'cod', n: 'Thanh toán khi nhận hàng', icon: 'cash' },
  { k: 'wallet', n: 'Ví điện tử 1277Pay (ảo)', icon: 'wallet' },
  { k: 'card', n: 'Thẻ tín dụng / ghi nợ (ảo)', icon: 'card' },
  { k: 'bank', n: 'Chuyển khoản ngân hàng (ảo)', icon: 'bank' },
  { k: 'xu', n: 'Xu 1277 (ảo)', icon: 'coin' }
];
const payName = (k) => (PAYS.find((p) => p.k === k) || PAYS[0]).n;

const SYS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
const FONTS = [
  { k: 'system', n: 'Phông chữ hệ thống' },
  { k: 'bevn', n: 'Be Vietnam Pro', g: 'Be+Vietnam+Pro:wght@400;500;700;800' },
  { k: 'nunito', n: 'Nunito', g: 'Nunito:wght@400;600;800' },
  { k: 'quicksand', n: 'Quicksand', g: 'Quicksand:wght@400;600;700' },
  { k: 'montserrat', n: 'Montserrat', g: 'Montserrat:wght@400;600;800' },
  { k: 'roboto', n: 'Roboto', g: 'Roboto:wght@400;500;700;900' },
  { k: 'lexend', n: 'Lexend', g: 'Lexend:wght@400;600;800' },
  { k: 'comfortaa', n: 'Comfortaa', g: 'Comfortaa:wght@400;600;700' },
  { k: 'baloo', n: 'Baloo 2', g: 'Baloo+2:wght@400;600;800' },
  { k: 'lora', n: 'Lora', g: 'Lora:wght@400;600;700' },
  { k: 'playfair', n: 'Playfair Display', g: 'Playfair+Display:wght@400;700;800' },
  { k: 'merri', n: 'Merriweather', g: 'Merriweather:wght@400;700;900' },
  { k: 'dancing', n: 'Dancing Script', g: 'Dancing+Script:wght@400;700' },
  { k: 'pacifico', n: 'Pacifico', g: 'Pacifico' },
  { k: 'patrick', n: 'Patrick Hand', g: 'Patrick+Hand' }
];
const fontStack = (f) => (f && f.g ? `'${f.n}', ${SYS_FONT}` : SYS_FONT);

/* ---------- Lưu trữ an toàn trên trình duyệt ---------- */
const KEY = '1277foods.v1';
const DEF = {
  theme: 'system', font: 'system', fontScale: 0, sort: 'none',
  cart: [], recent: [], orders: [], drafts: [], checkout: null,
  vid: '', visitDone: false, lastCount: null, ordersTab: 'coming'
};
function loadState() {
  for (const k of [KEY, KEY + '.bak']) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        const s = Object.assign(clone(DEF), o);
        ['cart', 'recent', 'orders', 'drafts'].forEach((a) => { if (!Array.isArray(s[a])) s[a] = []; });
        s.cart = s.cart.filter((l) => l && byId(l.id) && l.qty > 0);
        return s;
      }
    } catch (e) { /* thử bản sao lưu */ }
  }
  return clone(DEF);
}
let S = loadState();
let memOnly = false;
function save() {
  try {
    const raw = JSON.stringify(S);
    localStorage.setItem(KEY, raw);
    localStorage.setItem(KEY + '.bak', raw);
  } catch (e) {
    if (!memOnly) { memOnly = true; console.warn('Không lưu được vào trình duyệt:', e); }
  }
}

/* Trạng thái tạm (không cần lưu) */
const UI = { q: '', open: new Set(), sel: null, soft: false, trackStage: -1, rndId: null, spinning: false };

/* ---------- Giỏ hàng ---------- */
const lineKey = (id, gv, ak) => `${id}|${[...gv].sort((a, b) => a - b).join(',')}|${[...ak].sort((a, b) => a - b).join(',')}`;
function unitPrice(l) {
  const d = byId(l.id);
  if (!d) return 0;
  let p = d.price;
  (l.giavi || []).forEach((i) => { if (d.giavi[i]) p += d.giavi[i][1]; });
  (l.ankem || []).forEach((i) => { if (d.ankem[i]) p += d.ankem[i][1]; });
  return p;
}
function optText(l) {
  const d = byId(l.id);
  if (!d) return '';
  const g = (l.giavi || []).map((i) => d.giavi[i] && d.giavi[i][0]).filter(Boolean);
  const a = (l.ankem || []).map((i) => d.ankem[i] && d.ankem[i][0]).filter(Boolean);
  return `Gia vị: ${g.length ? g.join(', ') : 'Không có'} • Ăn kèm: ${a.length ? a.join(', ') : 'Không có'}`;
}
const cartCount = () => S.cart.reduce((a, l) => a + l.qty, 0);
const activeOrders = () => S.orders.filter((o) => stageOf(o) < 3);

function stageOf(o, t) {
  const e = (t || now()) - o.created;
  return e < o.t1 ? 0 : e < o.t2 ? 1 : e < o.t3 ? 2 : 3;
}
const STAGES = [
  { t: 'Chờ xác nhận', s: 'Quán 1277 đang xác nhận đơn của bạn', icon: 'receipt' },
  { t: 'Chờ lấy hàng', s: 'Bếp đang nấu, tài xế đang tới quán lấy món', icon: 'package' },
  { t: 'Chờ giao hàng', s: 'Tài xế đang chạy tới Nhà mình', icon: 'bike' },
  { t: 'Đã giao hàng thành công', s: 'Chúc bạn ngon miệng! 😋', icon: 'checkc' }
];

/* ---------- Mã QR (tự tạo, không cần mạng) ---------- */
const QR = (() => {
  const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  const BLK_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

  function rawModules(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const na = Math.floor(v / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_M[v] * BLK_M[v];

  function gmul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(deg) {
    const r = new Array(deg).fill(0);
    r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = gmul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gmul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      for (let i = 0; i < div.length; i++) r[i] ^= gmul(div[i], f);
    }
    return r;
  }

  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 1;
    for (; ver <= 40; ver++) {
      const ccBits = ver <= 9 ? 8 : 16;
      if (4 + ccBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 40) throw new Error('Dữ liệu quá dài cho mã QR');
    const ccBits = ver <= 9 ? 8 : 16;
    const cap = dataCodewords(ver) * 8;
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, ccBits);
    bytes.forEach((b) => put(b, 8));
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) put(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data.push(b);
    }

    /* Thêm mã sửa lỗi và đan xen */
    const nb = BLK_M[ver], eccLen = ECC_M[ver];
    const rawCw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - rawCw % nb;
    const shortLen = Math.floor(rawCw / nb);
    const div = rsDivisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });
    }

    /* Vẽ ma trận */
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setF = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };

    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver > 1) {
      const na = Math.floor(ver / 7) + 2;
      const step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      const pos = [6];
      for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
          setF(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const drawFormat = (mask) => {
      const d = (0 << 3) | mask; /* mức sửa lỗi M = 00 */
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      const g = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) setF(8, i, g(i));
      setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, g(i));
      setF(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const bit = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3);
        setF(a, c, bit); setF(c, a, bit);
      }
    }
    /* Đặt dữ liệu */
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && bi < all.length * 8) { mod[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
      }
    }
    const maskFn = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
    ];
    const applyMask = (m) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
        if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x];
    };
    const penalty = () => {
      let p = 0, dark = 0;
      for (let y = 0; y < size; y++) {
        let rc = 1, cc = 1;
        for (let x = 0; x < size; x++) {
          if (mod[y][x]) dark++;
          if (x > 0) {
            if (mod[y][x] === mod[y][x - 1]) { rc++; if (rc === 5) p += 3; else if (rc > 5) p++; } else rc = 1;
            if (mod[x][y] === mod[x - 1][y]) { cc++; if (cc === 5) p += 3; else if (cc > 5) p++; } else cc = 1;
          }
          if (x < size - 1 && y < size - 1) {
            const c = mod[y][x];
            if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
          }
        }
      }
      const total = size * size;
      p += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      const pn = penalty();
      if (pn < bestP) { bestP = pn; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { size, get: (x, y) => mod[y][x] };
  }

  function draw(canvas, text, scale) {
    const q = encode(text);
    const border = 4, s = scale || 8, n = q.size + border * 2;
    canvas.width = n * s; canvas.height = n * s;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, n * s, n * s);
    c.fillStyle = '#111111';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++)
      if (q.get(x, y)) c.fillRect((x + border) * s, (y + border) * s, s, s);
    return canvas;
  }
  return { encode, draw };
})();

/* ---------- Thành phần giao diện dùng chung ---------- */
function img(d, extra = '') {
  const lazy = extra.includes('loading=') ? '' : 'loading="lazy"';
  return `<img src="${esc(d.img)}" alt="${esc(d.name)}" ${lazy} decoding="async" referrerpolicy="no-referrer" ${extra} onload="this.parentNode.classList.add('ok')" onerror="this.classList.add('err');this.parentNode.classList.add('ok')">`;
}
const ph = (d, cls = '', attrs = '') => `<div class="ph ${cls}" data-e="${d.emoji}" ${attrs}>${img(d)}</div>`;
function stars(r) {
  return `<span class="stars" style="--p:${clamp(r / 5 * 100, 0, 100)}%" aria-label="${fmtRating(r)} sao"><span class="s-bg">★★★★★</span><span class="s-fg">★★★★★</span></span>`;
}
function cartBtn() {
  const n = cartCount();
  return `<button class="cart-btn" data-go="#/cart" aria-label="Giỏ hàng">${ic('cart')}<span class="badge ${n ? '' : 'hide'}" data-cartn>${n > 99 ? '99+' : n}</span></button>`;
}
function topbar(title, opt = {}) {
  return `<header class="topbar"><div class="tb-in">
    <button class="tb-back" data-act="back" aria-label="Quay lại">${ic('back')}<span>Quay lại</span></button>
    <h1 class="tb-title">${esc(title)}</h1>
    ${opt.noCart ? '<span class="tb-sp"></span>' : cartBtn()}
  </div></header>`;
}
const pageCls = () => 'wrap page' + (UI.soft ? '' : ' anim');
function footer() {
  return `<footer class="ftr">
    <div>© ${new Date().getFullYear()} 🍜 1277<b>Foods</b> — Trang giả lập vui vẻ: không giao hàng thật, không thu tiền thật.</div>
    <div class="net" id="netState">${navigator.onLine ? '<i class="dot live"></i> Đang trực tuyến' : '<i class="dot off"></i> Ngoại tuyến – vẫn dùng bình thường'}</div>
  </footer>`;
}
function emptyBox(e, t, s, btn = '') {
  return `<div class="empty"><div class="empty-e">${e}</div><h3>${t}</h3><p>${s}</p>${btn}</div>`;
}

function card(d, i = 0) {
  return `<article class="card" style="--d:${Math.min(i, 12) * 45}ms">
    <div class="card-img ph" data-e="${d.emoji}" data-go="#/dish/${d.id}" role="link" tabindex="0" aria-label="Xem ${esc(d.name)}">
      ${img(d)}<span class="rate-chip">${ic('star', 'fill')} ${fmtRating(d.rating)}</span>
    </div>
    <div class="card-b">
      <h3 class="card-n" data-go="#/dish/${d.id}">${esc(d.name)}</h3>
      <div class="stars-row">${stars(d.rating)} <b>${fmtRating(d.rating)}</b></div>
      <div class="card-f">
        <span class="price">${fmt(d.price)}</span>
        <button class="add-mini" data-act="quickadd" data-v="${d.id}" aria-label="Thêm ${esc(d.name)} vào giỏ">${ic('plus')}</button>
      </div>
    </div>
  </article>`;
}
function sortList(list) {
  const a = list.slice();
  if (S.sort === 'desc') a.sort((x, y) => y.price - x.price || x.id - y.id);
  else if (S.sort === 'asc') a.sort((x, y) => x.price - y.price || x.id - y.id);
  return a;
}
function filterQ(list, q) {
  const n = norm(q);
  if (!n) return list;
  return list.filter((d) => norm(d.name).includes(n) || norm(d.desc).includes(n) ||
    d.giavi.concat(d.ankem).some((o) => norm(o[0]).includes(n)));
}
function gridHtml(list, q) {
  if (!list.length) {
    return q ? `<div style="grid-column:1/-1">${emptyBox('🔍', 'Không tìm thấy món nào', `Không có món phù hợp với “${esc(q)}”. Thử từ khoá khác nhé!`)}</div>`
             : `<div style="grid-column:1/-1">${emptyBox('🍽️', 'Chưa có món', 'Danh sách đang trống.')}</div>`;
  }
  return list.map(card).join('');
}

function acc(id, icon, title, body, opt = {}) {
  const open = UI.open.has(id);
  return `<div class="acc ${opt.sub ? 'sub' : ''} ${open ? 'open' : ''}" data-acc="${id}">
    <button class="acc-h" data-act="acc" data-v="${id}" aria-expanded="${open}">
      <span class="acc-ic">${ic(icon)}</span>
      <span class="acc-t">${title}${opt.sub_t ? `<small>${opt.sub_t}</small>` : ''}</span>
      <span class="acc-chev">${ic('down')}</span>
    </button>
    <div class="acc-b"><div class="acc-in">${body}</div></div>
  </div>`;
}
function opt(act, v, label, on, icon = '', style = '') {
  return `<button class="opt ${on ? 'on' : ''}" data-act="${act}" data-v="${v}" ${style ? `style="${style}"` : ''}>
    ${icon ? `<span class="opt-ic">${ic(icon)}</span>` : ''}<span class="opt-t">${label}</span><span class="tick">${ic('check')}</span>
  </button>`;
}
function notifHtml() {
  if (!('Notification' in window)) return `${ic('bell')}<span>Trình duyệt này không hỗ trợ thông báo</span>`;
  const p = Notification.permission;
  if (p === 'granted') return `${ic('bell')}<span>Thông báo giao hàng</span><b class="notif-ok">Đã bật ✓</b>`;
  if (p === 'denied') return `${ic('bell')}<span>Thông báo đang bị chặn – mở cài đặt trang web của trình duyệt để cho phép</span>`;
  return `${ic('bell')}<span>Nhận thông báo khi giao hàng thành công</span><button data-act="notif">Bật</button>`;
}
const fsLabel = () => Math.round((1 + S.fontScale * 0.08) * 100) + '%';

/* ---------- Trang chủ ---------- */
function vHome() {
  const list = sortList(filterQ(MENU, UI.q));
  const act = activeOrders().length;
  const fl = ['🍜', '🥢', '🌶️', '🥖', '🍋', '🦐', '🌿', '🍲'];
  const floaties = fl.map((e, i) => `<span class="floaty" style="left:${[4, 88, 72, 30, 52, 12, 94, 62][i]}%;top:${[8, 12, 70, 82, 6, 58, 48, 38][i]}%;animation-delay:${i * -0.9}s">${e}</span>`).join('');

  const settings = `
    <div class="lbl">Giao diện</div>
    <div class="opts">
      ${opt('theme', 'light', 'Sáng', S.theme === 'light', 'sun')}
      ${opt('theme', 'dark', 'Tối', S.theme === 'dark', 'moon')}
      ${opt('theme', 'system', 'Hệ thống', S.theme === 'system', 'monitor')}
    </div>
    <div class="lbl" style="margin-top:14px">Thông báo</div>
    <div class="notif-row" id="notifRow">${notifHtml()}</div>`;

  const fonts = `
    <div class="opts">${FONTS.map((f) => opt('font', f.k, esc(f.n), S.font === f.k, '', `font-family:${esc(fontStack(f))}`)).join('')}</div>
    <div class="lbl" style="margin-top:14px">Đổi cỡ chữ</div>
    <div class="fs-row">
      <button class="fs-btn" data-act="fs" data-v="-1" aria-label="Giảm cỡ chữ">-A</button>
      <button class="fs-btn ${S.fontScale === 0 ? 'on' : ''}" data-act="fs" data-v="0">Mặc định</button>
      <button class="fs-btn" data-act="fs" data-v="1" aria-label="Tăng cỡ chữ">A+</button>
    </div>
    <div class="fs-val" id="fsVal">Cỡ chữ hiện tại: ${fsLabel()}</div>`;

  const sorts = `<div class="opts">
      ${opt('sort', 'desc', 'Sắp xếp theo giá: Cao đến Thấp', S.sort === 'desc', 'sortDown')}
      ${opt('sort', 'asc', 'Sắp xếp theo giá: Thấp đến Cao', S.sort === 'asc', 'sortUp')}
    </div>`;

  const share = `
    <div class="share-grid">
      <button class="btn btn-red btn-sm" data-act="share">${ic('share')} Chia sẻ ngay</button>
      <button class="btn btn-ghost btn-sm" data-act="copylink">${ic('link')} Sao chép link</button>
    </div>
    ${acc('qr', 'qr', 'Mã QR code', `<div class="qr-box"><canvas id="qrMini" data-act="qrfull" title="Nhấn để mở toàn màn hình" aria-label="Mã QR của trang"></canvas>
      <button class="btn btn-soft btn-sm" data-act="qrfull">${ic('qr')} Mở hình ảnh mã QR</button>
      <div class="qr-link">${esc(pageUrl())}</div></div>`, { sub: true, sub_t: 'Quét để mở trang trên máy khác' })}`;

  const recent = S.recent.slice(0, 10).filter((r) => byId(r.id));
  const recentHtml = recent.length
    ? `<div class="recent-row">${recent.map((r) => { const d = byId(r.id); return `
        <button class="rc" data-go="#/dish/${d.id}">
          ${ph(d)}
          <div class="rc-b"><div class="rc-n">${esc(d.name)}</div>
          <div class="rc-t">${ic('clock')} Đã xem <span data-ago="${r.t}">${ago(r.t)}</span></div></div>
        </button>`; }).join('')}</div>`
    : `<div class="empty-mini">Bạn chưa xem món nào. Chạm vào một món bên dưới để bắt đầu nhé! 👇</div>`;

  return `
  <header class="hdr"><div class="hdr-in">
    <a class="logo" data-go="#/" aria-label="1277Foods – Trang chủ"><span class="logo-ic">🍜</span><span class="logo-t">1277<b>Foods</b></span></a>
    <form class="search" id="searchForm" role="search" autocomplete="off">
      <span class="search-ic">${ic('search')}</span>
      <input id="q" type="search" placeholder="Tìm kiếm" value="${esc(UI.q)}" enterkeyhint="search" aria-label="Tìm kiếm món ăn">
      <button type="submit" class="search-btn">Tìm kiếm</button>
    </form>
    ${cartBtn()}
  </div></header>

  <div class="${pageCls()}">
    <section class="hero">
      ${floaties}
      <div class="hero-txt">
        <h1 class="hero-title">1277Foods | Đặt Đồ Ăn Ảo – Chỉ Vui, Không Lo Gì Cả</h1>
        <p class="hero-desc">Trang web giả lập đặt đồ ăn trực tuyến, nơi bạn tự do xem món, chọn món và tạo đơn hàng theo ý thích. <strong>Hoàn toàn không có giao hàng thật, không có trả tiền thật, không phát sinh chi phí hay nghĩa vụ nào.</strong> Được xây dựng riêng để <strong>thỏa mãn nhu cầu tinh thần:</strong> giải tỏa cơn thèm, thỏa thích xem món ngon, tưởng tượng thưởng thức hay đơn giản chỉ có vài phút trải nghiệm vui vẻ, thoải mái và hoàn toàn không có gánh nặng nào.</p>
      </div>
      <div class="visits" aria-live="polite">
        <div class="v-top">${ic('eye')} Lượt truy cập</div>
        <div class="v-num" id="vNum">${S.lastCount == null ? '—' : Number(S.lastCount).toLocaleString('vi-VN')}</div>
        <div class="v-st" id="vSt">${visitStatusHtml()}</div>
      </div>
    </section>

    <section class="quick">
      <button class="qt stg" style="--d:40ms" data-go="#/orders"><span class="qt-e">🧾</span><span>Đơn hàng</span><span class="badge ${act ? '' : 'hide'}" data-actn>${act}</span></button>
      <button class="qt stg" style="--d:80ms" data-go="#/cat/bun"><span class="qt-e">🍜</span><span>Bún, Mì, Phở</span></button>
      <button class="qt stg" style="--d:120ms" data-go="#/cat/com"><span class="qt-e">🍚</span><span>Cơm</span></button>
      <button class="qt qt-rand stg" style="--d:160ms" data-act="random"><span class="qt-e">${ic('dice')}</span><span>Chọn ngẫu nhiên</span></button>
    </section>

    <section class="tools">
      ${acc('settings', 'gear', 'Cài đặt', settings, { sub_t: 'Sáng / Tối / Hệ thống' })}
      ${acc('font', 'type', 'Đổi phông chữ', fonts, { sub_t: 'Phông chữ & cỡ chữ' })}
      ${acc('sort', 'sort', 'Sắp xếp', sorts, { sub_t: 'Theo giá món ăn' })}
      ${acc('share', 'share', 'Chia sẻ', share, { sub_t: 'Gửi trang & mã QR' })}
    </section>

    <section class="sec">
      <div class="sec-h"><h2>Xem gần đây</h2><button class="more" data-go="#/recent">Xem thêm ${ic('right')}</button></div>
      ${recentHtml}
    </section>

    <section class="sec" id="menu">
      <div class="sec-h"><h2 class="big-h">Món ăn Việt Nam</h2><span class="muted" id="menuCount">${list.length} món</span></div>
      <div class="grid" id="grid">${gridHtml(list, UI.q)}</div>
    </section>
  </div>
  ${footer()}`;
}
function refreshGrid() {
  const g = $('#grid');
  if (!g) return;
  const list = sortList(filterQ(MENU, UI.q));
  g.innerHTML = gridHtml(list, UI.q);
  const c = $('#menuCount');
  if (c) c.textContent = list.length + ' món';
}

/* ---------- Trang danh mục ---------- */
function vCat(c) {
  const info = CATS[c];
  const list = sortList(MENU.filter((d) => d.cat === c));
  const chips = `<div class="sort-chips">
    <button class="chip ${S.sort === 'desc' ? 'on' : ''}" data-act="sort" data-v="desc">${ic('sortDown')} Giá: Cao đến Thấp <span class="tk">${ic('check')}</span></button>
    <button class="chip ${S.sort === 'asc' ? 'on' : ''}" data-act="sort" data-v="asc">${ic('sortUp')} Giá: Thấp đến Cao <span class="tk">${ic('check')}</span></button>
  </div>`;
  const body = list.length
    ? `${chips}<div class="grid" id="grid">${list.map(card).join('')}</div>`
    : emptyBox(info.emoji, `Chưa có món ${info.title}`, `Món ${info.title.toLowerCase()} đang được bếp chuẩn bị, bạn quay lại sau nhé! Trong lúc chờ, xem thử các món khác.`,
      `<button class="btn btn-red" data-go="#/">${ic('home')} Xem món khác</button>`);
  return `${topbar(info.title)}
  <div class="${pageCls()}">
    <div class="sec" style="margin-top:18px">
      <div class="sec-h"><h2 class="big-h">${info.emoji} ${info.title}</h2><span class="muted">${list.length} món</span></div>
      ${body}
    </div>
  </div>${footer()}`;
}

/* ---------- Trang Xem gần đây ---------- */
function vRecent() {
  const list = S.recent.filter((r) => byId(r.id));
  const body = list.length
    ? `<div class="list">${list.map((r, i) => { const d = byId(r.id); return `
        <div class="rrow stg" style="--d:${Math.min(i, 12) * 40}ms" data-go="#/dish/${d.id}" role="link" tabindex="0">
          ${ph(d)}
          <div style="min-width:0"><div class="rr-n">${esc(d.name)}</div>
            <div class="rr-m"><span>${ic('star', 'fill')} <b style="color:var(--text)">${fmtRating(d.rating)}</b></span>${stars(d.rating)}<span class="price" style="font-size:.9rem">${fmt(d.price)}</span></div>
            <div class="rr-m">${ic('clock')} Đã xem <span data-ago="${r.t}">${ago(r.t)}</span></div>
          </div>
          ${ic('right')}
        </div>`; }).join('')}</div>
      <div style="display:flex;justify-content:center;margin-top:18px"><button class="btn btn-soft btn-sm" data-act="r-clear">${ic('trash')} Xóa lịch sử xem</button></div>`
    : emptyBox('👀', 'Chưa xem món nào', 'Các món bạn đã xem sẽ hiện ở đây kèm thời gian xem.', `<button class="btn btn-red" data-go="#/">${ic('home')} Khám phá món ngon</button>`);
  return `${topbar('Xem gần đây')}
  <div class="${pageCls()}">
    <div class="sec" style="margin-top:18px"><div class="sec-h"><h2 class="big-h">Xem gần đây</h2><span class="muted">${list.length} món</span></div>${body}</div>
  </div>${footer()}`;
}
function addRecent(id) {
  S.recent = S.recent.filter((r) => r.id !== id);
  S.recent.unshift({ id, t: now() });
  S.recent = S.recent.slice(0, 40);
  save();
}

/* ---------- Trang chi tiết món ---------- */
const VIEWS = [
  { s: 1, o: '50% 50%' }, { s: 1.6, o: '25% 30%' }, { s: 1.6, o: '75% 65%' }, { s: 2.1, o: '50% 80%' }
];
const viewStyle = (v) => `transform:scale(${v.s});transform-origin:${v.o}`;

function selTotal() {
  const s = UI.sel;
  return unitPrice({ id: s.id, giavi: s.giavi, ankem: s.ankem }) * s.qty;
}
function optGroup(g, title, items, chosen) {
  return `<div class="og">
    <div class="og-h">${title} <small>(chọn nhiều được)</small></div>
    <div class="choices" data-group="${g}">
      <button class="choice ${chosen.length ? '' : 'on'}" data-act="opt" data-g="${g}" data-v="-1">
        <span class="tick">${ic('check')}</span><span class="c-n">Không có</span><span class="c-p">${fmt(0)}</span>
      </button>
      ${items.map((o, i) => `<button class="choice ${chosen.includes(i) ? 'on' : ''}" data-act="opt" data-g="${g}" data-v="${i}">
        <span class="tick">${ic('check')}</span><span class="c-n">${esc(o[0])}</span><span class="c-p">+${fmt(o[1])}</span>
      </button>`).join('')}
    </div>
  </div>`;
}
function vDish(id) {
  const d = byId(id);
  if (!d) return vNotFound();
  if (!UI.sel || UI.sel.id !== d.id) UI.sel = { id: d.id, giavi: [], ankem: [], qty: 1, view: 0 };
  const s = UI.sel;
  return `${topbar(d.name)}
  <div class="${pageCls()} detail">
    <div class="gallery">
      <div class="g-main ph" data-e="${d.emoji}">${img(d, `id="gMain" style="${viewStyle(VIEWS[s.view])}" loading="eager"`)}</div>
      <div class="thumbs">${VIEWS.map((v, i) => `
        <button class="thumb ph ${i === s.view ? 'on' : ''}" data-e="${d.emoji}" data-act="thumb" data-v="${i}" aria-label="Ảnh ${i + 1}">
          ${img(d, `style="${viewStyle(v)}"`)}
        </button>`).join('')}</div>
    </div>
    <div class="info">
      <h1 class="d-name">${esc(d.name)}</h1>
      <div class="d-rate">${ic('star', 'fill')}<b>${fmtRating(d.rating)}</b>${stars(d.rating)}<span class="muted">Đánh giá</span></div>
      <div class="d-price">${fmt(d.price)}</div>
      <p class="d-desc">${esc(d.desc)}</p>
      ${optGroup('giavi', 'Gia vị:', d.giavi, s.giavi)}
      ${optGroup('ankem', 'Ăn kèm:', d.ankem, s.ankem)}
      <div class="qty-row"><span>Số lượng</span>
        <div class="stepper"><button data-act="qty" data-v="-1" aria-label="Giảm">${ic('minus')}</button><output id="dQty">${s.qty}</output><button data-act="qty" data-v="1" aria-label="Tăng">${ic('plus')}</button></div>
      </div>
      <div class="buybar">
        <div class="bb-total"><small>Tạm tính</small><b id="dTotal">${fmt(selTotal())}</b></div>
        <button class="btn btn-ghost" data-act="addcart">${ic('cartPlus')} Thêm vào Giỏ hàng</button>
        <button class="btn btn-red" data-act="buynow">Mua ngay</button>
      </div>
    </div>
  </div>${footer()}`;
}
function refreshDetail() {
  const s = UI.sel;
  if (!s) return;
  ['giavi', 'ankem'].forEach((g) => {
    $$(`.choices[data-group="${g}"] .choice`).forEach((b) => {
      const v = Number(b.dataset.v);
      b.classList.toggle('on', v < 0 ? s[g].length === 0 : s[g].includes(v));
    });
  });
  const q = $('#dQty'); if (q) q.textContent = s.qty;
  const t = $('#dTotal'); if (t) t.textContent = fmt(selTotal());
  const m = $('#gMain'); if (m) m.style.cssText = viewStyle(VIEWS[s.view]);
  $$('.thumb').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === s.view));
}
function vNotFound() {
  return `${topbar('Không tìm thấy')}<div class="${pageCls()}">${emptyBox('🤔', 'Không tìm thấy trang', 'Trang bạn mở không tồn tại hoặc đã bị xoá.', `<button class="btn btn-red" data-go="#/">${ic('home')} Về trang chủ</button>`)}</div>${footer()}`;
}

function addToCart(id, giavi, ankem, qty) {
  const key = lineKey(id, giavi, ankem);
  const ex = S.cart.find((l) => l.key === key);
  if (ex) ex.qty = clamp(ex.qty + qty, 1, 99);
  else S.cart.unshift({ key, id: Number(id), giavi: [...giavi].sort((a, b) => a - b), ankem: [...ankem].sort((a, b) => a - b), qty: clamp(qty, 1, 99), checked: false, added: now() });
  save();
  updateBadges(true);
}

/* ---------- Giỏ hàng ---------- */
function vCart() {
  const n = cartCount();
  if (!S.cart.length) {
    return `${topbar('Giỏ hàng (0)', { noCart: true })}<div class="${pageCls()}">${emptyBox('🛒', 'Giỏ hàng đang trống', 'Thêm vài món ngon vào giỏ rồi quay lại đây nhé!', `<button class="btn btn-red" data-go="#/">${ic('home')} Khám phá món ngon</button>`)}</div>${footer()}`;
  }
  const sel = S.cart.filter((l) => l.checked);
  const all = sel.length === S.cart.length;
  const total = sel.reduce((a, l) => a + unitPrice(l) * l.qty, 0);
  const selQty = sel.reduce((a, l) => a + l.qty, 0);
  return `${topbar(`Giỏ hàng (${n})`, { noCart: true })}
  <div class="${pageCls()}">
    <div class="list">${S.cart.map((l, i) => { const d = byId(l.id); return `
      <div class="citem stg ${l.checked ? 'sel' : ''}" style="--d:${Math.min(i, 10) * 40}ms">
        <button class="chk-btn" data-act="c-check" data-v="${esc(l.key)}" aria-label="Chọn món"><span class="chk ${l.checked ? 'on' : ''}">${ic('check')}</span></button>
        ${ph(d, '', `data-go="#/dish/${d.id}"`)}
        <div class="ci-b">
          <div class="ci-n" data-go="#/dish/${d.id}">${esc(d.name)}</div>
          <div class="ci-o">${esc(optText(l))}</div>
          <div class="ci-f">
            <span class="price">${fmt(unitPrice(l))}</span>
            <div class="ci-act">
              <div class="stepper sm"><button data-act="c-qty" data-k="${esc(l.key)}" data-v="-1" aria-label="Giảm">${ic('minus')}</button><output>${l.qty}</output><button data-act="c-qty" data-k="${esc(l.key)}" data-v="1" aria-label="Tăng">${ic('plus')}</button></div>
              <button class="icon-btn" data-act="c-del" data-v="${esc(l.key)}" aria-label="Xóa món">${ic('trash')}</button>
            </div>
          </div>
        </div>
      </div>`; }).join('')}</div>
    <div class="cartbar">
      <button class="chk-all" data-act="c-all"><span class="chk ${all ? 'on' : ''}">${ic('check')}</span> Tất cả</button>
      <div class="cb-total"><small>Tổng cộng</small><b>${fmt(total)}</b></div>
      <button class="btn btn-red" data-act="c-buy">Mua hàng (${selQty})</button>
    </div>
  </div>${footer()}`;
}

/* ---------- Thanh toán ---------- */
function coItems() {
  return (S.checkout && Array.isArray(S.checkout.items) ? S.checkout.items : []).filter((l) => byId(l.id) && l.qty > 0);
}
function vCheckout() {
  const items = coItems();
  if (!items.length) {
    return `${topbar('Thanh toán')}<div class="${pageCls()}">${emptyBox('🧾', 'Chưa có món để thanh toán', 'Hãy chọn món trong giỏ hàng hoặc bấm “Mua ngay” ở một món bất kỳ.', `<button class="btn btn-red" data-go="#/cart">${ic('cart')} Tới giỏ hàng</button>`)}</div>${footer()}`;
  }
  const pay = S.checkout.pay || 'cod';
  const sub = items.reduce((a, l) => a + unitPrice(l) * l.qty, 0);
  const qty = items.reduce((a, l) => a + l.qty, 0);
  return `${topbar('Thanh toán')}
  <div class="${pageCls()}">
    <div class="co-grid">
      <div class="stack" style="padding-top:0">
        <div class="box addr stg">
          <div class="addr-ic">${ic('pin')}</div>
          <div><div class="addr-t">Địa chỉ Giao hàng:</div><div class="addr-v">Nhà mình 🏠</div>
          <div class="addr-n">Địa chỉ tượng trưng – trang không dùng địa chỉ thật của bạn hay của bất kỳ ai.</div></div>
        </div>
        <div class="box stg" style="--d:60ms">
          <div class="box-h">${ic('receipt')} Món đã chọn (${qty})</div>
          ${items.map((l) => { const d = byId(l.id); return `
            <div class="oitem">${ph(d)}
              <div style="min-width:0"><div class="oi-n">${esc(d.name)}</div><div class="oi-o">${esc(optText(l))}</div></div>
              <div class="oi-r"><span class="price">${fmt(unitPrice(l))}</span><span class="oi-q">x${l.qty}</span></div>
            </div>`; }).join('')}
        </div>
        <div class="box stg" style="--d:120ms">
          <div class="box-h">${ic('wallet')} Phương thức thanh toán</div>
          <div class="pays">${PAYS.map((p) => opt('pay', p.k, esc(p.n), p.k === pay, p.icon)).join('')}</div>
        </div>
      </div>
      <div class="co-side">
        <div class="box stg" style="--d:160ms">
          <div class="sum">
            <div class="sum-r"><span>Tạm tính (${qty} món)</span><b>${fmt(sub)}</b></div>
            <div class="sum-r"><span>Phí giao hàng</span><b class="free">Miễn phí</b></div>
            <div class="sum-r"><span>Giảm giá</span><b>${fmt(0)}</b></div>
            <div class="sum-r tot"><span>Tổng cộng</span><b>${fmt(sub)}</b></div>
          </div>
        </div>
        <div class="cartbar" style="margin-top:0">
          <div class="cb-total" style="text-align:left"><small>Tổng cộng</small><b>${fmt(sub)}</b></div>
          <button class="btn btn-red" data-act="place" style="flex:1">${ic('check')} Đặt hàng</button>
        </div>
      </div>
    </div>
  </div>${footer()}`;
}
function saveDraft() {
  const c = S.checkout;
  if (!c || !coItems().length) return;
  const items = clone(coItems());
  const sig = (arr) => arr.map((l) => lineKey(l.id, l.giavi || [], l.ankem || []) + 'x' + l.qty).sort().join('|');
  const me = sig(items);
  S.drafts = S.drafts.filter((d) => d.id === c.sid || sig(d.items) !== me);
  const ex = S.drafts.find((d) => d.id === c.sid);
  if (ex) { ex.items = items; ex.pay = c.pay; ex.updated = now(); }
  else S.drafts.unshift({ id: c.sid, items, pay: c.pay || 'cod', source: c.source, created: now(), updated: now() });
  S.drafts = S.drafts.slice(0, 30);
  save();
}
function placeOrder() {
  const items = coItems();
  if (!items.length) return;
  const c = S.checkout;
  const snap = items.map((l) => { const d = byId(l.id); return { id: d.id, name: d.name, img: d.img, emoji: d.emoji, unit: unitPrice(l), qty: l.qty, opts: optText(l) }; });
  const total = snap.reduce((a, l) => a + l.unit * l.qty, 0);
  let code;
  do { code = '1277-' + rndStr(4) + '-' + rndStr(4); } while (S.orders.some((o) => o.code === code));
  const d1 = rand(12, 25) * 1000, d2 = rand(25, 45) * 1000, d3 = rand(100, 200) * 1000;
  const order = { code, items: snap, total, pay: c.pay || 'cod', created: now(), t1: d1, t2: d1 + d2, t3: d1 + d2 + d3, seed: rand(1, 2147483646), notified: false };
  S.orders.unshift(order);
  if (c.source === 'cart') {
    const keys = new Set(items.map((l) => l.key));
    S.cart = S.cart.filter((l) => !keys.has(l.key));
  }
  S.drafts = S.drafts.filter((d) => d.id !== c.sid);
  S.checkout = null;
  save();
  updateBadges();
  askNotif();
  go('#/order/' + code, { replace: true });
  toast('Đặt hàng thành công! Đang chờ quán xác nhận…');
}

/* ---------- Trang Đơn hàng ---------- */
const TABS = [
  { k: 'coming', n: 'Đang đến', icon: 'bike' },
  { k: 'deals', n: 'Deal đã mua', icon: 'tag' },
  { k: 'history', n: 'Lịch sử', icon: 'clock' },
  { k: 'drafts', n: 'Đơn nháp', icon: 'draft' }
];
function dealsList() {
  const map = new Map();
  S.orders.filter((o) => stageOf(o) === 3).forEach((o) => o.items.forEach((it) => {
    const m = map.get(it.id) || { id: it.id, qty: 0, last: 0, spent: 0 };
    m.qty += it.qty; m.spent += it.unit * it.qty; m.last = Math.max(m.last, o.created + o.t3);
    map.set(it.id, m);
  }));
  return [...map.values()].filter((m) => byId(m.id)).sort((a, b) => b.last - a.last);
}
function orderCard(o, i) {
  const st = stageOf(o);
  const first = o.items[0] || {};
  const more = o.items.length - 1;
  const qty = o.items.reduce((a, l) => a + l.qty, 0);
  const d = byId(first.id) || { emoji: first.emoji || '🍜', img: first.img, name: first.name };
  return `<div class="ocard stg" style="--d:${Math.min(i, 10) * 40}ms" data-go="#/order/${o.code}" role="link" tabindex="0">
    <div class="oc-top">
      <span class="oc-code">${ic('receipt')} #${esc(o.code)}</span>
      <span class="st ${st === 3 ? 'done' : ''}" data-stl="${o.code}">${ic(STAGES[st].icon)} ${STAGES[st].t}</span>
    </div>
    <div class="oc-mid">${ph(d)}
      <div style="min-width:0"><div class="oi-n">${esc(first.name || '')}${more > 0 ? ` <span class="muted" style="font-weight:600">và ${more} món khác</span>` : ''}</div>
      <div class="oi-o">${qty} món • ${esc(payName(o.pay))}</div></div>
    </div>
    <div class="oc-bot">
      <span>${st < 3 ? `${ic('clock')} Giao tới sau <span class="cd" data-cd="${o.code}">${mmss(o.created + o.t3 - now())}</span>` : `${ic('checkc')} ${dateTime(o.created + o.t3)}`}</span>
      <span>Tổng: <b>${fmt(o.total)}</b></span>
    </div>
  </div>`;
}
function vOrders() {
  const tab = TABS.some((t) => t.k === S.ordersTab) ? S.ordersTab : 'coming';
  const coming = activeOrders();
  const hist = S.orders.filter((o) => stageOf(o) === 3);
  const deals = dealsList();
  const counts = { coming: coming.length, deals: deals.length, history: hist.length, drafts: S.drafts.length };
  let body = '';
  if (tab === 'coming') {
    body = coming.length ? coming.map(orderCard).join('')
      : emptyBox('🛵', 'Không có đơn nào đang đến', 'Đặt một món ngon để xem tài xế chạy tới Nhà mình nhé!', `<button class="btn btn-red" data-go="#/">${ic('home')} Đặt món ngay</button>`);
  } else if (tab === 'history') {
    body = hist.length ? hist.map(orderCard).join('')
      : emptyBox('📜', 'Chưa có lịch sử', 'Các đơn đã giao thành công sẽ được lưu ở đây.');
  } else if (tab === 'deals') {
    body = deals.length ? deals.map((m, i) => { const d = byId(m.id); return `
      <div class="ocard stg" style="--d:${Math.min(i, 10) * 40}ms; cursor:default">
        <div class="oc-mid">${ph(d, '', `data-go="#/dish/${d.id}" style="cursor:pointer"`)}
          <div style="min-width:0"><div class="oi-n">${esc(d.name)}</div>
          <div class="oi-o">Đã mua ${m.qty} phần • Lần gần nhất ${ago(m.last)}</div>
          <div class="stars-row">${stars(d.rating)} <b>${fmtRating(d.rating)}</b></div></div>
        </div>
        <div class="oc-bot"><span>Đã chi (ảo): <b>${fmt(m.spent)}</b></span>
          <button class="btn btn-red btn-sm" data-go="#/dish/${d.id}">${ic('refresh')} Mua lại</button></div>
      </div>`; }).join('')
      : emptyBox('🏷️', 'Chưa có deal nào', 'Món bạn đã nhận sẽ hiện ở đây để mua lại thật nhanh.');
  } else {
    body = S.drafts.length ? S.drafts.map((dr, i) => {
      const items = dr.items.filter((l) => byId(l.id));
      const first = items[0] ? byId(items[0].id) : MENU[0];
      const total = items.reduce((a, l) => a + unitPrice(l) * l.qty, 0);
      const qty = items.reduce((a, l) => a + l.qty, 0);
      return `<div class="ocard stg" style="--d:${Math.min(i, 10) * 40}ms; cursor:default">
        <div class="oc-top"><span class="oc-code">${ic('draft')} Đơn nháp</span><span class="st draft">${ic('clock')} <span data-ago="${dr.updated}">${ago(dr.updated)}</span></span></div>
        <div class="oc-mid">${ph(first)}
          <div style="min-width:0"><div class="oi-n">${esc(first.name)}${items.length > 1 ? ` <span class="muted" style="font-weight:600">và ${items.length - 1} món khác</span>` : ''}</div>
          <div class="oi-o">${qty} món • Tổng ${fmt(total)}</div></div>
        </div>
        <div class="oc-bot"><span></span><div class="oc-acts">
          <button class="btn btn-soft btn-sm" data-act="draft-del" data-v="${esc(dr.id)}">${ic('trash')} Xóa</button>
          <button class="btn btn-red btn-sm" data-act="draft-go" data-v="${esc(dr.id)}">Tiếp tục thanh toán</button>
        </div></div>
      </div>`; }).join('')
      : emptyBox('📝', 'Không có đơn nháp', 'Khi bạn vào trang Thanh toán mà chưa đặt hàng, đơn sẽ được lưu nháp ở đây.');
  }
  return `${topbar('Đơn hàng')}
  <div class="${pageCls()}">
    <div class="sec" style="margin-top:18px"><h2 class="big-h" style="font-size:1.8rem">🧾 Đơn hàng</h2></div>
    <div class="tabs" role="tablist">${TABS.map((t) => `
      <button class="tab ${t.k === tab ? 'on' : ''}" data-act="tab" data-v="${t.k}" role="tab" aria-selected="${t.k === tab}">${ic(t.icon)} ${t.n} <span class="n">${counts[t.k]}</span></button>`).join('')}
    </div>
    <div class="list">${body}</div>
  </div>${footer()}`;
}

/* ---------- Theo dõi đơn hàng ---------- */
function stepsHtml(st) {
  return `<div class="steps">${STAGES.map((s, i) => `
    <div class="step ${i === 3 ? 'fin' : ''} ${i < st || st === 3 ? 'done' : ''} ${i === st && st < 3 ? 'cur' : ''}">
      <span class="s-ic">${ic(s.icon)}</span><span>${s.t}</span>
    </div>`).join('')}</div>`;
}
function vTrack(code) {
  const o = S.orders.find((x) => x.code === code);
  if (!o) return vNotFound();
  const st = stageOf(o);
  UI.trackStage = st;
  const done = st === 3;
  const qty = o.items.reduce((a, l) => a + l.qty, 0);
  return `${topbar('Theo dõi đơn hàng')}
  <div class="${pageCls()}">
    <div class="stack">
      <div class="trk-hero stg">
        <div class="trk-ic ${done ? 'ok' : 'spin-ring'}">${ic(done ? 'check' : STAGES[st].icon)}</div>
        <div class="trk-t ${done ? 'ok' : ''}">${STAGES[st].t}</div>
        <div class="trk-s">${STAGES[st].s}</div>
        ${done ? `<div class="trk-s">Đã giao lúc ${dateTime(o.created + o.t3)}</div>`
               : `<div class="trk-s">Thời gian giao tới nhà còn</div><div class="trk-cd" id="trkCd">${mmss(o.created + o.t3 - now())}</div>`}
        <div class="code-chip">#${esc(o.code)}<button data-act="o-code" data-v="${esc(o.code)}" aria-label="Sao chép mã đơn">${ic('copy')}</button></div>
      </div>
      ${stepsHtml(st)}
      <div class="trk-grid">
        <div class="map-box stg" style="--d:80ms">
          <canvas id="mapCv" aria-label="Bản đồ đường đi của tài xế"></canvas>
          <div class="map-chip" id="mapChip">${mapChipText(o)}</div>
          <div class="map-legend"><span>🍜 Quán 1277</span><span>🛵 Tài xế</span><span>🏠 Nhà mình</span></div>
        </div>
        <div class="stack" style="padding-top:0">
          <div class="box stg" style="--d:120ms">
            <div class="box-h">${ic('receipt')} Chi tiết đơn (${qty} món)</div>
            ${o.items.map((it) => { const d = byId(it.id) || { emoji: it.emoji || '🍜', img: it.img, name: it.name }; return `
              <div class="oitem">${ph(d)}
                <div style="min-width:0"><div class="oi-n">${esc(it.name)}</div><div class="oi-o">${esc(it.opts)}</div></div>
                <div class="oi-r"><span class="price">${fmt(it.unit)}</span><span class="oi-q">x${it.qty}</span></div>
              </div>`; }).join('')}
            <div class="sum" style="margin-top:10px">
              <div class="sum-r"><span>${ic('pin')} Địa chỉ</span><b>Nhà mình</b></div>
              <div class="sum-r"><span>Thanh toán</span><b>${esc(payName(o.pay))}</b></div>
              <div class="sum-r"><span>Đặt lúc</span><b>${dateTime(o.created)}</b></div>
              <div class="sum-r tot"><span>Tổng cộng</span><b>${fmt(o.total)}</b></div>
            </div>
          </div>
          ${done ? `<div class="acts">
            <button class="btn btn-red" data-act="o-share" data-v="${esc(o.code)}">${ic('share')} Chia sẻ</button>
            <button class="btn btn-ghost" data-act="o-copy" data-v="${esc(o.code)}">${ic('copy')} Sao chép đơn hàng</button>
            <button class="btn btn-soft" data-act="o-again" data-v="${esc(o.code)}">${ic('refresh')} Đặt lại</button>
          </div>` : `<div class="acts"><button class="btn btn-soft" data-act="o-copy" data-v="${esc(o.code)}">${ic('copy')} Sao chép đơn hàng</button></div>`}
        </div>
      </div>
    </div>
  </div>${footer()}`;
}
function mapChipText(o) {
  const st = stageOf(o);
  if (st === 0) return '🍜 Quán đang xác nhận đơn…';
  if (st === 1) return '👨‍🍳 Đang nấu – tài xế chờ lấy món';
  if (st === 2) return `🛵 Đang giao • còn ${mmss(o.created + o.t3 - now())}`;
  return '✅ Đã tới Nhà mình';
}
function orderText(o) {
  const st = stageOf(o);
  const lines = [
    `🧾 1277Foods – Đơn hàng #${o.code}`,
    st === 3 ? '✅ Đã giao hàng thành công' : `⏳ ${STAGES[st].t}`,
    `🕒 Đặt lúc: ${dateTime(o.created)}`,
    '📍 Địa chỉ: Nhà mình',
    ...o.items.map((it) => `• ${it.name} x${it.qty} – ${fmt(it.unit * it.qty)}\n   (${it.opts})`),
    `💳 Thanh toán: ${payName(o.pay)}`,
    `💰 Tổng cộng: ${fmt(o.total)}`,
    '(Đơn hàng ảo – chỉ vui, không giao thật 😄)',
    `👉 ${pageUrl()}`
  ];
  return lines.join('\n');
}

/* ---------- Bản đồ thành phố (vẽ bằng canvas, chạy offline) ---------- */
const MapView = (() => {
  let raf = 0, cv = null, order = null, city = null, layer = null, lw = 0, lh = 0, ldark = null;
  const STREETS = ['Đ. Hoa Phượng', 'Đ. Hoa Sữa', 'Đ. Bằng Lăng', 'Đ. Hoa Mai', 'Đ. Cây Me', 'Đ. Hàng Phở', 'Đ. Bánh Mì', 'Đ. Gió Mát', 'Đ. Sông Xanh', 'Đ. Nắng Vàng'];

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gen(seed) {
    const r = rng(seed);
    const nx = 7, ny = 7;
    const river = 2 + Math.floor(r() * 2); /* hàng ô có sông */
    const cols = [0, 1, 2, 3, 4, 5, 6].sort(() => r() - 0.5);
    const bridges = cols.slice(0, 2);
    const cells = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      if (j === river) { cells.push({ i, j, t: 'water' }); continue; }
      const t = r() < 0.17 ? 'park' : 'build';
      const b = [];
      if (t === 'build') {
        const n = 2 + Math.floor(r() * 3);
        const split = r() < 0.5;
        for (let k = 0; k < n; k++) {
          const w = 1 / n;
          b.push(split ? { x: k * w + 0.04, y: 0.06 + r() * 0.1, w: w - 0.08, h: 0.55 + r() * 0.3, c: Math.floor(r() * 6), hgt: 2 + r() * 5 }
                       : { x: 0.06 + r() * 0.1, y: k * w + 0.04, w: 0.55 + r() * 0.3, h: w - 0.08, c: Math.floor(r() * 6), hgt: 2 + r() * 5 });
        }
      }
      const trees = [];
      if (t === 'park') for (let k = 0; k < 6; k++) trees.push({ x: 0.15 + r() * 0.7, y: 0.15 + r() * 0.7, s: 0.6 + r() * 0.5 });
      cells.push({ i, j, t, b, trees, pond: t === 'park' && r() < 0.5 });
    }
    const hasV = (i, j) => j !== river || bridges.includes(i); /* cạnh dọc (i,j)-(i,j+1) */
    const majorRow = r() < 0.5 ? 0 : ny - 1, majorCol = 1 + Math.floor(r() * (nx - 2));
    /* Quán ở phía trên sông, nhà ở phía dưới (hoặc ngược lại) */
    const flip = r() < 0.5;
    const top = { x: Math.floor(r() * nx), y: Math.floor(r() * (river + 1)) };
    const bot = { x: Math.floor(r() * nx), y: river + 1 + Math.floor(r() * (ny - river - 1)) };
    if (Math.abs(top.x - bot.x) < 2) bot.x = (top.x + 3 + Math.floor(r() * 2)) % nx;
    const shop = flip ? bot : top, home = flip ? top : bot;
    /* Tìm đường ngắn, ít rẽ (Dijkstra) — chỉ đi trên đường, không xuyên nhà */
    const id = (x, y, d) => ((y * nx + x) * 5) + d;
    const dist = new Map(), prev = new Map(), done = new Set();
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const start = id(shop.x, shop.y, 4);
    dist.set(start, 0);
    let endKey = null;
    while (true) {
      let best = null, bd = Infinity;
      dist.forEach((v, k) => { if (!done.has(k) && v < bd) { bd = v; best = k; } });
      if (best === null) break;
      done.add(best);
      const d = best % 5, node = (best - d) / 5, x = node % nx, y = (node - x) / nx;
      if (x === home.x && y === home.y) { endKey = best; break; }
      DIRS.forEach(([dx, dy], nd) => {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= nx || Y >= ny) return;
        if (dy !== 0 && !hasV(x, Math.min(y, Y))) return;
        const k = id(X, Y, nd), c = bd + 1 + (d !== 4 && d !== nd ? 0.6 : 0);
        if (c < (dist.has(k) ? dist.get(k) : Infinity)) { dist.set(k, c); prev.set(k, best); }
      });
    }
    let path = [];
    for (let k = endKey; k != null; k = prev.get(k)) { const d = k % 5, n = (k - d) / 5; path.unshift([n % nx, (n - n % nx) / nx]); if (k === start) break; }
    if (path.length < 2) path = [[shop.x, shop.y], [home.x, home.y]];
    const names = STREETS.slice().sort(() => r() - 0.5);
    return { nx, ny, river, bridges, cells, hasV, majorRow, majorCol, shop, home, path, names };
  }

  const PAL = {
    light: { land: '#eef0e4', block: '#e4e2d6', road: '#ffffff', casing: '#d3d6da', major: '#ffe6a0', majorCase: '#efc65a', water: '#9fd3f5', water2: '#7cc0ee', park: '#bfe3a5', tree: '#6fbf5a', tree2: '#4e9f43', label: '#7b6f66', roofs: ['#f6c9b4', '#f3d9a4', '#cfe0f5', '#e7cfe9', '#d9e8c9', '#f1c6c6'], shadow: 'rgba(80,60,40,.18)', route: '#e53935' },
    dark: { land: '#1a1f1c', block: '#232823', road: '#3b4249', casing: '#2a3036', major: '#6b5a2c', majorCase: '#544622', water: '#1f4a6b', water2: '#2a5f86', park: '#24402a', tree: '#2f6b3a', tree2: '#235530', label: '#a89c92', roofs: ['#5b3d33', '#5a4b2e', '#2f4258', '#4b3650', '#3b4a31', '#55302f'], shadow: 'rgba(0,0,0,.4)', route: '#ff5449' }
  };

  function geo(W, H) {
    const pad = Math.max(22, W * 0.05);
    const padT = Math.max(50, H * 0.12);
    const rw = clamp(W / 42, 8, 15);
    const X = (i) => pad + i * (W - 2 * pad) / (city.nx - 1);
    const Y = (j) => padT + j * (H - padT - pad) / (city.ny - 1);
    return { pad, rw, X, Y };
  }
  function drawStatic(W, H, dark) {
    const P = dark ? PAL.dark : PAL.light;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    layer = document.createElement('canvas');
    layer.width = Math.round(W * dpr); layer.height = Math.round(H * dpr);
    const c = layer.getContext('2d');
    c.scale(dpr, dpr);
    const { rw, X, Y } = geo(W, H);
    c.fillStyle = P.land; c.fillRect(0, 0, W, H);
    /* Sông */
    const ry1 = Y(city.river) + rw * 0.9, ry2 = Y(city.river + 1) - rw * 0.9;
    const gr = c.createLinearGradient(0, ry1, 0, ry2);
    gr.addColorStop(0, P.water2); gr.addColorStop(0.5, P.water); gr.addColorStop(1, P.water2);
    c.fillStyle = gr; c.fillRect(0, ry1, W, ry2 - ry1);
    /* Ô phố */
    city.cells.forEach((cell) => {
      if (cell.t === 'water') return;
      const x1 = X(cell.i) + rw * 0.9, y1 = Y(cell.j) + rw * 0.9, x2 = X(cell.i + 1) - rw * 0.9, y2 = Y(cell.j + 1) - rw * 0.9;
      const w = x2 - x1, h = y2 - y1;
      if (w <= 4 || h <= 4) return;
      c.fillStyle = cell.t === 'park' ? P.park : P.block;
      roundRect(c, x1, y1, w, h, 6); c.fill();
      if (cell.t === 'park') {
        if (cell.pond) { c.fillStyle = P.water; c.beginPath(); c.ellipse(x1 + w * 0.5, y1 + h * 0.55, w * 0.22, h * 0.16, 0, 0, Math.PI * 2); c.fill(); }
        cell.trees.forEach((t) => {
          const r = Math.min(w, h) * 0.08 * t.s;
          c.fillStyle = P.tree2; c.beginPath(); c.arc(x1 + t.x * w + 1, y1 + t.y * h + 2, r, 0, Math.PI * 2); c.fill();
          c.fillStyle = P.tree; c.beginPath(); c.arc(x1 + t.x * w, y1 + t.y * h, r, 0, Math.PI * 2); c.fill();
        });
      } else {
        cell.b.forEach((b) => {
          const bx = x1 + b.x * w, by = y1 + b.y * h, bw = b.w * w, bh = b.h * h;
          if (bw < 3 || bh < 3) return;
          c.fillStyle = P.shadow; roundRect(c, bx + b.hgt * 0.6, by + b.hgt * 0.8, bw, bh, 3); c.fill();
          c.fillStyle = P.roofs[b.c]; roundRect(c, bx, by, bw, bh, 3); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.strokeRect(bx + 2.5, by + 2.5, Math.max(0, bw - 5), Math.max(0, bh - 5));
        });
      }
    });
    /* Đường */
    const edges = [];
    for (let j = 0; j < city.ny; j++) for (let i = 0; i < city.nx - 1; i++) edges.push([i, j, i + 1, j, j === city.majorRow]);
    for (let i = 0; i < city.nx; i++) for (let j = 0; j < city.ny - 1; j++) if (city.hasV(i, j)) edges.push([i, j, i, j + 1, i === city.majorCol]);
    c.lineCap = 'round';
    const pass = (major, cas) => edges.forEach((e) => {
      if (!!e[4] !== major) return;
      c.strokeStyle = cas ? (major ? P.majorCase : P.casing) : (major ? P.major : P.road);
      c.lineWidth = (major ? rw * 1.35 : rw) + (cas ? 2.5 : 0);
      c.beginPath(); c.moveTo(X(e[0]), Y(e[1])); c.lineTo(X(e[2]), Y(e[3])); c.stroke();
    });
    pass(false, true); pass(true, true); pass(false, false); pass(true, false);
    /* Vạch giữa đường lớn */
    c.setLineDash([6, 7]); c.lineWidth = 1.4; c.strokeStyle = dark ? 'rgba(255,230,160,.55)' : 'rgba(255,255,255,.95)';
    c.beginPath(); c.moveTo(X(0), Y(city.majorRow)); c.lineTo(X(city.nx - 1), Y(city.majorRow)); c.stroke();
    c.beginPath(); c.moveTo(X(city.majorCol), Y(0)); c.lineTo(X(city.majorCol), Y(city.ny - 1)); c.stroke();
    c.setLineDash([]);
    /* Cầu */
    city.bridges.forEach((i) => {
      const x = X(i), ya = Y(city.river) + rw * 0.6, yb = Y(city.river + 1) - rw * 0.6;
      c.strokeStyle = dark ? '#8a7a66' : '#b9a58a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - rw * 0.75, ya); c.lineTo(x - rw * 0.75, yb); c.moveTo(x + rw * 0.75, ya); c.lineTo(x + rw * 0.75, yb); c.stroke();
    });
    /* Tên đường */
    c.fillStyle = P.label; c.font = `600 ${clamp(W / 60, 9, 12)}px system-ui, sans-serif`; c.textBaseline = 'middle';
    c.fillText(city.names[0], X(0) + 6, Y(city.majorRow) + (city.majorRow === 0 ? rw + 6 : -rw - 6));
    c.save(); c.translate(X(city.majorCol) + rw + 6, Y(0) + 8); c.rotate(Math.PI / 2); c.fillText(city.names[1], 0, 0); c.restore();
    c.fillStyle = dark ? '#9cc9ee' : '#3d7fb8'; c.font = `italic 700 ${clamp(W / 50, 10, 14)}px system-ui, sans-serif`;
    c.fillText('Sông 1277', X(city.nx - 1) - clamp(W / 50, 10, 14) * 6, (ry1 + ry2) / 2);
    lw = W; lh = H; ldark = dark;
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function pin(c, x, y, color, emoji, label) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 2, 8, 3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = color; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 6, y - 10, x - 16, y - 16, x - 16, y - 28); c.arc(x, y - 28, 16, Math.PI, 0); c.bezierCurveTo(x + 16, y - 16, x + 6, y - 10, x, y); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y - 28, 12, 0, Math.PI * 2); c.fill();
    c.font = '15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(emoji, x, y - 27);
    if (label) {
      c.font = '800 11px system-ui, sans-serif';
      const tw = c.measureText(label).width + 14;
      const ly = y - 66 < 2 ? y + 8 : y - 66;
      const lx = clamp(x, tw / 2 + 2, c.canvas.width / Math.min(window.devicePixelRatio || 1, 2) - tw / 2 - 2);
      c.fillStyle = color; roundRect(c, lx - tw / 2, ly, tw, 20, 10); c.fill();
      c.fillStyle = '#fff'; c.fillText(label, lx, ly + 10);
    }
    c.restore();
  }
  function frame(t) {
    raf = 0;
    if (!cv || !cv.isConnected || !order) { stop(); return; }
    const W = cv.clientWidth, H = Math.round(clamp(W * (W < 600 ? 0.95 : 0.72), 260, 540));
    if (W < 60) { raf = requestAnimationFrame(frame); return; }
    const dark = document.documentElement.dataset.theme === 'dark';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    if (!layer || lw !== W || lh !== H || ldark !== dark) drawStatic(W, H, dark);
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(layer, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = dark ? PAL.dark : PAL.light;
    const { rw, X, Y } = geo(W, H);
    /* Sóng nước */
    const ry1 = Y(city.river) + rw * 0.9, ry2 = Y(city.river + 1) - rw * 0.9;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
    for (let k = 1; k <= 3; k++) {
      const yy = ry1 + (ry2 - ry1) * k / 4;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) { const y = yy + Math.sin(x / 18 + t / 600 + k) * 2; x ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    /* Lộ trình */
    const pts = city.path.map(([i, j]) => [X(i), Y(j)]);
    const seg = []; let L = 0;
    for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); L += d; }
    const st = stageOf(order);
    const tt = now();
    let p = st < 2 ? 0 : st === 3 ? 1 : clamp((tt - order.created - order.t2) / (order.t3 - order.t2), 0, 1);
    p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; /* chạy nhanh dần rồi chậm dần */
    const at = (dist) => {
      let acc = 0;
      for (let k = 0; k < seg.length; k++) {
        if (acc + seg[k] >= dist) { const f = seg[k] ? (dist - acc) / seg[k] : 0; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, k]; }
        acc += seg[k];
      }
      const e = pts[pts.length - 1]; return [e[0], e[1], seg.length - 1];
    };
    const pos = at(L * p);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = P.route; c.globalAlpha = 0.25; c.lineWidth = rw * 0.95;
    c.beginPath(); pts.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
    c.globalAlpha = 1; c.lineWidth = rw * 0.42; c.setLineDash([rw * 0.9, rw * 0.7]); c.lineDashOffset = -t / 40;
    c.beginPath(); c.moveTo(pos[0], pos[1]); for (let k = pos[2] + 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.stroke();
    c.setLineDash([]); c.lineWidth = rw * 0.5;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k <= pos[2]; k++) c.lineTo(pts[k][0], pts[k][1]); c.lineTo(pos[0], pos[1]); c.stroke();
    /* Điểm quán & nhà */
    pin(c, pts[0][0], pts[0][1], '#e53935', '🍜', 'Quán 1277');
    const e = pts[pts.length - 1];
    pin(c, e[0], e[1], '#16a34a', '🏠', 'Nhà mình');
    /* Tài xế */
    const pulse = (t / 900) % 1;
    c.fillStyle = `rgba(229,57,53,${0.35 * (1 - pulse)})`; c.beginPath(); c.arc(pos[0], pos[1], 14 + pulse * 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.strokeStyle = P.route; c.lineWidth = 3;
    c.beginPath(); c.arc(pos[0], pos[1], 15, 0, Math.PI * 2); c.fill(); c.stroke();
    c.font = '17px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🛵', pos[0], pos[1] + (st === 2 ? Math.sin(t / 90) * 1 : 0));
    raf = requestAnimationFrame(frame);
  }
  function start(canvas, o) {
    stop();
    cv = canvas; order = o;
    city = gen(o.seed || 1277);
    layer = null;
    raf = requestAnimationFrame(frame);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  return { start, stop };
})();

/* ---------- Ảnh chia sẻ đơn hàng ---------- */
function loadImg(src) {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.referrerPolicy = 'no-referrer';
    const to = setTimeout(() => res(null), 4000);
    im.onload = () => { clearTimeout(to); res(im); };
    im.onerror = () => { clearTimeout(to); res(null); };
    im.src = src;
  });
}
async function orderImage(o) {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const font = (w, s) => `${w} ${s}px ${SYS_FONT}`;
  const g = c.createLinearGradient(0, 0, W, 420);
  g.addColorStop(0, '#e53935'); g.addColorStop(0.6, '#d81b60'); g.addColorStop(1, '#ff6a3d');
  c.fillStyle = '#fff8f3'; c.fillRect(0, 0, W, H);
  c.fillStyle = g; c.fillRect(0, 0, W, 420);
  c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = font(800, 64); c.fillText('🍜 1277Foods', 60, 110);
  c.font = font(600, 34); c.fillText('Đặt Đồ Ăn Ảo – Chỉ Vui, Không Lo Gì Cả', 60, 165);
  const first = o.items[0];
  const im = first ? await loadImg(first.img) : null;
  const ix = 60, iy = 220, iw = W - 120, ih = 440;
  c.save(); c.beginPath(); c.roundRect ? c.roundRect(ix, iy, iw, ih, 36) : c.rect(ix, iy, iw, ih); c.clip();
  if (im) {
    const r = Math.max(iw / im.width, ih / im.height), dw = im.width * r, dh = im.height * r;
    try { c.drawImage(im, ix + (iw - dw) / 2, iy + (ih - dh) / 2, dw, dh); } catch (e) { /* bỏ qua */ }
  } else {
    c.fillStyle = '#fde3d6'; c.fillRect(ix, iy, iw, ih);
    c.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(first ? (first.emoji || '🍜') : '🍜', W / 2, iy + ih / 2);
  }
  c.restore();
  let y = 740; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#16a34a'; c.font = font(800, 50);
  c.fillText(stageOf(o) === 3 ? '✅ Đã giao hàng thành công' : '⏳ ' + STAGES[stageOf(o)].t, 60, y);
  y += 60; c.fillStyle = '#8a7468'; c.font = font(600, 30);
  c.fillText(`Mã đơn #${o.code}  •  ${dateTime(o.created)}`, 60, y);
  y += 60; c.fillStyle = '#2b1d16';
  o.items.slice(0, 5).forEach((it) => {
    c.font = font(700, 36);
    const name = `${it.name} x${it.qty}`;
    c.fillText(name.length > 30 ? name.slice(0, 29) + '…' : name, 60, y);
    c.textAlign = 'right'; c.fillStyle = '#e53935'; c.fillText(fmt(it.unit * it.qty), W - 60, y);
    c.textAlign = 'left'; c.fillStyle = '#2b1d16'; y += 54;
  });
  if (o.items.length > 5) { c.font = font(600, 30); c.fillStyle = '#8a7468'; c.fillText(`… và ${o.items.length - 5} món khác`, 60, y); y += 50; }
  c.strokeStyle = '#f1dfd3'; c.lineWidth = 3; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(60, y - 18); c.lineTo(W - 60, y - 18); c.stroke(); c.setLineDash([]);
  y += 30; c.font = font(800, 44); c.fillStyle = '#2b1d16'; c.fillText('Tổng cộng', 60, y);
  c.textAlign = 'right'; c.fillStyle = '#e53935'; c.fillText(fmt(o.total), W - 60, y); c.textAlign = 'left';
  c.font = font(600, 28); c.fillStyle = '#8a7468';
  c.fillText(`📍 Nhà mình  •  💳 ${payName(o.pay)}`, 60, Math.min(y + 60, H - 110));
  c.fillStyle = '#e53935'; c.fillRect(0, H - 80, W, 80);
  c.fillStyle = '#fff'; c.font = font(700, 28); c.textAlign = 'center';
  c.fillText('Đơn hàng ảo – chỉ vui, không giao thật 😄', W / 2, H - 30);
  return new Promise((res) => {
    try { cv.toBlob((b) => res(b), 'image/png'); } catch (e) { res(null); }
  });
}

/* ---------- Thông báo nhỏ (toast) & hộp thoại ---------- */
let toastT = 0;
function toast(msg, warn = false) {
  const t = $('#toast');
  if (!t) return;
  t.className = 'toast' + (warn ? ' warn' : '');
  t.innerHTML = `${ic(warn ? 'alert' : 'checkc')}<span>${esc(msg)}</span>`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
let modalClose = null;
function modal(html, cls = '', onClose = null) {
  closeModal(true);
  const root = $('#modal-root');
  const el = document.createElement('div');
  el.className = 'mo ' + cls;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = cls.includes('qrfull') ? html : `<div class="mo-card">${html}</div>`;
  el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  root.appendChild(el);
  document.body.style.overflow = 'hidden';
  modalClose = onClose;
  return el;
}
function closeModal(instant = false) {
  const el = $('#modal-root .mo');
  const fn = modalClose; modalClose = null;
  if (fn) try { fn(); } catch (e) { /* bỏ qua */ }
  document.body.style.overflow = '';
  if (!el) return;
  if (instant) { el.remove(); return; }
  el.classList.add('out');
  setTimeout(() => el.remove(), 220);
}
function alertBox(title, sub, btns) {
  modal(`<button class="m-x" data-act="close-modal" aria-label="Đóng">${ic('x')}</button>
    <div class="alert-ic">${ic('alert')}</div>
    <div class="alert-t">${title}</div>${sub ? `<div class="alert-s">${sub}</div>` : '<div style="height:12px"></div>'}
    <div class="alert-acts">${btns || `<button class="btn btn-red" data-act="close-modal">Đã hiểu</button>`}</div>`);
}

/* ---------- Chọn món ngẫu nhiên ---------- */
function rndCardHtml(d) {
  return `${ph(d)}<div class="rnd-b"><div class="rnd-n">${esc(d.name)}</div>
    <div class="stars-row">${ic('star', 'fill')} <b>${fmtRating(d.rating)}</b> ${stars(d.rating)}</div>
    <div class="price" style="font-size:1.35rem">${fmt(d.price)}</div></div>`;
}
function openRandom() {
  modal(`<button class="m-x" data-act="close-modal" aria-label="Thoát">${ic('x')}</button>
    <div class="rnd-title">${ic('dice')} Hôm nay ăn gì?</div>
    <div class="rnd-card" id="rndCard"></div>
    <div class="rnd-acts">
      <button class="btn btn-ghost" data-act="random-again" id="rndAgain">${ic('refresh')} Chọn lại</button>
      <button class="btn btn-red" data-act="random-view" id="rndView">Xem món</button>
    </div>`);
  spin();
}
function spin() {
  const box = $('#rndCard');
  if (!box || UI.spinning) return;
  UI.spinning = true;
  ['#rndAgain', '#rndView'].forEach((s) => { const b = $(s); if (b) b.disabled = true; });
  box.className = 'rnd-card spinning';
  const final = MENU[Math.floor(Math.random() * MENU.length)];
  let delay = 60, last = -1, total = 0;
  const step = () => {
    if (!box.isConnected) { UI.spinning = false; return; }
    let i; do { i = Math.floor(Math.random() * MENU.length); } while (i === last && MENU.length > 1);
    last = i;
    total += delay;
    if (total > 1500) {
      UI.rndId = final.id;
      box.innerHTML = rndCardHtml(final);
      box.className = 'rnd-card';
      void box.offsetWidth;
      box.className = 'rnd-card landed';
      UI.spinning = false;
      ['#rndAgain', '#rndView'].forEach((s) => { const b = $(s); if (b) b.disabled = false; });
      if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) { /* bỏ qua */ }
      return;
    }
    box.innerHTML = rndCardHtml(MENU[i]);
    delay = Math.min(260, delay * 1.18);
    setTimeout(step, delay);
  };
  step();
}

/* ---------- Mã QR toàn màn hình (giữ màn hình sáng) ---------- */
let wakeLock = null;
async function openQrFull() {
  const el = modal(`<div class="qrf">
      <button class="m-x" data-act="close-modal" aria-label="Đóng">${ic('x')}</button>
      <div class="qrf-t">🍜 1277Foods</div>
      <canvas id="qrBig" aria-label="Mã QR của trang"></canvas>
      <div class="qrf-l">${esc(pageUrl())}</div>
      <div class="qrf-l">Quét mã bằng camera để mở trang</div>
    </div>`, 'qrfull', async () => {
    if (wakeLock) { try { await wakeLock.release(); } catch (e) { /* bỏ qua */ } wakeLock = null; }
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
  try { QR.draw($('#qrBig'), pageUrl(), 10); } catch (e) { toast('Không tạo được mã QR', true); }
  try { if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* bỏ qua */ }
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* bỏ qua */ }
}

/* ---------- Sao chép & chia sẻ ---------- */
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* thử cách khác */ }
  try {
    const a = document.createElement('textarea');
    a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove();
    return ok;
  } catch (e) { return false; }
}
async function sharePage() {
  const data = { title: '1277Foods | Đặt Đồ Ăn Ảo', text: '🍜 1277Foods – Đặt đồ ăn ảo cho vui, không lo gì cả!', url: pageUrl() };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  if (await copyText(data.url)) toast('Đã sao chép link – dán để chia sẻ nhé!');
  else toast('Không chia sẻ được trên trình duyệt này', true);
}
async function shareOrder(o) {
  const text = orderText(o);
  const blob = await orderImage(o);
  const file = blob ? new File([blob], `1277Foods-${o.code}.png`, { type: 'image/png' }) : null;
  if (navigator.share) {
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Đơn hàng #${o.code}`, text });
      } else {
        await navigator.share({ title: `Đơn hàng #${o.code}`, text });
      }
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  if (blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `1277Foods-${o.code}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  await copyText(text);
  toast('Đã tải ảnh đơn hàng & sao chép nội dung');
}

/* ---------- Thông báo trên thiết bị ---------- */
let notifAsked = false;
async function askNotif() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try {
    const r = Notification.requestPermission();
    if (r && r.then) await r;
  } catch (e) { /* bỏ qua */ }
  const row = $('#notifRow'); if (row) row.innerHTML = notifHtml();
}
function swReg() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return Promise.race([navigator.serviceWorker.getRegistration().catch(() => null), new Promise((r) => setTimeout(() => r(null), 1500))]);
}
async function notify(title, body, icon, url) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon, badge: icon, tag: 'order-' + url, renotify: true, vibrate: [120, 60, 120], data: { url } };
  try { const reg = await swReg(); if (reg && reg.showNotification) { await reg.showNotification(title, opts); return; } } catch (e) { /* thử cách khác */ }
  try { new Notification(title, opts); } catch (e) { /* bỏ qua */ }
}

/* ---------- Lượt truy cập (Google Sheets) ---------- */
function scriptUrl() {
  let u = String(SCRIPT_URL || '').trim();
  if (u && !/^https?:\/\//i.test(u)) { try { u = atob(u).trim(); } catch (e) { u = ''; } }
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(u) ? u : '';
}
let visitState = 'init';
function visitStatusHtml() {
  if (!scriptUrl()) return '<i class="dot"></i><span>Chưa gắn link Apps Script</span>';
  if (!navigator.onLine || visitState === 'off') return '<i class="dot off"></i><span>Ngoại tuyến – số gần nhất</span>';
  if (visitState === 'live') return '<i class="dot live"></i><span>Đang cập nhật trực tiếp</span>';
  return '<i class="dot"></i><span>Đang kết nối…</span>';
}
function showCount(n) {
  const el = $('#vNum');
  const st = $('#vSt'); if (st) st.innerHTML = visitStatusHtml();
  if (n == null || !isFinite(n)) return;
  const old = S.lastCount;
  if (old !== n) { S.lastCount = n; save(); }
  if (!el) return;
  const from = Number(String(el.textContent).replace(/\D/g, '')) || 0;
  if (from === n) { el.textContent = n.toLocaleString('vi-VN'); return; }
  const t0 = performance.now(), dur = 900;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (n - from) * e).toLocaleString('vi-VN');
    if (k < 1 && el.isConnected) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
async function callScript(params) {
  const u = scriptUrl();
  if (!u) return null;
  const ctl = 'AbortController' in window ? new AbortController() : null;
  const to = setTimeout(() => ctl && ctl.abort(), 12000);
  try {
    const qs = new URLSearchParams(Object.assign({ t: Date.now() }, params)).toString();
    const res = await fetch(u + (u.includes('?') ? '&' : '?') + qs, { method: 'GET', cache: 'no-store', redirect: 'follow', signal: ctl ? ctl.signal : undefined });
    const j = await res.json();
    return j && j.ok ? j : null;
  } catch (e) { return null; } finally { clearTimeout(to); }
}
let visitTimer = 0, visitBusy = false;
async function refreshVisits() {
  if (!scriptUrl() || visitBusy) { showCount(S.lastCount); return; }
  if (!navigator.onLine) { visitState = 'off'; showCount(S.lastCount); return; }
  visitBusy = true;
  try {
    if (!S.vid) { S.vid = uid(); save(); }
    let j;
    if (!S.visitDone) {
      j = await callScript({ action: 'visit', vid: S.vid, ua: navigator.userAgent.slice(0, 160) });
      if (j) { S.visitDone = true; save(); }
    } else {
      j = await callScript({ action: 'count' });
    }
    visitState = j ? 'live' : 'off';
    showCount(j ? Number(j.count) : S.lastCount);
  } finally { visitBusy = false; }
}
function startVisits() {
  refreshVisits();
  clearInterval(visitTimer);
  visitTimer = setInterval(() => { if (document.visibilityState === 'visible') refreshVisits(); }, 15000);
}

/* ---------- Giao diện, phông, cỡ chữ ---------- */
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'system' && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#140f0c' : '#e53935');
}
const fontLoaded = new Set();
function loadFont(f) {
  if (!f || !f.g || fontLoaded.has(f.k)) return;
  fontLoaded.add(f.k);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;
  document.head.appendChild(l);
}
function applyFont() {
  const f = FONTS.find((x) => x.k === S.font) || FONTS[0];
  loadFont(f);
  document.documentElement.style.setProperty('--font', fontStack(f));
}
function applyFs() {
  document.documentElement.style.setProperty('--fs', String(1 + S.fontScale * 0.08));
  const v = $('#fsVal'); if (v) v.textContent = 'Cỡ chữ hiện tại: ' + fsLabel();
  $$('.fs-btn[data-v="0"]').forEach((b) => b.classList.toggle('on', S.fontScale === 0));
}
function setOn(act, val) { $$(`[data-act="${act}"]`).forEach((b) => b.classList.toggle('on', b.dataset.v === val)); }

function updateBadges(pop = false) {
  const n = cartCount();
  $$('[data-cartn]').forEach((b) => {
    b.textContent = n > 99 ? '99+' : n;
    b.classList.toggle('hide', !n);
    if (pop) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  });
  const a = activeOrders().length;
  $$('[data-actn]').forEach((b) => { b.textContent = a; b.classList.toggle('hide', !a); });
}
function flyToCart(fromEl) {
  const cart = $('.cart-btn');
  if (!fromEl || !cart || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = fromEl.getBoundingClientRect(), b = cart.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly';
  const im = fromEl.querySelector('img');
  if (im && im.complete && im.naturalWidth) f.innerHTML = `<img src="${esc(im.src)}" alt="">`; else f.textContent = '🍜';
  const s = 64;
  Object.assign(f.style, { left: a.left + a.width / 2 - s / 2 + 'px', top: a.top + a.height / 2 - s / 2 + 'px', width: s + 'px', height: s + 'px' });
  document.body.appendChild(f);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = f.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(.8)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0.6 }
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.5,1)' });
  anim.onfinish = () => f.remove();
}
function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e53935', '#ff6a3d', '#f5a524', '#16a34a', '#3b82f6', '#d81b60'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}

/* ---------- Điều hướng trang ---------- */
const app = $('#app');
const ROUTES = [
  [/^#\/?$/, () => vHome()],
  [/^#\/recent$/, () => vRecent()],
  [/^#\/orders$/, () => vOrders()],
  [/^#\/cat\/(bun|com)$/, (m) => vCat(m[1])],
  [/^#\/dish\/(\d+)$/, (m) => vDish(Number(m[1]))],
  [/^#\/cart$/, () => vCart()],
  [/^#\/checkout$/, () => vCheckout()],
  [/^#\/order\/([A-Z0-9-]{4,40})$/, (m) => vTrack(m[1])]
];
let curRoute = null, isBack = false;
const scrollMemo = {};
const routeNow = () => (location.hash && location.hash !== '#' ? location.hash : '#/');

function render(soft = false) {
  const h = routeNow();
  if (curRoute === '#/checkout' && h !== '#/checkout') saveDraft();
  if (!soft && curRoute) scrollMemo[curRoute] = window.scrollY;
  if (!soft && !h.startsWith('#/dish/')) UI.sel = null;
  UI.soft = soft;
  const keepY = window.scrollY;
  let html = null, matched = null;
  for (const [re, fn] of ROUTES) { const m = h.match(re); if (m) { matched = m; html = fn(m); break; } }
  if (html == null) html = vNotFound();
  app.innerHTML = html;
  document.body.dataset.route = (h.split('/')[1] || 'home');
  const prev = curRoute;
  curRoute = h;
  /* Sau khi vẽ */
  if (h.startsWith('#/dish/') && matched && (!soft || prev !== h)) { const d = byId(matched[1]); if (d) addRecent(d.id); }
  if (h.startsWith('#/order/')) {
    const o = S.orders.find((x) => x.code === (matched && matched[1]));
    const cv = $('#mapCv');
    if (o && cv) MapView.start(cv, o);
  } else MapView.stop();
  if (UI.open.has('qr')) drawMiniQr();
  if (soft) window.scrollTo(0, keepY);
  else window.scrollTo(0, isBack && scrollMemo[h] ? scrollMemo[h] : 0);
  isBack = false;
  const title = h === '#/' ? '1277Foods | Đặt Đồ Ăn Ảo – Chỉ Vui, Không Lo Gì Cả' : ($('.tb-title') ? $('.tb-title').textContent + ' – 1277Foods' : '1277Foods');
  document.title = title;
}
function go(hash, opt = {}) {
  if (hash === routeNow() && !opt.replace) { render(true); return; }
  const d = (history.state && history.state.d) || 0;
  if (opt.replace) history.replaceState({ d }, '', hash);
  else history.pushState({ d: d + 1 }, '', hash);
  render();
}
function back() {
  if (history.state && history.state.d > 0) { isBack = true; history.back(); }
  else { history.replaceState({ d: 0 }, '', '#/'); isBack = true; render(); }
}
window.addEventListener('popstate', () => {
  if (!history.state) history.replaceState({ d: 1 }, '', location.hash);
  if ($('#modal-root .mo')) closeModal(true);
  isBack = true;
  render();
});

/* ---------- Xử lý bấm nút ---------- */
function drawMiniQr() {
  const c = $('#qrMini');
  if (c && !c.dataset.done) { try { QR.draw(c, pageUrl(), 8); c.dataset.done = '1'; } catch (e) { /* bỏ qua */ } }
}
const ACT = {
  back: () => back(),
  'close-modal': () => closeModal(),
  acc: (v, el) => {
    const box = el.closest('.acc');
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    el.setAttribute('aria-expanded', open);
    if (open) UI.open.add(v); else UI.open.delete(v);
    if (open && v === 'qr') drawMiniQr();
    if (open && v === 'font') FONTS.forEach(loadFont);
  },
  theme: (v) => { S.theme = v; save(); applyTheme(); setOn('theme', v); },
  font: (v) => { S.font = v; save(); applyFont(); setOn('font', v); },
  fs: (v) => { const n = Number(v); S.fontScale = n === 0 ? 0 : clamp(S.fontScale + n, -3, 5); save(); applyFs(); },
  sort: (v) => {
    S.sort = S.sort === v ? 'none' : v; save();
    setOn('sort', S.sort);
    if (curRoute === '#/') refreshGrid(); else render(true);
    toast(S.sort === 'none' ? 'Đã bỏ sắp xếp' : S.sort === 'desc' ? 'Giá: Cao đến Thấp' : 'Giá: Thấp đến Cao');
  },
  notif: async () => {
    await askNotif();
    if (Notification.permission === 'granted') toast('Đã bật thông báo giao hàng');
    else if (Notification.permission === 'denied') toast('Thông báo đang bị chặn trong cài đặt trình duyệt', true);
  },
  share: () => sharePage(),
  qrfull: () => openQrFull(),
  random: () => openRandom(),
  'random-again': () => spin(),
  'random-view': () => { const id = UI.rndId; closeModal(); if (id) go('#/dish/' + id); },
  quickadd: (v, el) => {
    addToCart(Number(v), [], [], 1);
    flyToCart(el.closest('.card') ? el.closest('.card').querySelector('.card-img') : el);
    toast('Đã thêm ' + byId(v).name + ' vào giỏ hàng');
  },
  opt: (v, el) => {
    const s = UI.sel, g = el.dataset.g, i = Number(v);
    if (!s || !g) return;
    if (i < 0) s[g] = [];
    else { const k = s[g].indexOf(i); if (k >= 0) s[g].splice(k, 1); else s[g].push(i); }
    refreshDetail();
  },
  qty: (v) => { const s = UI.sel; if (!s) return; s.qty = clamp(s.qty + Number(v), 1, 99); refreshDetail(); },
  thumb: (v) => { if (UI.sel) { UI.sel.view = Number(v); refreshDetail(); } },
  addcart: () => {
    const s = UI.sel; if (!s) return;
    addToCart(s.id, s.giavi, s.ankem, s.qty);
    flyToCart($('.g-main'));
    toast(`Đã thêm ${s.qty} phần ${byId(s.id).name} vào giỏ hàng`);
  },
  buynow: () => {
    const s = UI.sel; if (!s) return;
    const line = { key: lineKey(s.id, s.giavi, s.ankem), id: s.id, giavi: [...s.giavi].sort((a, b) => a - b), ankem: [...s.ankem].sort((a, b) => a - b), qty: s.qty };
    S.checkout = { sid: uid(), source: 'now', items: [line], pay: 'cod' };
    save();
    go('#/checkout');
  },
  'c-check': (v) => { const l = S.cart.find((x) => x.key === v); if (l) { l.checked = !l.checked; save(); render(true); } },
  'c-all': () => { const all = S.cart.every((l) => l.checked); S.cart.forEach((l) => { l.checked = !all; }); save(); render(true); },
  'c-qty': (v, el) => {
    const l = S.cart.find((x) => x.key === el.dataset.k); if (!l) return;
    const n = l.qty + Number(v);
    if (n < 1) { ACT['c-del'](l.key); return; }
    l.qty = clamp(n, 1, 99); save(); updateBadges(); render(true);
  },
  'c-del': (v) => {
    const l = S.cart.find((x) => x.key === v); if (!l) return;
    alertBox('Xóa món khỏi giỏ hàng?', esc(byId(l.id).name), `<button class="btn btn-soft" data-act="close-modal">Hủy</button><button class="btn btn-red" data-act="c-del-ok" data-v="${esc(v)}">Xóa</button>`);
  },
  'c-del-ok': (v) => { S.cart = S.cart.filter((x) => x.key !== v); save(); closeModal(); updateBadges(); render(true); toast('Đã xóa món khỏi giỏ hàng'); },
  'c-buy': () => {
    const sel = S.cart.filter((l) => l.checked);
    if (!sel.length) { alertBox('Bạn vẫn chưa chọn món ăn nào để mua', 'Nhấn vào ô vuông bên cạnh món, hoặc chọn “Tất cả”.'); return; }
    S.checkout = { sid: uid(), source: 'cart', items: clone(sel), pay: 'cod' };
    save();
    go('#/checkout');
  },
  pay: (v) => { if (S.checkout) { S.checkout.pay = v; save(); setOn('pay', v); } },
  place: () => placeOrder(),
  tab: (v) => { S.ordersTab = v; save(); render(true); },
  'draft-del': (v) => { S.drafts = S.drafts.filter((d) => d.id !== v); save(); render(true); toast('Đã xóa đơn nháp'); },
  'draft-go': (v) => {
    const d = S.drafts.find((x) => x.id === v); if (!d) return;
    S.checkout = { sid: d.id, source: d.source === 'cart' ? 'cart' : 'draft', items: clone(d.items), pay: d.pay || 'cod' };
    save(); go('#/checkout');
  },
  'r-clear': () => alertBox('Xóa toàn bộ lịch sử xem?', 'Danh sách “Xem gần đây” sẽ trống.', `<button class="btn btn-soft" data-act="close-modal">Hủy</button><button class="btn btn-red" data-act="r-clear-ok">Xóa</button>`),
  'r-clear-ok': () => { S.recent = []; save(); closeModal(); render(true); toast('Đã xóa lịch sử xem'); },
  'o-code': async (v) => toast((await copyText(v)) ? 'Đã sao chép mã đơn #' + v : 'Không sao chép được'),
  'o-copy': async (v) => { const o = S.orders.find((x) => x.code === v); if (o) toast((await copyText(orderText(o))) ? 'Đã sao chép đơn hàng' : 'Không sao chép được'); },
  'o-share': (v) => { const o = S.orders.find((x) => x.code === v); if (o) shareOrder(o); },
  'o-again': (v) => {
    const o = S.orders.find((x) => x.code === v); if (!o) return;
    const items = [];
    o.items.forEach((it) => { if (byId(it.id)) items.push({ key: 'again-' + it.id + '-' + items.length, id: it.id, giavi: [], ankem: [], qty: it.qty }); });
    if (!items.length) return;
    S.checkout = { sid: uid(), source: 'again', items, pay: o.pay || 'cod' };
    save(); go('#/checkout');
  }
};
ACT.copylink = async () => { const ok = await copyText(pageUrl()); toast(ok ? 'Đã sao chép link trang' : 'Không sao chép được', !ok); };

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-go]');
  if (!el || el.disabled) return;
  const a = el.dataset.act;
  if (!a && el.dataset.go) { e.preventDefault(); if ($('#modal-root .mo')) closeModal(true); go(el.dataset.go); return; }
  const fn = ACT[a];
  if (fn) { e.preventDefault(); fn(el.dataset.v, el, e); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#modal-root .mo')) { closeModal(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="link"][data-go]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'q') { UI.q = e.target.value; refreshGrid(); }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'searchForm') {
    e.preventDefault();
    const q = $('#q'); if (q) { UI.q = q.value; q.blur(); }
    refreshGrid();
    const m = $('#menu'); if (m) window.scrollTo({ top: m.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
  }
});

/* ---------- Đồng hồ chung: thời gian, đơn hàng, thông báo ---------- */
function checkOrders() {
  let changed = false;
  S.orders.forEach((o) => {
    if (!o.notified && stageOf(o) === 3) {
      o.notified = true; changed = true;
      const first = o.items[0] || {};
      notify('1277Foods – Giao hàng thành công ✅', `Đơn #${o.code} đã giao thành công tới Nhà mình. Chúc bạn ngon miệng! 😋`, first.img, '#/order/' + o.code);
      if (curRoute === '#/order/' + o.code) confetti();
      else toast(`Đơn #${o.code} đã giao thành công!`);
    }
  });
  if (changed) { save(); updateBadges(); }
}
function tick() {
  $$('[data-ago]').forEach((el) => { el.textContent = ago(Number(el.dataset.ago)); });
  checkOrders();
  const r = curRoute || '';
  if (r.startsWith('#/order/')) {
    const o = S.orders.find((x) => x.code === r.slice(8));
    if (o) {
      const st = stageOf(o);
      if (st !== UI.trackStage) render(true);
      else {
        const cd = $('#trkCd'); if (cd) cd.textContent = mmss(o.created + o.t3 - now());
        const ch = $('#mapChip'); if (ch) ch.textContent = mapChipText(o);
      }
    }
  } else if (r === '#/orders') {
    let need = false;
    $$('[data-cd]').forEach((el) => {
      const o = S.orders.find((x) => x.code === el.dataset.cd);
      if (!o) return;
      if (stageOf(o) === 3) need = true;
      el.textContent = mmss(o.created + o.t3 - now());
    });
    $$('[data-stl]').forEach((el) => {
      const o = S.orders.find((x) => x.code === el.dataset.stl);
      if (!o) return;
      const st = stageOf(o);
      const html = `${ic(STAGES[st].icon)} ${STAGES[st].t}`;
      if (el.dataset.st !== String(st)) { el.dataset.st = st; el.innerHTML = html; el.classList.toggle('done', st === 3); }
    });
    if (need && S.ordersTab === 'coming') render(true);
  }
}

/* ---------- Khởi động ---------- */
function netChange() {
  const n = $('#netState');
  if (n) n.innerHTML = navigator.onLine ? '<i class="dot live"></i> Đang trực tuyến' : '<i class="dot off"></i> Ngoại tuyến – vẫn dùng bình thường';
  if (navigator.onLine) { toast('Đã có mạng trở lại'); refreshVisits(); }
  else { visitState = 'off'; showCount(S.lastCount); toast('Đang ngoại tuyến – mọi chức năng vẫn chạy bình thường', true); }
}
function init() {
  applyTheme(); applyFont(); applyFs();
  if (mq) {
    const f = () => { if (S.theme === 'system') { applyTheme(); } };
    if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f);
  }
  history.replaceState({ d: 0 }, '', routeNow());
  render();
  setInterval(tick, 1000);
  startVisits();
  window.addEventListener('online', netChange);
  window.addEventListener('offline', netChange);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { tick(); refreshVisits(); } });
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) { S = loadState(); applyTheme(); applyFont(); applyFs(); render(true); updateBadges(); }
  });

  /* Tự hỏi quyền thông báo (ngay khi mở và ở lần chạm đầu tiên) */
  askNotif();
  const first = () => { if (!notifAsked) { notifAsked = true; askNotif(); } };
  document.addEventListener('pointerdown', first, { once: true, capture: true });

  /* Chế độ offline: đăng ký Service Worker (chính file script.js) */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('script.js').then(() => navigator.serviceWorker.ready).then((reg) => {
      const urls = MENU.map((d) => d.img);
      const sw = reg.active || navigator.serviceWorker.controller;
      if (sw) sw.postMessage({ type: 'precache', urls });
    }).catch(() => { /* bỏ qua */ });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();

})();
}
