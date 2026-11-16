require("dotenv").config();
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || 3000);
const zone = process.env.APP_TIME_ZONE || "Asia/Ho_Chi_Minh";
const production = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL trong file .env");
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự.");
}
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

app.use(helmet({ contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: production ? [] : null
  }
}}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

const sessionOptions = {
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "diemdanh.sid",
  cookie: {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
};
app.use(session(sessionOptions));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-7", legacyHeaders: false });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, attendance_date)
    );
    CREATE INDEX IF NOT EXISTS attendance_user_date_idx
      ON attendance(user_id, attendance_date DESC);
  `);
}
const dateInZone = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit"
}).format(date);

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Vui lòng đăng nhập." });
  next();
}
function validEmail(email) {
  return typeof email === "string" && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function sendError(res, err) {
  console.error(err);
  res.status(500).json({ error: "Máy chủ đang gặp sự cố. Vui lòng thử lại." });
}

app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!validEmail(email)) return res.status(400).json({ error: "Email không hợp lệ." });
    if (password.length < 8 || password.length > 72)
      return res.status(400).json({ error: "Mật khẩu phải từ 8 đến 72 ký tự." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email",
      [email, hash]
    );
    req.session.regenerate(err => {
      if (err) return sendError(res, err);
      req.session.userId = String(result.rows[0].id);
      req.session.email = result.rows[0].email;
      req.session.save(err2 => err2 ? sendError(res, err2) : res.status(201).json({ user: { email } }));
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email này đã được đăng ký." });
    sendError(res, err);
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const result = await pool.query("SELECT id,email,password_hash FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    req.session.regenerate(err => {
      if (err) return sendError(res, err);
      req.session.userId = String(user.id);
      req.session.email = user.email;
      req.session.save(err2 => err2 ? sendError(res, err2) : res.json({ user: { email: user.email } }));
    });
  } catch (err) { sendError(res, err); }
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) return sendError(res, err);
    res.clearCookie("diemdanh.sid", { httpOnly: true, sameSite: "lax", secure: production });
    res.json({ ok: true });
  });
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.userId ? { email: req.session.email } : null });
});

app.get("/api/dashboard", apiLimiter, requireAuth, async (req, res) => {
  try {
    const today = dateInZone();
    const result = await pool.query(
      "SELECT attendance_date::text AS day, checked_at FROM attendance WHERE user_id=$1 ORDER BY attendance_date DESC",
      [req.session.userId]
    );
    const rows = result.rows;
    const days = rows.map(r => r.day);
    const set = new Set(days);
    let streak = 0;
    let cursor = new Date(`${today}T12:00:00Z`);
    // Nếu hôm nay chưa điểm danh, chuỗi hiện tại vẫn được giữ đến hết ngày kế tiếp.
    if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    let best = 0, run = 0, previous = null;
    const ascending = [...days].reverse();
    for (const day of ascending) {
      const d = new Date(`${day}T12:00:00Z`);
      if (previous) {
        const diff = (d - previous) / 86400000;
        run = diff === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run);
      previous = d;
    }
    res.json({
      user: { email: req.session.email },
      today, checkedToday: set.has(today),
      total: rows.length, streak, bestStreak: best,
      history: rows.map(r => ({ date: r.day, checkedAt: r.checked_at }))
    });
  } catch (err) { sendError(res, err); }
});

app.post("/api/check-in", apiLimiter, requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Khóa tài khoản để hai yêu cầu đồng thời không thể ghi trùng.
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [req.session.userId]);
    const today = dateInZone();
    const result = await client.query(
      "INSERT INTO attendance(user_id,attendance_date) VALUES($1,$2) ON CONFLICT(user_id,attendance_date) DO NOTHING RETURNING checked_at",
      [req.session.userId, today]
    );
    await client.query("COMMIT");
    if (!result.rowCount) return res.status(409).json({ error: "Bạn đã điểm danh hôm nay rồi." });
    res.json({ ok: true, date: today, checkedAt: result.rows[0].checked_at });
  } catch (err) {
    await client.query("ROLLBACK");
    sendError(res, err);
  } finally { client.release(); }
});

app.post("/api/reset", apiLimiter, requireAuth, async (req, res) => {
  if (req.body.confirm !== "RESET") return res.status(400).json({ error: "Xác nhận reset không hợp lệ." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [req.session.userId]);
    await client.query("DELETE FROM attendance WHERE user_id=$1", [req.session.userId]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    sendError(res, err);
  } finally { client.release(); }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initDb().then(() => app.listen(port, () => console.log(`Điểm Danh đang chạy tại cổng ${port}`)))
  .catch(err => { console.error("Không thể khởi tạo cơ sở dữ liệu:", err); process.exit(1); });
