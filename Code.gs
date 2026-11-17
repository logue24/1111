/**
 * ĐIỂM DANH — Google Apps Script (Web App)
 * Google Sheets là cơ sở dữ liệu thật. Dán toàn bộ file này vào Apps Script
 * của file Google Sheets (Tiện ích mở rộng → Apps Script), rồi chạy hàm khoiTao() một lần.
 *
 * Tab "ThanhVien": danh sách đăng nhập + trạng thái chuỗi của từng người
 *   A: SĐT | B: Ngày sinh | C: Họ tên            ← bạn nhập
 *   D..I: chuỗi, chuỗi dài nhất, tổng ngày, ngày/thời gian điểm danh cuối, reset cuối  ← script tự ghi
 * Tab "DiemDanh": nhật ký, mỗi lần điểm danh/reset thêm 1 dòng (không bao giờ xóa).
 */

var TZ = 'Asia/Ho_Chi_Minh';
// ID file Google Sheets làm cơ sở dữ liệu (đoạn giữa /d/ và /edit trong link Google Sheets).
// Link: https://docs.google.com/spreadsheets/d/162_054G8U-VIbS1X-ZXCVlXG6_eRfXlpcdOMLGkh1Jc/edit
// Để trống = dùng file Sheets đang gắn với script, hoặc tự tạo file mới khi chạy khoiTao().
var SHEET_ID = '162_054G8U-VIbS1X-ZXCVlXG6_eRfXlpcdOMLGkh1Jc';
var ssCache_ = null;
var SHEET_MEMBERS = 'ThanhVien';
var SHEET_LOG = 'DiemDanh';
var MEMBER_HEADERS = ['SĐT', 'Ngày sinh', 'Họ tên', 'Chuỗi hiện tại', 'Chuỗi dài nhất', 'Tổng ngày', 'Ngày điểm danh cuối', 'Thời gian điểm danh cuối', 'Reset lần cuối'];
var MEMBER_FORMATS = ['@', '@', '@', '0', '0', '0', '@', '@', '@'];
var LOG_HEADERS = ['Thời gian', 'SĐT', 'Họ tên', 'Loại', 'Ngày', 'Chuỗi'];
var LOG_FORMATS = ['@', '@', '@', '@', '@', '0'];
var MEMBER_COLS = 9;
var LOG_COLS = 6;
var MAX_FAILS = 5;          // sai quá 5 lần thì khóa
var LOCK_SECONDS = 900;     // khóa 15 phút
var HISTORY_LIMIT = 14;     // số lần điểm danh gần nhất trả về cho giao diện
var LOG_SCAN_LIMIT = 3000;  // chỉ quét tối đa 3000 dòng cuối của nhật ký

/* ===================== KHỞI TẠO (chạy 1 lần) ===================== */

function khoiTao() {
  // Ưu tiên SHEET_ID (nếu có), sau đó đến file Sheets đang gắn với script
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var created = false;
  if (!ss) {
    // Script tạo riêng ở script.google.com (không gắn với file Sheets)
    var props = PropertiesService.getScriptProperties();
    var id = SHEET_ID || props.getProperty('SHEET_ID');
    if (id) {
      ss = SpreadsheetApp.openById(id);
    } else {
      ss = SpreadsheetApp.create('Điểm Danh - Cơ sở dữ liệu');
      created = true;
    }
    props.setProperty('SHEET_ID', ss.getId());       // nhớ lại để Web App dùng đúng file này
  }
  ssCache_ = ss;
  ss.setSpreadsheetTimeZone(TZ);
  var members = ss.getSheetByName(SHEET_MEMBERS) || ss.insertSheet(SHEET_MEMBERS);
  var log = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG);
  setupSheet_(members, MEMBER_HEADERS, MEMBER_FORMATS);
  setupSheet_(log, LOG_HEADERS, LOG_FORMATS);
  if (members.getLastRow() < 2) {
    members.getRange(2, 1, 1, 3).setValues([['0900000000', '01/01/2000', 'Nguyễn Văn A (mẫu - hãy xóa)']]);
  }
  if (created) {
    // file mới tạo có sẵn 1 tab trống mặc định → xóa cho gọn
    ss.getSheets().forEach(function (s) {
      var n = s.getName();
      if (n !== SHEET_MEMBERS && n !== SHEET_LOG) ss.deleteSheet(s);
    });
  }
  Logger.log('Đã khởi tạo xong. File Google Sheets: ' + ss.getUrl());
}

