# Trang Điểm Danh — GitHub Pages + Google Sheets

## Dữ liệu nằm ở file nào?

Toàn bộ dữ liệu nằm trong **1 file Google Sheets** (miễn phí), gồm 2 tab:

| Tab | Dùng để | Ai ghi |
|---|---|---|
| `ThanhVien` | Danh sách đăng nhập (SĐT, ngày sinh, họ tên) + chuỗi hiện tại, chuỗi dài nhất, tổng ngày, thời gian điểm danh cuối | Bạn nhập cột A–C; script tự ghi cột D–I |
| `DiemDanh` | Nhật ký: mỗi lần điểm danh/reset thêm 1 dòng (thời gian, SĐT, họ tên, loại, ngày, chuỗi). Không bao giờ xóa | Script tự ghi |

Nếu danh sách người dùng đang ở file Excel (.xlsx) hoặc .csv: vào Google Sheets → **Tệp → Nhập** → dán/nhập vào tab `ThanhVien` (cột A: SĐT, cột B: ngày sinh, cột C: họ tên).

Các file của trang web:

- `index.html`, `style.css`, `script.js` → đưa lên GitHub Pages.
- `Code.gs` → dán vào Apps Script của file Google Sheets (đây là phần "máy chủ").

## Cài đặt (khoảng 10 phút)

### Bước 1 — Tạo Google Sheets và dán Code.gs
1. Tạo một Google Sheets mới, đặt tên tùy ý (ví dụ "DiemDanh DB").
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xóa code mẫu, dán toàn bộ nội dung `Code.gs`, bấm **Lưu**.
4. Chọn hàm `khoiTao` ở thanh trên → bấm **Chạy** → cấp quyền khi Google hỏi (Nâng cao → Đi tới… → Cho phép).
   Hàm này tạo 2 tab, tiêu đề cột, định dạng cột SĐT/ngày là văn bản (để không mất số 0 đầu) và đặt múi giờ GMT+7.

### Bước 2 — Nhập danh sách thành viên
Mở tab `ThanhVien`, nhập từ dòng 2 trở xuống:

| A: SĐT | B: Ngày sinh | C: Họ tên |
|---|---|---|
| 0912345678 | 15/08/2000 | Nguyễn Văn A |

- Ngày sinh nhập dạng `dd/mm/yyyy`.
- Dòng mẫu `0900000000` do `khoiTao` tạo ra: hãy xóa khi bắt đầu dùng thật.
- **Không sửa tay** cột D–I (script quản lý).

### Bước 3 — Triển khai thành Web App
1. Trong Apps Script: **Triển khai → Tùy chọn triển khai mới → biểu tượng bánh răng → Ứng dụng web**.
2. **Thực thi với tư cách: Tôi**.
3. **Ai có quyền truy cập: Bất kỳ ai** (bắt buộc, nếu chọn "Bất kỳ ai có tài khoản Google" thì trang sẽ lỗi).
4. Bấm **Triển khai**, sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).
5. Kiểm tra: dán URL đó vào trình duyệt, phải thấy `{"ok":true,"message":"API Điểm Danh đang hoạt động."}`.

### Bước 4 — Gắn URL vào trang web
Mở `script.js`, sửa dòng:

```js
API_URL: 'DAN_URL_WEB_APP_VAO_DAY',
```

thành URL vừa sao chép.

### Bước 5 — Đưa lên GitHub Pages
1. Tạo repo trên GitHub, tải 3 file `index.html`, `style.css`, `script.js` lên nhánh `main`.
2. **Settings → Pages → Deploy from a branch → main / (root) → Save**.
3. Sau ~1 phút mở `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Cách hoạt động

- **Đăng nhập**: SĐT + ngày sinh phải khớp một dòng trong tab `ThanhVien`. Sai 5 lần liên tiếp với cùng một SĐT thì khóa 15 phút.
- **Bấm ĐIỂM DANH lần 1 trong ngày**: máy chủ ghi thời gian (giờ Việt Nam, do máy chủ Google xác định, không lấy giờ điện thoại) và tính chuỗi:
  - hôm qua có điểm danh → chuỗi + 1
  - bỏ lỡ ≥ 1 ngày → chuỗi về 1
  - bấm lại trong cùng ngày → chỉ báo "đã điểm danh", không ghi thêm
- **Ghi dữ liệu an toàn**: dùng khóa toàn cục, nhiều người bấm cùng lúc vẫn ghi đúng, không trùng, không mất.
- **Reset**: phải gõ chữ `RESET` trong hộp thoại xác nhận. Chuỗi hiện tại, chuỗi dài nhất và tổng ngày của người đó về 0. Lịch sử trong tab `DiemDanh` vẫn giữ lại (có dòng `RESET` đánh dấu).
- Nếu mạng đứt đúng lúc bấm, trang tự hỏi lại máy chủ để biết đã ghi hay chưa, nên không bị mất hoặc ghi đôi.

## Lưu ý quan trọng

- **Sửa `Code.gs` xong phải triển khai lại**: Triển khai → Quản lý bản triển khai → biểu tượng bút chì → Phiên bản: **Phiên bản mới** → Triển khai. URL giữ nguyên.
- **Bảo mật**: đăng nhập bằng SĐT + ngày sinh là mức bảo mật cơ bản (ai biết cả hai thông tin đều vào được). Phù hợp lớp học, nhóm nhỏ, câu lạc bộ; không dùng cho dữ liệu nhạy cảm. Đừng chia sẻ công khai file Google Sheets.
- **Hạn mức miễn phí** của Apps Script đủ cho vài trăm người điểm danh mỗi ngày. Nếu cần nhiều hơn, cân nhắc chuyển sang cơ sở dữ liệu chuyên dụng.
- Thêm/xóa thành viên: sửa trực tiếp ở tab `ThanhVien` (thêm dòng ở cuối, cột A–C).
