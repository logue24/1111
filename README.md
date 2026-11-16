# Website Điểm Danh

Ứng dụng điểm danh mỗi ngày có đăng ký/đăng nhập, thời gian máy chủ, chuỗi liên tiếp, lịch sử, thống kê và reset có xác nhận. Giao diện responsive cho điện thoại và máy tính.

## Công nghệ
- Node.js 20+, Express
- PostgreSQL lưu tài khoản và lịch sử điểm danh
- bcryptjs băm mật khẩu
- Session lưu trong PostgreSQL, cookie HttpOnly/SameSite
- Giờ/ngày do máy chủ xác định theo `APP_TIME_ZONE` (mặc định `Asia/Ho_Chi_Minh`)

## Chạy nhanh bằng Docker
1. Cài Docker và Docker Compose.
2. Trong thư mục dự án, thay `SESSION_SECRET` trong `docker-compose.yml` bằng chuỗi bí mật ngẫu nhiên dài ít nhất 32 ký tự.
3. Chạy:
   ```bash
   docker compose up --build -d
   ```
4. Mở `http://localhost:3000`.

## Chạy trực tiếp
1. Cài Node.js 20+ và PostgreSQL.
2. Tạo database, ví dụ `diemdanh`.
3. Sao chép `.env.example` thành `.env`, cập nhật `DATABASE_URL` và `SESSION_SECRET`.
4. Cài và chạy:
   ```bash
   npm install
   npm start
   ```
5. Mở `http://localhost:3000`.

## Quy tắc điểm danh
- Mỗi tài khoản chỉ có một bản ghi cho mỗi ngày theo múi giờ cấu hình.
- Ngày và giờ được tạo tại máy chủ; trình duyệt không gửi thời gian điểm danh.
- Ràng buộc `UNIQUE(user_id, attendance_date)` ở PostgreSQL ngăn điểm danh trùng, kể cả khi nhấn đồng thời hoặc tải lại.
- Chuỗi hiện tại tính theo các ngày liên tiếp. Nếu hôm nay chưa điểm danh, chuỗi của ngày liền trước vẫn được giữ trong ngày hôm nay.
- Reset xóa toàn bộ bản ghi điểm danh của tài khoản; tài khoản vẫn còn. Phải nhập chính xác `RESET` và xác nhận.

## Triển khai internet
- Dùng máy chủ có Node.js và PostgreSQL hoặc Docker.
- Bắt buộc HTTPS trong môi trường production; đặt `NODE_ENV=production`, `TRUST_PROXY=true` nếu chạy sau reverse proxy.
- Đặt `SESSION_SECRET` mạnh và riêng tư; không commit `.env` hoặc mật khẩu database.
- Bật sao lưu PostgreSQL định kỳ và giới hạn quyền truy cập database.
- Nếu dùng dịch vụ PostgreSQL yêu cầu SSL, đặt `PGSSL=true` theo cấu hình nhà cung cấp.
- Cấu hình múi giờ `APP_TIME_ZONE=Asia/Ho_Chi_Minh` nếu muốn ngày điểm danh theo Việt Nam.

## Lưu ý chính xác
Ứng dụng bảo đảm quy tắc một lần/ngày bằng cơ sở dữ liệu và lấy timestamp từ máy chủ. Không hệ thống web nào có thể cam kết “chính xác 100%” nếu đồng hồ máy chủ, nhà cung cấp hạ tầng hoặc cấu hình múi giờ sai; hãy đồng bộ NTP và dùng nền tảng máy chủ đáng tin cậy.