/** Lấy file Google Sheets đang dùng làm cơ sở dữ liệu (gắn sẵn, hoặc theo ID đã lưu bởi khoiTao). */
function getSS_() {
  if (ssCache_) return ssCache_;
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!id) throw new Error('Chưa có file Google Sheets. Hãy chạy hàm khoiTao() trước.');
    ss = SpreadsheetApp.openById(id);
  }
  ssCache_ = ss;
  return ss;
}

function setupSheet_(sheet, headers, formats) {
  var maxRows = sheet.getMaxRows();
  for (var i = 0; i < formats.length; i++) {
    sheet.getRange(1, i + 1, maxRows, 1).setNumberFormat(formats[i]);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8eaf6');
  sheet.setFrozenRows(1);
}

/* ===================== ĐIỂM VÀO WEB APP ===================== */

function doGet() {
  return json_({ ok: true, message: 'API Điểm Danh đang hoạt động.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var req;
    try {
      req = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    } catch (parseErr) {
      return json_(fail_('BAD_REQUEST', 'Yêu cầu không hợp lệ.'));
    }
    // Khóa toàn cục: 2 người bấm cùng lúc vẫn ghi đúng, không bị ghi trùng/mất dữ liệu
    locked = lock.tryLock(25000);
    if (!locked) {
      return json_(fail_('BUSY', 'Hệ thống đang bận, vui lòng thử lại sau vài giây.'));
    }
    return json_(handle_(req || {}, new Date()));
  } catch (err) {
    return json_(fail_('SERVER', 'Lỗi máy chủ: ' + (err && err.message ? err.message : err)));
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (x) { /* bỏ qua */ }
    }
  }
}

/* ===================== XỬ LÝ CHÍNH ===================== */

function handle_(req, now) {
  var action = String(req.action || '');
  if (action !== 'login' && action !== 'checkin' && action !== 'reset') {
    return fail_('BAD_ACTION', 'Thao tác không hợp lệ.');
  }
  var phone = normPhone_(req.phone);
  var dob = normDate_(req.dob);
  if (!phone) return fail_('BAD_PHONE', 'Số điện thoại không hợp lệ.');
  if (!dob) return fail_('BAD_DOB', 'Ngày sinh không hợp lệ.');

  var cache = CacheService.getScriptCache();
  var failKey = 'fail_' + phone;
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_FAILS) {
    return fail_('LOCKED', 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  }

  var member = findMember_(phone, dob);
  if (!member) {
    cache.put(failKey, String(fails + 1), LOCK_SECONDS);
    return fail_('NOT_FOUND', 'Số điện thoại hoặc ngày sinh không đúng.');
  }
  if (fails) cache.remove(failKey);

  if (action === 'checkin') return checkin_(member, now);
  if (action === 'reset') return reset_(member, req, now);
  return ok_('Đăng nhập thành công.', view_(member.row, now), {});
}

function findMember_(phone, dob) {
  var sh = sheet_(SHEET_MEMBERS);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var values = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (normPhone_(values[i][0]) === phone && normDate_(values[i][1]) === dob) {
      return { row: i + 2 };
    }
  }
  return null;
}

function checkin_(member, now) {
  var sh = sheet_(SHEET_MEMBERS);
  var v = readRow_(member.row);
  var phone = normPhone_(v[0]);
  var name = String(v[2] || '').trim() || phone;
  var today = fmt_(now, 'yyyy-MM-dd');
  var timeStr = fmt_(now, 'yyyy-MM-dd HH:mm:ss');
  var lastDate = normDate_(v[6]);

  if (lastDate === today) {
    return ok_('Hôm nay bạn đã điểm danh rồi.', view_(member.row, now), { already: true });
  }

  var gap = lastDate ? daysBetween_(lastDate, today) : null;
  var streak = (gap === 1) ? num_(v[3]) + 1 : 1;
  var best = Math.max(num_(v[4]), streak);
  var total = num_(v[5]) + 1;

  var range = sh.getRange(member.row, 4, 1, 5);
  range.setNumberFormats([['0', '0', '0', '@', '@']]);
  range.setValues([[streak, best, total, today, timeStr]]);
  appendRow_(sheet_(SHEET_LOG), [timeStr, phone, name, 'DIEMDANH', today, streak], LOG_FORMATS);
  SpreadsheetApp.flush();

  return ok_('Điểm danh thành công!', view_(member.row, now), { already: false });
}

