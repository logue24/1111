/**
 * =========================================================
 *  1277Foods — Code.gs (Google Apps Script + Google Sheets)
 *  1) Đếm "Lượt truy cập": trang tính "Counter", ô A1 = tổng (mỗi trình duyệt 1 lần).
 *  2) Gửi THÔNG BÁO "Đã giao hàng thành công" đúng giờ — kể cả khi đã thoát trình duyệt.
 * =========================================================
 *  CÁCH CẬP NHẬT (giữ nguyên đường link /exec):
 *  1. Mở Google Sheets → Tiện ích mở rộng → Apps Script → xoá code cũ, dán toàn bộ file này → 💾 Lưu.
 *  2. Chọn hàm "caiDat" → bấm ▶ Chạy → Xem lại quyền → Cho phép.
 *     (Bắt buộc: cấp thêm quyền "kết nối dịch vụ bên ngoài" và "trình kích hoạt" để gửi thông báo.)
 *  3. Triển khai → Quản lý các bản triển khai → ✏️ Chỉnh sửa → Phiên bản: "Phiên bản mới" → Triển khai.
 *     → Link /exec giữ nguyên, không cần sửa script.js.
 * =========================================================
 */

var SPREADSHEET_ID = '';      // (Không bắt buộc) ID file Google Sheets chứa trang "Counter"
var SHEET_NAME = 'Counter';   // Tên trang tính
var CELL = 'A1';              // Ô lưu tổng lượt truy cập
var TEN_FILE = '1277Foods - Lượt truy cập';

/* ---------- Chạy 1 lần trong trình soạn thảo ---------- */
function caiDat() {
  var sh = laySheet_();
  var tong = docSo_(sh);
  CacheService.getScriptCache().put('tong', String(tong), 15);
  var v = layVapid_();
  var coTrigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'guiThongBao'; });
  if (!coTrigger) ScriptApp.newTrigger('guiThongBao').timeBased().everyMinutes(1).create();
  var link = ScriptApp.getService().getUrl();
  Logger.log('✅ Đã sẵn sàng. Google Sheets: ' + sh.getParent().getUrl());
  Logger.log('📄 Trang tính: ' + SHEET_NAME + ' — ô ' + CELL + ' = ' + tong);
  Logger.log('🔔 Thông báo đẩy: đã có khoá (' + v.pub.slice(0, 12) + '…) và trình kích hoạt mỗi phút.');
  Logger.log(link ? ('🔗 Link Script: ' + link)
                  : '⚠️ Chưa có link. Hãy Triển khai → Ứng dụng web, rồi chạy lại hàm này.');
}

/* ---------- Web app ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || '');
  if (!action) return trangLink_();

  var out;
  try {
    if (action === 'visit') out = ghiLuot_(String(p.vid || ''));
    else if (action === 'count') out = { ok: true, count: layTong_() };
    else if (action === 'vapid') out = { ok: true, key: layVapid_().pub };
    else if (action === 'schedule') out = henGio_(String(p.code || ''), Number(p.wait), String(p.ep || ''), String(p.site || ''));
    else out = { ok: false, error: 'action không hợp lệ' };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }

  var json = JSON.stringify(out);
  var cb = String(p.callback || '');
  if (cb && /^[A-Za-z_$][\w$.]{0,60}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   1) LƯỢT TRUY CẬP — Counter!A1
   ========================================================= */
function ghiLuot_(vid) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(vid)) return { ok: false, error: 'Mã trình duyệt không hợp lệ' };
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = laySheet_();
    var tong = docSo_(sh);
    var isNew = false;
    if (!cache.get('v_' + vid)) {          /* gửi lại do mạng chập chờn thì không cộng */
      tong += 1;
      sh.getRange(CELL).setValue(tong);
      SpreadsheetApp.flush();
      cache.put('v_' + vid, '1', 21600);
      isNew = true;
    }
    cache.put('tong', String(tong), 15);
    return { ok: true, count: tong, isNew: isNew };
  } finally {
    lock.releaseLock();
  }
}

function layTong_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('tong');
  if (c !== null && c !== '') return Number(c);
  var tong = docSo_(laySheet_());
  cache.put('tong', String(tong), 15);
  return tong;
}

function docSo_(sh) {
  var v = Number(sh.getRange(CELL).getValue());
  return isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function laySS_() {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  if (SPREADSHEET_ID) { try { ss = SpreadsheetApp.openById(SPREADSHEET_ID); } catch (e) { ss = null; } }
  if (!ss) { try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; } }
  if (!ss) {
    var id = props.getProperty('SS_ID');
    if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  }
  if (!ss) ss = SpreadsheetApp.create(TEN_FILE);
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function laySheet_() {
  var ss = laySS_();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    var cu = ss.getSheetByName('LuotTruyCap');
    var batDau = cu ? Math.max(0, cu.getLastRow() - 1) : 0;
    var trong = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0] : null;
    if (trong) { sh = trong; sh.setName(SHEET_NAME); }
    else sh = ss.insertSheet(SHEET_NAME, 0);
    sh.getRange(CELL).setValue(batDau);
  } else if (sh.getRange(CELL).getValue() === '') {
    sh.getRange(CELL).setValue(0);
  }
  return sh;
}

