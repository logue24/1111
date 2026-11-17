/**
 * ĐIỂM DANH - Backend (Google Apps Script + Google Sheets)
 *
 * CÀI ĐẶT:
 * 1. Tạo Google Sheet mới > Tiện ích mở rộng > Apps Script > dán toàn bộ file này.
 * 2. Chạy hàm setup() một lần (cấp quyền khi được hỏi). Hàm tạo 2 tab: Users, Log.
 * 3. Nhập người dùng vào tab Users: Phone, Birth (dd/mm/yyyy), Name. Để trống các cột còn lại.
 * 4. Triển khai > Tùy chọn triển khai mới > Ứng dụng web
 *    Execute as: Me | Who has access: Anyone > Deploy > copy URL kết thúc bằng /exec.
 * 5. Sửa code sau này: phải Deploy > Manage deployments > Edit > New version.
 */
const TZ = 'Asia/Ho_Chi_Minh';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const u = ss.getSheetByName('Users') || ss.insertSheet('Users');
  const l = ss.getSheetByName('Log') || ss.insertSheet('Log');
  // Cột văn bản thuần để Sheets không tự đổi 0901... hoặc ngày thành số/Date
  u.getRange('A:B').setNumberFormat('@');
  u.getRange('G:H').setNumberFormat('@');
  l.getRange('A:B').setNumberFormat('@');
  l.getRange('D:E').setNumberFormat('@');
  if (u.getLastRow() === 0) {
    u.appendRow(['Phone', 'Birth', 'Name', 'Streak', 'BestStreak', 'Total', 'LastDate', 'LastTime']);
    u.appendRow(['0901234567', '01/01/2000', 'Nguyễn Văn A', 0, 0, 0, '', '']);
    u.setFrozenRows(1);
  }
  if (l.getLastRow() === 0) {
    l.appendRow(['Timestamp', 'Phone', 'Name', 'Date', 'Time', 'Streak', 'Action']);
    l.setFrozenRows(1);
  }
}

function doGet() { return out_({ ok: true, msg: 'Điểm danh API đang chạy' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const req = JSON.parse(e.postData.contents);
    const u = findUser_(req.phone, req.dob);
    if (!u) return out_({ ok: false, code: 'AUTH', error: 'Sai số điện thoại hoặc ngày sinh.' });

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    const log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
    const now = new Date();
    const today = fmt_(now, 'yyyy-MM-dd');

    if (req.action === 'login') return out_({ ok: true, data: info_(u) });

    if (req.action === 'checkin') {
      if (u.lastDate === today) {
        return out_({ ok: false, code: 'ALREADY', error: 'Hôm nay bạn đã điểm danh rồi.', data: info_(u) });
      }
      const streak = (u.lastDate === yday_() ? u.streak : 0) + 1;
      const best = Math.max(u.best, streak);
      const time = fmt_(now, 'HH:mm:ss');
      const total = u.total + 1;
      sh.getRange(u.row, 4, 1, 5).setValues([[streak, best, total, today, time]]);
      log.appendRow([fmt_(now, 'yyyy-MM-dd HH:mm:ss'), u.phone, u.name, today, time, streak, 'CHECKIN']);
      SpreadsheetApp.flush();
      return out_({ ok: true, data: info_(Object.assign(u, { streak, best, total, lastDate: today, lastTime: time })) });
    }

    if (req.action === 'reset') {
      if (req.confirm !== true) return out_({ ok: false, code: 'NOCONFIRM', error: 'Cần xác nhận để đặt lại.' });
      sh.getRange(u.row, 4).setValue(0); // chỉ đặt chuỗi về 0, giữ lịch sử và không cho điểm danh lại trong ngày
      log.appendRow([fmt_(now, 'yyyy-MM-dd HH:mm:ss'), u.phone, u.name, today, fmt_(now, 'HH:mm:ss'), 0, 'RESET']);
      SpreadsheetApp.flush();
      return out_({ ok: true, data: info_(Object.assign(u, { streak: 0 })) });
    }

    return out_({ ok: false, code: 'BAD', error: 'Yêu cầu không hợp lệ.' });
  } catch (err) {
    return out_({ ok: false, code: 'SERVER', error: 'Lỗi máy chủ, vui lòng thử lại: ' + err.message });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function findUser_(phone, dob) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  const n = sh.getLastRow() - 1;
  const p = normPhone_(phone), d = normDate_(dob);
  if (n < 1 || !p || !d) return null;
  const rows = sh.getRange(2, 1, n, 8).getValues();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (normPhone_(r[0]) === p && normDate_(r[1]) === d) {
      return {
        row: i + 2, phone: String(r[0]), name: String(r[2] || ''),
        streak: Number(r[3]) || 0, best: Number(r[4]) || 0, total: Number(r[5]) || 0,
        lastDate: normDate_(r[6]), lastTime: r[7] instanceof Date ? fmt_(r[7], 'HH:mm:ss') : String(r[7] || '')
      };
    }
  }
  return null;
}

function info_(u) {
  const t = fmt_(new Date(), 'yyyy-MM-dd');
  const alive = u.lastDate === t || u.lastDate === yday_();
  return {
    name: u.name, streak: alive ? u.streak : 0, best: u.best, total: u.total,
    checkedToday: u.lastDate === t, lastDate: u.lastDate, lastTime: u.lastTime
  };
}

function normPhone_(v) {
  let s = String(v == null ? '' : v).replace(/\D/g, '');
  if (s.indexOf('84') === 0 && s.length >= 11) s = s.slice(2);
  s = s.replace(/^0+/, '');
  return s.length >= 8 ? s : '';
}

// Chuẩn hóa về yyyy-MM-dd từ Date, yyyy-MM-dd hoặc dd/MM/yyyy
function normDate_(v) {
  if (v instanceof Date) return fmt_(v, 'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function fmt_(d, f) { return Utilities.formatDate(d, TZ, f); }
function yday_() { return fmt_(new Date(Date.now() - 86400000), 'yyyy-MM-dd'); }
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