function reset_(member, req, now) {
  if (String(req.confirm || '') !== 'RESET') {
    return fail_('NO_CONFIRM', 'Bạn cần xác nhận trước khi reset.');
  }
  var sh = sheet_(SHEET_MEMBERS);
  var v = readRow_(member.row);
  var phone = normPhone_(v[0]);
  var name = String(v[2] || '').trim() || phone;
  var today = fmt_(now, 'yyyy-MM-dd');
  var timeStr = fmt_(now, 'yyyy-MM-dd HH:mm:ss');

  var range = sh.getRange(member.row, 4, 1, 6);
  range.setNumberFormats([['0', '0', '0', '@', '@', '@']]);
  range.setValues([[0, 0, 0, '', '', timeStr]]);
  appendRow_(sheet_(SHEET_LOG), [timeStr, phone, name, 'RESET', today, 0], LOG_FORMATS);
  SpreadsheetApp.flush();

  return ok_('Đã reset dữ liệu điểm danh của bạn.', view_(member.row, now), {});
}

/* ===================== DỮ LIỆU TRẢ VỀ GIAO DIỆN ===================== */

function view_(row, now) {
  var v = readRow_(row);
  var phone = normPhone_(v[0]);
  var today = fmt_(now, 'yyyy-MM-dd');
  var lastDate = normDate_(v[6]);
  var gap = lastDate ? daysBetween_(lastDate, today) : null;
  var streak = num_(v[3]);
  var alive = (gap === 0 || gap === 1);   // chuỗi còn hiệu lực nếu hôm nay hoặc hôm qua đã điểm danh
  return {
    name: String(v[2] || '').trim() || phone,
    phone: phone,
    today: today,
    serverTime: fmt_(now, 'yyyy-MM-dd HH:mm:ss'),
    streak: alive ? streak : 0,
    bestStreak: num_(v[4]),
    total: num_(v[5]),
    checkedToday: gap === 0,
    atRisk: gap === 1 && streak > 0,
    lastDate: lastDate,
    lastTime: timeText_(v[7]),
    recent: history_(phone)
  };
}

function history_(phone) {
  var sh = sheet_(SHEET_LOG);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - LOG_SCAN_LIMIT + 1);
  var rows = sh.getRange(start, 1, last - start + 1, LOG_COLS).getValues();
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < HISTORY_LIMIT; i--) {
    if (normPhone_(rows[i][1]) !== phone) continue;
    var type = String(rows[i][3]);
    if (type === 'RESET') break;   // chỉ hiển thị lịch sử sau lần reset gần nhất
    if (type === 'DIEMDANH') {
      out.push({ time: timeText_(rows[i][0]), date: normDate_(rows[i][4]), streak: num_(rows[i][5]) });
    }
  }
  return out;
}

/* ===================== TIỆN ÍCH ===================== */

function sheet_(name) {
  var sh = getSS_().getSheetByName(name);
  if (!sh) throw new Error('Chưa có tab "' + name + '". Hãy chạy hàm khoiTao() trước.');
  return sh;
}

function readRow_(row) {
  return sheet_(SHEET_MEMBERS).getRange(row, 1, 1, MEMBER_COLS).getValues()[0];
}

function appendRow_(sh, values, formats) {
  var row = sh.getLastRow() + 1;
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 500);
  var range = sh.getRange(row, 1, 1, values.length);
  range.setNumberFormats([formats]);
  range.setValues([values]);
}

function fmt_(date, pattern) {
  return Utilities.formatDate(date, TZ, pattern);
}

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

function num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function timeText_(v) {
  if (isDate_(v)) return isNaN(v.getTime()) ? '' : fmt_(v, 'yyyy-MM-dd HH:mm:ss');
  return String(v == null ? '' : v);
}

/** Chuẩn hóa SĐT về dạng 0xxxxxxxxx (chấp nhận +84, 84, số bị mất số 0 đầu do Sheets). */
function normPhone_(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.indexOf('84') === 0 && d.length === 11) d = '0' + d.substring(2);
  if (d.length === 9) d = '0' + d;
  return /^0\d{9}$/.test(d) ? d : '';
}

/** Chuẩn hóa ngày về yyyy-MM-dd (chấp nhận dd/MM/yyyy, yyyy-MM-dd, ô kiểu ngày của Sheets). */
function normDate_(v) {
  if (isDate_(v)) {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, getSS_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v == null ? '' : v).trim();
  var m, y, mo, d;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T].*)?$/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) {
    d = +m[1]; mo = +m[2]; y = +m[3];
  } else {
    return '';
  }
  var t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return '';
  return y + '-' + pad2_(mo) + '-' + pad2_(d);
}

function daysBetween_(a, b) {
  var pa = a.split('-'), pb = b.split('-');
  var ta = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
  var tb = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
  return Math.round((tb - ta) / 86400000);
}

function ok_(message, data, extra) {
  var out = { ok: true, message: message, data: data };
  for (var k in extra) { if (extra.hasOwnProperty(k)) out[k] = extra[k]; }
  return out;
}

function fail_(code, message) {
  return { ok: false, code: code, message: message };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