/* =========================================================
   2) THÔNG BÁO ĐẨY (Web Push, chuẩn VAPID) — không cần máy chủ khác
   ========================================================= */
var PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//i;

/* Trang web gửi lên lúc bấm "Đặt hàng": mã đơn + số mili-giây còn lại tới lúc giao */
function henGio_(code, wait, ep, site) {
  if (!/^1277-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { ok: false, error: 'Mã đơn không hợp lệ' };
  if (!isFinite(wait) || wait < 0 || wait > 600000) return { ok: false, error: 'Thời gian không hợp lệ' };
  if (!PUSH_HOST.test(ep) || ep.length > 900) return { ok: false, error: 'Địa chỉ nhận thông báo không hợp lệ' };
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(site)) site = 'mailto:1277foods@example.com';

  var due = Date.now() + Math.round(wait);
  PropertiesService.getScriptProperties().setProperty('q_' + code, JSON.stringify({ e: ep, due: due, s: site, n: 0 }));

  /* Chờ đúng tới giờ giao rồi gửi ngay (chính xác từng giây).
     Nếu lượt chờ này bị ngắt, trình kích hoạt "guiThongBao" mỗi phút sẽ gửi bù. */
  var con = due - Date.now();
  if (con > 0) Utilities.sleep(Math.min(con, 290000));
  var kq = Date.now() >= due - 1500 ? guiMot_(code) : null;
  return { ok: true, scheduled: true, sent: kq };
}

/* Trình kích hoạt chạy mỗi phút: gửi các thông báo đã tới giờ mà chưa gửi được */
function guiThongBao() {
  var store = PropertiesService.getScriptProperties();
  var all = store.getProperties();
  var t = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('q_') !== 0) return;
    var it;
    try { it = JSON.parse(all[k]); } catch (e) { store.deleteProperty(k); return; }
    if (t - it.due > 86400000) { store.deleteProperty(k); return; }
    if (it.due <= t + 5000) guiMot_(k.slice(2));
  });
}

function guiMot_(code) {
  var store = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var raw = null;
  try {
    raw = store.getProperty('q_' + code);
    if (raw) store.deleteProperty('q_' + code);     /* lấy ra trước để không gửi trùng */
  } finally {
    lock.releaseLock();
  }
  if (!raw) return null;
  var it = JSON.parse(raw);
  var status = guiPush_(it.e, it.s);
  if ((status === 0 || status === 429 || status >= 500) && it.n < 3) {   /* lỗi tạm thời → thử lại */
    it.n += 1;
    store.setProperty('q_' + code, JSON.stringify(it));
  }
  return status;
}

function guiPush_(ep, site) {
  if (!PUSH_HOST.test(ep)) return -1;
  var aud = ep.match(/^https:\/\/[^\/]+/)[0];
  try {
    var res = UrlFetchApp.fetch(ep, {
      method: 'post',
      contentType: 'application/octet-stream',
      payload: '',
      headers: { Authorization: 'vapid t=' + layJwt_(aud, site) + ', k=' + layVapid_().pub, TTL: '86400', Urgency: 'high' },
      muteHttpExceptions: true,
      followRedirects: false
    });
    return res.getResponseCode();
  } catch (e) {
    return 0;
  }
}

/* ---------- Khoá VAPID (tự tạo 1 lần, lưu trong Script Properties) ---------- */
function layVapid_() {
  var store = PropertiesService.getScriptProperties();
  var d = store.getProperty('VAPID_D'), pub = store.getProperty('VAPID_PUB');
  if (d && pub) return { d: BigInt('0x' + d), pub: pub };
  var priv = soNgauNhien_();
  var Q = ecMul_(priv, [EC_GX, EC_GY]);
  pub = b64u_([4].concat(bigToBytes_(Q[0], 32), bigToBytes_(Q[1], 32)));
  store.setProperty('VAPID_D', priv.toString(16));
  store.setProperty('VAPID_PUB', pub);
  return { d: priv, pub: pub };
}

/* ---------- JWT ES256 (ký bằng ECDSA P-256 + SHA-256) ---------- */
function layJwt_(aud, sub) {
  var cache = CacheService.getScriptCache();
  var key = 'jwt_' + Utilities.base64EncodeWebSafe(aud + '|' + sub).slice(0, 200);
  var c = cache.get(key);
  if (c) return c;
  var head = b64uStr_(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  var body = b64uStr_(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sub }));
  var input = head + '.' + body;
  var jwt = input + '.' + b64u_(kyEcdsa_(input, layVapid_().d));
  cache.put(key, jwt, 3600);
  return jwt;
}

/* ---------- Đường cong elliptic P-256 (BigInt) ---------- */
var EC_P = BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
var EC_N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
var EC_A = EC_P - BigInt(3);
var EC_GX = BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296');
var EC_GY = BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5');

