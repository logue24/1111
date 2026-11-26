/**
 * =========================================================
 *  1277Foods — Code.gs (Google Apps Script + Google Sheets)
 *  Đếm "Lượt truy cập": mỗi trình duyệt chỉ được tính 1 lần.
 * =========================================================
 *  CÁCH DÙNG (làm 1 lần):
 *  1. Vào https://script.google.com  →  Dự án mới  →  dán toàn bộ file này.
 *  2. Bấm ▶ Chạy hàm "caiDat" (cấp quyền khi Google hỏi).
 *     → Tự tạo file Google Sheets "1277Foods - Lượt truy cập".
 *  3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web
 *       - Thực thi với tư cách: Tôi
 *       - Người có quyền truy cập: Bất kỳ ai
 *     → Bấm Triển khai → Copy "URL ứng dụng web" (đuôi /exec).
 *  4. Mở đường link đó trên trình duyệt: trang sẽ TỰ HIỆN đường link Script
 *     kèm nút sao chép. Dán link vào dòng  const SCRIPT_URL = "";
 *     ở đầu file script.js trên GitHub.
 * =========================================================
 */

var SHEET_NAME = 'LuotTruyCap';
var TEN_FILE = '1277Foods - Lượt truy cập';

/* ---------- Chạy 1 lần trong trình soạn thảo ---------- */
function caiDat() {
  var sh = laySheet_();
  var tong = demTuSheet_(sh);
  CacheService.getScriptCache().put('tong', String(tong), 21600);
  var link = ScriptApp.getService().getUrl();
  Logger.log('✅ Đã sẵn sàng. Google Sheets: ' + sh.getParent().getUrl());
  Logger.log(link ? ('🔗 Link Script: ' + link)
                  : '⚠️ Chưa có link. Hãy Triển khai → Ứng dụng web, rồi chạy lại hàm này.');
  Logger.log('👁 Tổng lượt truy cập hiện tại: ' + tong);
}

/* ---------- Web app ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || '');
  if (!action) return trangLink_();

  var out;
  try {
    if (action === 'visit') out = ghiLuot_(String(p.vid || ''), String(p.ua || ''));
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

/* ---------- Ghi 1 lượt cho 1 trình duyệt (không trùng) ---------- */
function ghiLuot_(vid, ua) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(vid)) return { ok: false, error: 'Mã trình duyệt không hợp lệ' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = laySheet_();
    var isNew = false;
    var last = sh.getLastRow();
    var found = null;
    if (last >= 2) {
      found = sh.getRange(2, 1, last - 1, 1)
        .createTextFinder(vid).matchEntireCell(true).findNext();
    }
    if (!found) {
      sh.appendRow([vid, new Date(), ua.slice(0, 180)]);
      isNew = true;
    }
    var tong = demTuSheet_(sh);
    CacheService.getScriptCache().put('tong', String(tong), 21600);
    return { ok: true, count: tong, isNew: isNew };
  } finally {
    lock.releaseLock();
  }
}

function layTong_() {
  var c = CacheService.getScriptCache().get('tong');
  if (c !== null && c !== '') return Number(c);
  var tong = demTuSheet_(laySheet_());
  CacheService.getScriptCache().put('tong', String(tong), 21600);
  return tong;
}

function demTuSheet_(sh) {
  return Math.max(0, sh.getLastRow() - 1);
}

/* ---------- Tự tạo / mở Google Sheets ---------- */
function laySS_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  }
  if (!ss) ss = SpreadsheetApp.create(TEN_FILE);
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function laySheet_() {
  var ss = laySS_();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, 3).setValues([['Mã trình duyệt', 'Thời gian', 'Thiết bị']])
      .setFontWeight('bold').setBackground('#e53935').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 300);
    sh.setColumnWidth(2, 170);
    sh.setColumnWidth(3, 420);
    var macDinh = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
    if (macDinh && ss.getSheets().length > 1 && macDinh.getLastRow() === 0) ss.deleteSheet(macDinh);
  }
  return sh;
}

/* ---------- Trang tự hiện đường link Script ---------- */
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
    '<div class="n">👁 Lượt truy cập hiện tại<b>' + tong + '</b></div>' +
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
