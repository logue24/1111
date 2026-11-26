/**
 * =========================================================
 *  1277Foods — Code.gs (Google Apps Script + Google Sheets)
 *  Đếm "Lượt truy cập" — mỗi trình duyệt chỉ tính 1 lần.
 *  Google Sheets: trang tính "Counter", ô A1 = tổng lượt truy cập.
 * =========================================================
 *  CÁCH DÙNG:
 *  1. Mở Google Sheets → Tiện ích mở rộng → Apps Script → dán toàn bộ file này.
 *     (Nếu dùng dự án Apps Script riêng, dán ID của file Google Sheets
 *      vào SPREADSHEET_ID bên dưới; để trống thì tự dùng/tự tạo.)
 *  2. Bấm ▶ Chạy hàm "caiDat" (cấp quyền khi Google hỏi).
 *     → Tự tạo trang tính "Counter" với ô A1 = 0 nếu chưa có.
 *  3. Triển khai → Quản lý các bản triển khai → ✏️ Chỉnh sửa
 *     → Phiên bản: "Phiên bản mới" → Triển khai.
 *     (Làm như vậy thì đường link /exec GIỮ NGUYÊN, không cần sửa script.js.)
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
  var link = ScriptApp.getService().getUrl();
  Logger.log('✅ Đã sẵn sàng. Google Sheets: ' + sh.getParent().getUrl());
  Logger.log('📄 Trang tính: ' + SHEET_NAME + ' — ô ' + CELL + ' = ' + tong);
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

/* ---------- +1 lượt cho 1 trình duyệt ---------- */
function ghiLuot_(vid) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(vid)) return { ok: false, error: 'Mã trình duyệt không hợp lệ' };

  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = laySheet_();
    var tong = docSo_(sh);
    var isNew = false;
    /* Trình duyệt gửi lại (mạng chập chờn) thì không cộng thêm */
    if (!cache.get('v_' + vid)) {
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

/* ---------- Tìm / tạo Google Sheets và trang "Counter" ---------- */
function laySS_() {
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  if (SPREADSHEET_ID) {
    try { ss = SpreadsheetApp.openById(SPREADSHEET_ID); } catch (e) { ss = null; }
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  }
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
    var cu = ss.getSheetByName('LuotTruyCap'); /* bản cũ: mỗi dòng 1 trình duyệt */
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

/* ---------- Mở link /exec: tự hiện đường link Script ---------- */
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
