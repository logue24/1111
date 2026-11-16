const $ = id => document.getElementById(id);
let authMode = "login";
let dashboard = null;
let toastTimer;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Có lỗi xảy ra.");
  return data;
}
function setAuthMode(mode) {
  authMode = mode;
  $("tab-login").classList.toggle("active", mode === "login");
  $("tab-register").classList.toggle("active", mode === "register");
  $("auth-title").textContent = mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới";
  $("auth-subtitle").textContent = mode === "login" ? "Đăng nhập để tiếp tục chuỗi của bạn." : "Đăng ký để bắt đầu hành trình điểm danh.";
  $("auth-submit").innerHTML = mode === "login" ? 'Đăng nhập <span>→</span>' : 'Tạo tài khoản <span>→</span>';
  $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("auth-message").textContent = "";
}
$("tab-login").addEventListener("click", () => setAuthMode("login"));
$("tab-register").addEventListener("click", () => setAuthMode("register"));

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("auth-submit"); button.disabled = true;
  $("auth-message").textContent = "";
  try {
    await api(`/api/${authMode}`, { method: "POST", body: JSON.stringify({
      email: $("email").value, password: $("password").value
    }) });
    $("password").value = "";
    await loadApp();
  } catch (err) { $("auth-message").textContent = err.message; }
  finally { button.disabled = false; }
});

async function loadApp() {
  const me = await api("/api/me");
  $("account-area").innerHTML = me.user
    ? `<span>${escapeHtml(me.user.email)}</span> <button id="logout" class="secondary">Đăng xuất</button>`
    : "";
  if (!me.user) {
    $("auth-view").classList.remove("hidden"); $("app-view").classList.add("hidden");
    return;
  }
  $("auth-view").classList.add("hidden"); $("app-view").classList.remove("hidden");
  $("logout").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST", body: "{}" }); await loadApp(); }
    catch (e) { toast(e.message); }
  });
  await refreshDashboard();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function formatDate(date) {
  const [y,m,d] = date.split("-");
  return `${d}/${m}/${y}`;
}
function formatTime(value) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
async function refreshDashboard() {
  dashboard = await api("/api/dashboard");
  $("today-label").textContent = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full" }).format(new Date(`${dashboard.today}T12:00:00+07:00`));
  $("timezone").textContent = "Asia/Ho_Chi_Minh";
  $("streak").textContent = dashboard.streak;
  $("total").textContent = dashboard.total;
  $("best").textContent = dashboard.bestStreak;
  $("history-count").textContent = `${dashboard.total} ngày`;
  const done = dashboard.checkedToday;
  $("check-symbol").classList.toggle("done", done);
  $("check-status").textContent = done ? "Bạn đã điểm danh hôm nay!" : "Sẵn sàng điểm danh?";
  $("check-description").textContent = done ? "Hẹn gặp lại bạn vào ngày mai nhé." : "Nhấn nút bên dưới để ghi nhận hôm nay.";
  $("check-button").disabled = done;
  $("check-button").innerHTML = done ? "Đã điểm danh hôm nay ✓" : 'Điểm danh ngay <span>→</span>';
  $("server-time").textContent = done
    ? `Đã ghi nhận lúc ${formatTime(dashboard.history[0].checkedAt)} · Giờ Việt Nam`
    : "Thời gian được ghi nhận tự động từ máy chủ khi bạn nhấn nút.";
  $("history-list").innerHTML = dashboard.history.length
    ? dashboard.history.map(item => `<div class="history-row"><div><div class="history-date">${formatDate(item.date)}</div><div class="history-time">${formatTime(item.checkedAt)} · Giờ Việt Nam</div></div><span class="history-check">✓</span></div>`).join("")
    : '<p class="empty">Chưa có dữ liệu điểm danh.<br>Hãy bắt đầu từ hôm nay!</p>';
}
$("check-button").addEventListener("click", async () => {
  const button = $("check-button"); button.disabled = true;
  try {
    await api("/api/check-in", { method: "POST", body: "{}" });
    await refreshDashboard(); toast("Điểm danh thành công! Hẹn gặp lại ngày mai.");
  } catch (err) { toast(err.message); button.disabled = false; }
});

$("reset-button").addEventListener("click", () => {
  $("reset-word").value = ""; $("confirm-reset").disabled = true; $("reset-dialog").showModal();
});
$("reset-word").addEventListener("input", () => {
  $("confirm-reset").disabled = $("reset-word").value.trim() !== "RESET";
});
$("cancel-reset").addEventListener("click", () => $("reset-dialog").close());
$("confirm-reset").addEventListener("click", async () => {
  const button = $("confirm-reset"); button.disabled = true;
  try {
    await api("/api/reset", { method: "POST", body: JSON.stringify({ confirm: $("reset-word").value.trim() }) });
    $("reset-dialog").close(); await refreshDashboard(); toast("Đã reset toàn bộ dữ liệu điểm danh.");
  } catch (err) { toast(err.message); button.disabled = false; }
});
loadApp().catch(err => toast(err.message));
