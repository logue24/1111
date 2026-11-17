/* =========================================================
 * ĐIỂM DANH — giao diện chạy trên GitHub Pages
 * Cơ sở dữ liệu: Google Sheets thông qua Google Apps Script
 * ========================================================= */
(function () {
  'use strict';

  // ============ CẤU HÌNH — CHỈ CẦN SỬA DÒNG API_URL ============
  var CONFIG = {
    API_URL: 'DAN_URL_WEB_APP_VAO_DAY', // dạng https://script.google.com/macros/s/XXXX/exec
    TIMEOUT_MS: 30000,
    MIN_REFRESH_MS: 30000
  };
  // ==============================================================

  var STORE_KEY = 'diemdanh.session.v1';
  var AUTH_CODES = { NOT_FOUND: 1, BAD_PHONE: 1, BAD_DOB: 1 };
  var WEEKDAY_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  var WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  var state = {
    phone: '',
    dob: '',
    data: null,
    busy: false,       // đang gửi điểm danh
    loggingIn: false,
    resetting: false,
    refreshing: false,
    lastSync: 0
  };

  // ============ TIỆN ÍCH ============
  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isConfigured() { return /^https:\/\/script\.google\.com\/.+/.test(CONFIG.API_URL); }

  function vnNow() { return new Date(Date.now() + 7 * 3600 * 1000); } // Việt Nam GMT+7, không có giờ mùa hè
  function vnToday() { return vnNow().toISOString().slice(0, 10); }
  function vnClock() { return vnNow().toISOString().slice(11, 19); }

  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function addDays(ymd, n) {
    var p = parseYmd(ymd);
    if (!p) return '';
    var t = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
  }
  function weekdayIndex(ymd) {
    var p = parseYmd(ymd);
    return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : 0;
  }
  function fmtDate(s) {
    var p = parseYmd(s);
    return p ? pad2(p.d) + '/' + pad2(p.m) + '/' + p.y : '';
  }
  function timeOnly(s) {
    var m = /(\d{2}:\d{2}:\d{2})/.exec(s || '');
    return m ? m[1] : '';
  }
  function fmtDateTime(s) {
    var t = timeOnly(s), d = fmtDate(s);
    return t && d ? t + ' ' + d : '';
  }

  function cleanPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('84') === 0 && d.length === 11) d = '0' + d.slice(2);
    return d;
  }
  function validPhone(d) { return /^0\d{9}$/.test(d); }

  // ============ LƯU PHIÊN ĐĂNG NHẬP ============
  function loadSession() {
    try {
      var raw = localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY);
      var s = raw ? JSON.parse(raw) : null;
      return s && s.phone && s.dob ? s : null;
    } catch (e) { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* bỏ qua */ }
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* bỏ qua */ }
  }
  function saveSession(s, remember) {
    clearSession();
    try { (remember ? localStorage : sessionStorage).setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* bỏ qua */ }
  }

  // ============ GỌI MÁY CHỦ ============
  function makeErr(code, message, uncertain) {
    var e = new Error(message);
    e.code = code;
    e.uncertain = !!uncertain; // true: không biết máy chủ đã xử lý hay chưa
    return e;
  }

  async function api(payload) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CONFIG.TIMEOUT_MS) : null;
    try {
      // text/plain để trình duyệt không gửi preflight (Apps Script không xử lý OPTIONS)
      var res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: ctrl ? ctrl.signal : undefined
      });
      var text = await res.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        throw makeErr('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ. Kiểm tra lại URL Web App và quyền truy cập "Bất kỳ ai".', true);
      }
    } catch (err) {
      if (err && err.code) throw err;
      if (err && err.name === 'AbortError') {
        throw makeErr('TIMEOUT', 'Máy chủ phản hồi quá lâu. Kiểm tra mạng rồi thử lại.', true);
      }
      throw makeErr('NETWORK', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', true);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function request(action, phone, dob, extra) {
    var body = { action: action, phone: phone, dob: dob };
    if (extra) for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) body[k] = extra[k]; }
    var res = await api(body);
    if (!res || res.ok !== true) {
      throw makeErr((res && res.code) || 'SERVER', (res && res.message) || 'Có lỗi xảy ra, vui lòng thử lại.', false);
    }
    return res;
  }

  // ============ GIAO DIỆN CHUNG ============
  function show(name) {
    ['loading', 'login', 'main'].forEach(function (v) { $('view-' + v).hidden = (v !== name); });
  }

  var toastTimer = null;
  function toast(msg, type) {
    var el = $('toast');
    el.textContent = msg;
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3800);
  }

  function showLoginError(msg) {
    var el = $('login-error');
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function setLoginBusy(on) {
    var b = $('login-btn');
    b.disabled = on;
    b.textContent = on ? 'Đang đăng nhập…' : 'Đăng nhập';
  }

  // ============ HIỂN THỊ MÀN HÌNH CHÍNH ============
  function renderMain() {
    var d = state.data;
    if (!d) return;
    $('user-name').textContent = d.name;
    $('stat-streak').textContent = d.streak;
    $('stat-best').textContent = d.bestStreak;
    $('stat-total').textContent = d.total;
    $('date-text').textContent = WEEKDAY_LONG[weekdayIndex(d.today)] + ', ' + fmtDate(d.today);
    $('last-time').textContent = d.lastTime
      ? 'Lần điểm danh gần nhất: ' + fmtDateTime(d.lastTime)
      : 'Bạn chưa điểm danh lần nào.';
    renderCheckin();
    renderWeek();
    renderHistory();
  }

  function renderCheckin() {
    var d = state.data;
    if (!d) return;
    var btn = $('checkin-btn'), label = $('checkin-label'), sub = $('checkin-sub'), msg = $('status-msg');
    btn.classList.remove('is-busy', 'is-done');
    msg.className = 'status';

    if (state.busy) {
      btn.disabled = true;
      btn.classList.add('is-busy');
      label.textContent = 'ĐANG LƯU…';
      sub.textContent = 'Vui lòng đợi';
      msg.textContent = '';
      return;
    }
    if (d.checkedToday) {
      btn.disabled = true;
      btn.classList.add('is-done');
      label.textContent = 'ĐÃ ĐIỂM DANH';
      sub.textContent = 'Lúc ' + timeOnly(d.lastTime);
      msg.textContent = 'Đã ghi nhận hôm nay. Hẹn gặp lại bạn ngày mai!';
      msg.classList.add('ok');
      return;
    }
    btn.disabled = false;
    label.textContent = 'ĐIỂM DANH';
    sub.textContent = 'Nhấn để ghi nhận hôm nay';
    if (d.atRisk) {
      msg.textContent = 'Hôm qua bạn đã điểm danh — điểm danh hôm nay để giữ chuỗi nhé!';
      msg.classList.add('warn');
    } else if (d.lastDate) {
      msg.textContent = 'Chuỗi đã bị ngắt. Điểm danh hôm nay để bắt đầu chuỗi mới.';
      msg.classList.add('warn');
    } else {
      msg.textContent = 'Nhấn nút để điểm danh lần đầu.';
    }
  }

  function renderWeek() {
    var d = state.data;
    var box = $('week');
    box.textContent = '';
    var done = {};
    (d.recent || []).forEach(function (r) { if (r.date) done[r.date] = true; });
    for (var i = 6; i >= 0; i--) {
      var day = addDays(d.today, -i);
      var el = document.createElement('div');
      el.className = 'day' + (done[day] ? ' on' : '') + (i === 0 ? ' today' : '');
      var lb = document.createElement('span');
      lb.className = 'day-label';
      lb.textContent = WEEKDAY_SHORT[weekdayIndex(day)];
      var dot = document.createElement('span');
      dot.className = 'day-dot';
      dot.textContent = done[day] ? '✓' : String(parseYmd(day).d);
      el.appendChild(lb);
      el.appendChild(dot);
      box.appendChild(el);
    }
  }

  function renderHistory() {
    var list = $('history');
    list.textContent = '';
    var rows = state.data.recent || [];
    if (!rows.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Chưa có lịch sử điểm danh.';
      list.appendChild(li);
      return;
    }
    rows.forEach(function (r) {
      var li = document.createElement('li');
      var when = document.createElement('div');
      when.className = 'when';
      var a = document.createElement('strong');
      a.textContent = fmtDate(r.date || r.time);
      var b = document.createElement('span');
      b.textContent = timeOnly(r.time);
      when.appendChild(a);
      when.appendChild(b);
      var pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = '🔥 Chuỗi ' + r.streak;
      li.appendChild(when);
      li.appendChild(pill);
      list.appendChild(li);
    });
  }

  // ============ ĐĂNG NHẬP / ĐĂNG XUẤT ============
  async function doLogin(phone, dob, remember, auto) {
    state.loggingIn = true;
    if (auto) show('loading'); else setLoginBusy(true);
    try {
      var res = await request('login', phone, dob);
      state.phone = phone;
      state.dob = dob;
      state.data = res.data;
      state.lastSync = Date.now();
      if (!auto) saveSession({ phone: phone, dob: dob }, remember);
      renderMain();
      show('main');
    } catch (err) {
      if (auto) {
        if (AUTH_CODES[err.code]) {
          clearSession();
        } else {
          $('phone').value = phone;
          if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) $('dob').value = dob;
        }
      }
      show('login');
      showLoginError(err.message);
    } finally {
      state.loggingIn = false;
      setLoginBusy(false);
    }
  }

  async function onLoginSubmit(ev) {
    ev.preventDefault();
    if (state.loggingIn) return;
    var phone = cleanPhone($('phone').value);
    var dob = $('dob').value;
    if (!isConfigured()) return showLoginError('Chưa cấu hình URL Web App trong script.js.');
    if (!validPhone(phone)) return showLoginError('Số điện thoại phải gồm 10 số và bắt đầu bằng 0.');
    if (!dob) return showLoginError('Vui lòng chọn ngày sinh.');
    showLoginError('');
    await doLogin(phone, dob, $('remember').checked, false);
  }

  function logout(message) {
    clearSession();
    state.phone = '';
    state.dob = '';
    state.data = null;
    state.busy = false;
    closeModal();
    $('phone').value = '';
    $('dob').value = '';
    showLoginError(message || '');
    show('login');
  }

  function onAuthLost(err) {
    logout(err && err.message ? err.message : 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
  }

  // ============ ĐỒNG BỘ LẠI DỮ LIỆU ============
  async function refresh(force) {
    if (!state.data || state.busy || state.resetting || state.refreshing) return;
    if (!force && Date.now() - state.lastSync < CONFIG.MIN_REFRESH_MS) return;
    state.refreshing = true;
    try {
      var res = await request('login', state.phone, state.dob);
      state.data = res.data;
      renderMain();
    } catch (err) {
      if (AUTH_CODES[err.code]) onAuthLost(err);
    } finally {
      state.lastSync = Date.now();
      state.refreshing = false;
    }
  }

  // ============ ĐIỂM DANH ============
  async function onCheckin() {
    if (state.busy || state.resetting || !state.data || state.data.checkedToday) return;
    state.busy = true;
    renderCheckin();
    var failure = null;
    try {
      var res = await request('checkin', state.phone, state.dob);
      state.data = res.data;
      state.lastSync = Date.now();
      state.busy = false;
      renderMain();
      toast(res.already
        ? 'Hôm nay bạn đã điểm danh rồi.'
        : 'Điểm danh thành công! Chuỗi ' + res.data.streak + ' ngày 🔥', 'ok');
      return;
    } catch (err) {
      failure = err;
    }
    state.busy = false;
    if (failure.uncertain) {
      // Không rõ máy chủ đã ghi hay chưa → hỏi lại máy chủ để biết chắc
      await refresh(true);
      if (state.data && state.data.checkedToday) {
        renderMain();
        toast('Đã ghi nhận điểm danh.', 'ok');
        return;
      }
    }
    if (AUTH_CODES[failure.code]) return onAuthLost(failure);
    if (state.data) renderCheckin();
    toast(failure.message, 'error');
  }

  // ============ RESET (CÓ XÁC NHẬN) ============
  function openModal() {
    $('reset-input').value = '';
    $('reset-confirm').disabled = true;
    $('modal-error').hidden = true;
    $('modal').hidden = false;
    $('reset-input').focus();
  }
  function closeModal() {
    $('modal').hidden = true;
  }
  function showModalError(msg) {
    var el = $('modal-error');
    el.textContent = msg || '';
    el.hidden = !msg;
  }
  function setResetBusy(on) {
    $('reset-confirm').disabled = on || !isResetTyped();
    $('reset-cancel').disabled = on;
    $('reset-input').disabled = on;
    $('reset-confirm').textContent = on ? 'Đang reset…' : 'Xác nhận reset';
  }
  function isResetTyped() {
    return $('reset-input').value.trim().toUpperCase() === 'RESET';
  }

  async function onResetConfirm() {
    if (state.resetting || state.busy || !isResetTyped()) return;
    state.resetting = true;
    showModalError('');
    setResetBusy(true);
    try {
      var res = await request('reset', state.phone, state.dob, { confirm: 'RESET' });
      state.data = res.data;
      state.lastSync = Date.now();
      closeModal();
      renderMain();
      toast('Đã reset dữ liệu điểm danh.', 'ok');
    } catch (err) {
      if (AUTH_CODES[err.code]) {
        state.resetting = false;
        setResetBusy(false);
        return onAuthLost(err);
      }
      showModalError(err.message);
    } finally {
      state.resetting = false;
      setResetBusy(false);
    }
  }

  // ============ ĐỒNG HỒ ============
  function tick() {
    if ($('view-main').hidden) return;
    $('clock').textContent = vnClock();
    if (state.data && vnToday() !== state.data.today) refresh(false); // qua ngày mới
  }

  // ============ KHỞI ĐỘNG ============
  function init() {
    $('dob').max = vnToday();
    if (!isConfigured()) $('config-warning').hidden = false;

    $('login-form').addEventListener('submit', onLoginSubmit);
    $('checkin-btn').addEventListener('click', onCheckin);
    $('logout-btn').addEventListener('click', function () { logout(''); });
    $('reset-btn').addEventListener('click', openModal);
    $('reset-cancel').addEventListener('click', closeModal);
    $('reset-confirm').addEventListener('click', onResetConfirm);
    $('reset-input').addEventListener('input', function () {
      $('reset-confirm').disabled = state.resetting || !isResetTyped();
    });
    $('reset-input').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); onResetConfirm(); }
    });
    $('modal').addEventListener('click', function (ev) {
      if (ev.target === $('modal') && !state.resetting) closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !$('modal').hidden && !state.resetting) closeModal();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') refresh(false);
    });

    setInterval(tick, 1000);
    $('clock').textContent = vnClock();

    var s = loadSession();
    if (s && isConfigured()) {
      doLogin(s.phone, s.dob, true, true);
    } else {
      show('login');
    }
  }

  init();
})();