function ecMod_(x, m) { var r = x % m; return r < BigInt(0) ? r + m : r; }
function ecInv_(x, m) {
  var a = ecMod_(x, m), b = m, x0 = BigInt(1), x1 = BigInt(0), q, t;
  while (b !== BigInt(0)) {
    q = a / b;
    t = a - q * b; a = b; b = t;
    t = x0 - q * x1; x0 = x1; x1 = t;
  }
  return ecMod_(x0, m);
}
function ecAdd_(P, Q) {
  if (!P) return Q;
  if (!Q) return P;
  var l;
  if (P[0] === Q[0]) {
    if (ecMod_(P[1] + Q[1], EC_P) === BigInt(0)) return null;
    l = ecMod_((BigInt(3) * P[0] * P[0] + EC_A) * ecInv_(BigInt(2) * P[1], EC_P), EC_P);
  } else {
    l = ecMod_((Q[1] - P[1]) * ecInv_(Q[0] - P[0], EC_P), EC_P);
  }
  var x = ecMod_(l * l - P[0] - Q[0], EC_P);
  var y = ecMod_(l * (P[0] - x) - P[1], EC_P);
  return [x, y];
}
function ecMul_(k, P) {
  var R = null, A = P;
  while (k > BigInt(0)) {
    if (k & BigInt(1)) R = ecAdd_(R, A);
    A = ecAdd_(A, A);
    k = k >> BigInt(1);
  }
  return R;
}
function kyEcdsa_(input, d) {
  var z = bytesToBig_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8));
  for (var i = 0; i < 64; i++) {
    var k = soNgauNhien_();
    var R = ecMul_(k, [EC_GX, EC_GY]);
    var r = ecMod_(R[0], EC_N);
    if (r === BigInt(0)) continue;
    var s = ecMod_(ecInv_(k, EC_N) * (z + r * d), EC_N);
    if (s === BigInt(0)) continue;
    return bigToBytes_(r, 32).concat(bigToBytes_(s, 32));
  }
  throw new Error('Không ký được');
}
function soNgauNhien_() {
  var seed = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random();
  var x = bytesToBig_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8));
  return ecMod_(x, EC_N - BigInt(1)) + BigInt(1);
}
function bytesToBig_(bytes) {
  var h = '';
  for (var i = 0; i < bytes.length; i++) { var b = bytes[i] & 255; h += (b < 16 ? '0' : '') + b.toString(16); }
  return BigInt('0x' + (h || '0'));
}
function bigToBytes_(x, len) {
  var h = x.toString(16);
  while (h.length < len * 2) h = '0' + h;
  var out = [];
  for (var i = 0; i < len; i++) { var v = parseInt(h.substr(i * 2, 2), 16); out.push(v > 127 ? v - 256 : v); }
  return out;
}
function b64u_(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function b64uStr_(s) { return Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ''); }

/* =========================================================
   Mở link /exec: tự hiện đường link Script
   ========================================================= */
function trangLink_() {
  var link = ScriptApp.getService().getUrl() || '';
  var tong = 0;
  try { tong = layTong_(); } catch (e) {}
  var safe = String(link).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
  var html =
    '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>1277Foods – Link Script</title><style>' +
    'body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff8f3;color:#2b1d16;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}' +
    '.c{background:#fff;border-radius:22px;box-shadow:0 12px 40px rgba(229,57,53,.15);padding:24px;max-width:640px;width:100%;box-sizing:border-box}' +
    'h1{margin:0 0 6px;font-size:22px}h1 b{color:#e53935}p{color:#7a6559;margin:0 0 16px;line-height:1.5}' +
    '.l{background:#fff1e8;border:2px dashed #e53935;border-radius:14px;padding:14px;word-break:break-all;font-family:ui-monospace,monospace;font-size:14px}' +
    'button{margin-top:14px;width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:700;background:#e53935;color:#fff;cursor:pointer}' +
    '.n{margin-top:18px;text-align:center;font-size:14px;color:#7a6559}.n b{display:block;font-size:44px;color:#2b1d16}' +
    '</style></head><body><div class="c">' +
    '<h1>🍜 1277<b>Foods</b> – Link Script</h1>' +
    '<p>Sao chép đường link bên dưới và dán vào <code>const SCRIPT_URL = "";</code> ở đầu file <b>script.js</b>.</p>' +
    '<div class="l" id="l">' + (safe || 'Chưa triển khai Ứng dụng web') + '</div>' +
    '<button id="b">📋 Sao chép link</button>' +
    '<div class="n">👁 Lượt truy cập (Counter!' + CELL + ')<b>' + tong + '</b></div>' +
    '</div><script>' +
    'document.getElementById("b").onclick=function(){var t=document.getElementById("l").textContent;' +
    'var ok=function(){document.getElementById("b").textContent="✅ Đã sao chép!"};' +
    'if(navigator.clipboard){navigator.clipboard.writeText(t).then(ok,function(){f(t)})}else f(t);' +
    'function f(t){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();ok()}};' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('1277Foods – Link Script')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
