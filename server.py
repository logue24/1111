# -*- coding: utf-8 -*-
"""Máy chủ Điểm Danh: đọc/ghi trực tiếp file data.xlsx. Chạy: python server.py"""
import json, os, secrets, threading
from datetime import datetime, date, timedelta, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from openpyxl import Workbook, load_workbook
from openpyxl.utils.datetime import from_excel

BASE = os.path.dirname(os.path.abspath(__file__))
XLSX, HTML = os.path.join(BASE, "data.xlsx"), os.path.join(BASE, "index.html")
TZ = timezone(timedelta(hours=7))  # giờ Việt Nam
LOCK, SESSIONS = threading.Lock(), {}
LOG = "NhatKy"
NAME, PHONE, DOB, STREAK, BEST, LDATE, LTIME, TOTAL = COLS = [
    "Họ tên", "Số điện thoại", "Ngày sinh", "Chuỗi", "Chuỗi cao nhất",
    "Ngày điểm danh gần nhất", "Giờ điểm danh gần nhất", "Tổng ngày điểm danh"]

def nphone(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): v = int(v)
    s = "".join(ch for ch in str(v) if ch.isdigit())
    if s.startswith("84") and len(s) == 11: s = "0" + s[2:]
    if len(s) == 9: s = "0" + s  # Excel hay làm mất số 0 đầu
    return s

def pdate(v):
    if v in (None, ""): return None
    if isinstance(v, datetime): return v.date()
    if isinstance(v, date): return v
    if isinstance(v, (int, float)): return from_excel(v).date()
    for f in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d"):
        try: return datetime.strptime(str(v).strip(), f).date()
        except ValueError: pass
    return None

def seed():
    wb = Workbook(); ws = wb.active; ws.title = "NguoiDung"; ws.append(COLS)
    for n, p, d in [("Nguyễn Văn An", "0912345678", date(1995, 3, 15)),
                    ("Trần Thị Bình", "0987654321", date(1998, 11, 2)),
                    ("Lê Hoàng Cường", "0903111222", date(2000, 7, 20))]:
        ws.append([n, p, d, 0, 0, None, None, 0])
        ws.cell(ws.max_row, 2).number_format = "@"; ws.cell(ws.max_row, 3).number_format = "dd/mm/yyyy"
    wb.create_sheet(LOG).append(["Thời gian", "Số điện thoại", "Họ tên", "Hành động"])
    wb.save(XLSX)

def open_db():
    if not os.path.exists(XLSX): seed()
    wb = load_workbook(XLSX); ws = wb.worksheets[0]
    c = {str(x.value).strip(): i for i, x in enumerate(ws[1], 1) if x.value}
    for h in COLS:  # tự thêm cột còn thiếu
        if h not in c: c[h] = max(c.values(), default=0) + 1; ws.cell(1, c[h], h)
    if LOG not in wb.sheetnames: wb.create_sheet(LOG).append(["Thời gian", "Số điện thoại", "Họ tên", "Hành động"])
    return wb, ws, wb[LOG], c

def find(ws, c, phone, dob):
    for r in range(2, ws.max_row + 1):
        if nphone(ws.cell(r, c[PHONE]).value) == phone and pdate(ws.cell(r, c[DOB]).value) == dob: return r

def state(ws, c, r, now):
    g = lambda k: ws.cell(r, c[k]).value
    last, streak = pdate(g(LDATE)), int(g(STREAK) or 0)
    if last is None or (now.date() - last).days > 1: streak = 0  # chuỗi đã đứt
    return dict(name=g(NAME), phone=nphone(g(PHONE)), streak=streak, best=int(g(BEST) or 0),
                total=int(g(TOTAL) or 0), checked=last == now.date(),
                last_date=last.strftime("%d/%m/%Y") if last else "", last_time=str(g(LTIME) or ""),
                now=now.isoformat())

def handle(a, b):
    now = datetime.now(TZ)
    with LOCK:
        wb, ws, wl, c = open_db()
        if a == "login":
            phone, dob = nphone(b.get("phone")), pdate(b.get("dob"))
            r = find(ws, c, phone, dob) if phone and dob else None
            if not r: return 401, {"error": "Sai số điện thoại hoặc ngày sinh"}
            t = secrets.token_urlsafe(24); SESSIONS[t] = (phone, dob)
            return 200, {"token": t, **state(ws, c, r, now)}
        s = SESSIONS.get(b.get("token")); r = s and find(ws, c, *s)
        if not r: return 401, {"error": "Phiên đăng nhập đã hết hạn"}
        g = lambda k: ws.cell(r, c[k]).value
        def put(k, v, fmt=None):
            ws.cell(r, c[k]).value = v  # gán .value để ghi được cả None (xóa ô)
            if fmt: ws.cell(r, c[k]).number_format = fmt
        stamp = now.strftime("%d/%m/%Y %H:%M:%S")
        if a == "me": return 200, state(ws, c, r, now)
        if a == "checkin":
            last, today = pdate(g(LDATE)), now.date()
            if last == today: return 409, {"error": "Hôm nay bạn đã điểm danh rồi", **state(ws, c, r, now)}
            streak = int(g(STREAK) or 0) + 1 if last and (today - last).days == 1 else 1
            put(STREAK, streak); put(BEST, max(streak, int(g(BEST) or 0)))
            put(LDATE, today, "dd/mm/yyyy"); put(LTIME, now.strftime("%H:%M:%S"), "@")
            put(TOTAL, int(g(TOTAL) or 0) + 1)
            wl.append([stamp, nphone(g(PHONE)), g(NAME), f"Điểm danh (chuỗi {streak})"])
        elif a == "reset":
            for k in (STREAK, BEST, TOTAL): put(k, 0)
            put(LDATE, None); put(LTIME, None)
            wl.append([stamp, nphone(g(PHONE)), g(NAME), "RESET toàn bộ tiến độ"])
        else: return 404, {"error": "Không tìm thấy"}
        wb.save(XLSX)  # ghi thẳng vào data.xlsx
        return 200, state(ws, c, r, now)

class H(BaseHTTPRequestHandler):
    def out(self, code, obj=None, body=None, ctype="application/json; charset=utf-8"):
        d = body if body is not None else json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(d))); self.send_header("Cache-Control", "no-store")
        self.end_headers(); self.wfile.write(d)
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(HTML, "rb") as f: self.out(200, body=f.read(), ctype="text/html; charset=utf-8")
        else: self.out(404, {"error": "Không tìm thấy"})
    def do_POST(self):
        try:
            b = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            code, res = handle(self.path.removeprefix("/api/"), b)
        except PermissionError: code, res = 500, {"error": "Không ghi được data.xlsx. Hãy đóng file nếu đang mở bằng Excel."}
        except Exception as e: code, res = 500, {"error": "Lỗi máy chủ: " + str(e)}
        self.out(code, res)
    def log_message(self, *a): pass

if __name__ == "__main__":
    open_db()
    print("Điểm Danh đang chạy: http://localhost:8000  (Ctrl+C để dừng)")
    ThreadingHTTPServer(("0.0.0.0", 8000), H).serve_forever()
