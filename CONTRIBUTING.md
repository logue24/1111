# Hướng Dẫn Đóng Góp (Contributing Guidelines)

Cảm ơn bạn đã quan tâm đến việc cải thiện dự án **RedDrop - Chuyển Dữ Liệu Tốc Độ Cao**! Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng.

## 📋 Quy Trình Đóng Góp (Workflow)

1. **Fork Kho Chứa (Fork repository)**: Nhấn nút Fork trên giao diện GitHub.
2. **Tạo Nhánh Tính Năng (Feature branch)**:
   ```bash
   git checkout -b feature/tinh-nang-moi
   ```
3. **Thực Hiện Thay Đổi & Kiểm Tra**:
   - Đảm bảo tuân thủ phong cách mã nguồn TypeScript và Tailwind CSS.
   - Kiểm tra mã không có lỗi cú pháp hoặc cảnh báo:
     ```bash
     npm run lint
     npm run build
     ```
4. **Cam Kết Mã (Commit changes)**:
   ```bash
   git commit -m "feat: bổ sung tính năng chuyển tệp nhanh qua WebRTC"
   ```
5. **Gửi Yêu Cầu Kéo (Submit Pull Request)**: Tạo PR với mô tả chi tiết các cải tiến đã thực hiện.

## 🎨 Tiêu Chuẩn Thiết Kế & Quy Tắc Giao Diện

- **Tông Màu Đỏ (Red Aesthetic)**: Sử dụng các gam màu Crimson (`#DC2626`, `#991B1B`, `#7F1D1D`) kết hợp với nền tối Obsidian (`#0C0A09`, `#1C1917`).
- **Khả Năng Truy Cập (Accessibility)**: Đảm bảo độ tương phản màu chuẩn WCAG AA và hỗ trợ điều hướng bàn phím.
- **Hỗ Trợ Đa Ngôn Ngữ**: Khi bổ sung từ khóa mới, vui lòng cập nhật đầy đủ trong cả 5 ngôn ngữ (`vi`, `en`, `ko`, `ja`, `zh`).

---

*Trân trọng cảm ơn các đóng góp của bạn!*
