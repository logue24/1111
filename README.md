# RedDrop ⚡ Nền Tảng Chuyển Dữ Liệu Tốc Độ Cao (Data Transfer)

> **Chuyển dữ liệu & tệp tin siêu tốc, bảo mật, quét mã QR thời gian thực, không giới hạn kích thước với giao diện Crimson Red hiện đại.**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](./LICENSE)
[![React](https://img.shields.io/badge/React-19-red)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-red)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-red)](https://tailwindcss.com/)

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 📤 1. Gửi Dữ Liệu (Send Data)
- **Tải lên tệp tin dung lượng lớn**: Hỗ trợ tệp lên đến **1.2 GB** với thanh tiến trình thời gian thực (tốc độ MB/s, ước lượng thời gian hoàn thành).
- **Chia sẻ văn bản trực tiếp**:
  - Tự động đếm và hiển thị **số dòng** (Line count).
  - Tự động đếm và hiển thị **số từ** và **số chữ / ký tự** (Word & Character count).
  - Tùy chọn xóa nhanh hoặc sao chép văn bản.
- **Tạo mã chuyển nhận tức thì**:
  - Mã định danh 6 ký tự dễ nhớ (ví dụ: `RED-789` hoặc `582910`).
  - Tự động tạo **Mã QR Code** chất lượng cao.
  - Tải xuống mã QR (PNG) hoặc sao chép liên kết chia sẻ dạng Deep Link `#code=XXXXXX`.

### 📥 2. Nhận Dữ Liệu (Receive Data)
- **Quyền truy cập mở camera**:
  - Yêu cầu cấp quyền và chuyển đổi camera trước/sau mượt mà.
- **Quét mã QR trong khung hình vuông**:
  - Giao diện kính ngắm vuông đỏ chuyên nghiệp với tia laser quét sinh động.
  - Tự động nhận diện và đọc dữ liệu mã QR tức thời bằng thư viện `jsQR`.
- **Nhập mã xác nhận thủ công**:
  - Hỗ trợ nhập mã 6 số/ký tự trực tiếp nếu không dùng camera.
- **Xem trước tệp tin (File Preview)**:
  - Hình ảnh: Xem ảnh phóng to, thông tin kích thước và dung lượng.
  - Video & Âm thanh: Trình phát media HTML5 tích hợp trực tiếp trong ứng dụng.
  - Văn bản / Code / Markdown: Trình xem nội dung văn bản kèm số dòng.
  - PDF & Tài liệu: Xem thông tin chi tiết và tải xuống an toàn.
- **Tùy chọn tải linh hoạt**:
  - Chọn từng tệp đơn lẻ hoặc **Chọn tất cả** (Select All).
  - Tải xuống từng mục hoặc gom nén toàn bộ thành file `.zip`.
- **Hỗ trợ Deep Link `#code`**:
  - Mở từ ứng dụng khác hoặc quét mã QR ngoài màn hình sẽ tự động kích hoạt `#code=[MÃ]` và nạp dữ liệu lập tức!

### 🌍 3. Đa Ngôn Ngữ (5 Ngôn Ngữ Toàn Diện)
- 🇻🇳 **Tiếng Việt** (Mặc định)
- 🇺🇸 **English**
- 🇰🇷 **한국어** (Tiếng Hàn)
- 🇯🇵 **日本語** (Tiếng Nhật)
- 🇨🇳 **简体中文** (Tiếng Trung)

---

## 🚀 Cấu Trúc Dự Án (Project Structure)

```
├── .github/              # Cấu hình GitHub
├── src/
│   ├── components/       # Các thành phần giao diện
│   │   ├── CameraScanner.tsx  # Quét mã QR bằng Camera thật
│   │   ├── FilePreviewModal.tsx # Xem trước tệp tin
│   │   ├── Header.tsx         # Thanh điều hướng và chọn ngôn ngữ
│   │   ├── QrCodeDisplay.tsx  # Hiển thị và tải mã QR
│   │   ├── ReceiveSection.tsx # Phân khu nhận dữ liệu
│   │   └── SendSection.tsx    # Phân khu gửi dữ liệu và văn bản
│   ├── locales/          # Dữ liệu ngôn ngữ (VI, EN, KO, JA, ZH)
│   ├── types/            # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/            # Hỗ trợ QR, nén Zip, tính toán dung lượng
│   ├── App.tsx           # Thành phần chính
│   ├── index.css         # Tailwind v4 & Crimson Design
│   └── main.tsx          # Điểm khởi chạy React
├── server.ts             # Máy chủ Express xử lý tải lên và API truyền tải
├── README.md             # Tài liệu dự án
├── LICENSE               # Giấy phép mã nguồn mở MIT
└── CONTRIBUTING.md        # Hướng dẫn đóng góp
```

---

## 🛠️ Cài Đặt & Chạy Cục Bộ (Getting Started)

### Yêu cầu tiên quyết:
- Node.js >= 18.0.0
- npm hoặc pnpm / yarn

### Các bước thực hiện:
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi động môi trường phát triển
npm run dev

# 3. Mở trình duyệt tại
http://localhost:3000
```

---

## 🔒 Bảo Mật & Lưu Trữ
- Dữ liệu được mã hóa truyền tải qua giao thức HTTPS.
- Mã chuyển nhận tự động hết hạn và tự hủy sau thời gian quy định nhằm đảm bảo an toàn riêng tư tối đa.

---

## 📄 Bản Quyền (License)
Dự án được phân phối dưới giấy phép **MIT License**. Xem chi tiết tại [LICENSE](./LICENSE).
