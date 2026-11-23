# Hướng dẫn triển khai

## 1. Sheet `users` (giữ nguyên định dạng hiện có)
| id | json | cập nhật lúc | mật khẩu |
|---|---|---|---|
| admin | {"name":"Quản trị viên","role":"admin","perm":{"a":1},"act":true} | | (điền mật khẩu) |
| cs1 | {"name":"Cán bộ CS1","role":"cs1","perm":{"i1":1},"act":true} | | (điền mật khẩu) |

- **Cột D "mật khẩu"** (chạy `setup` sẽ tự thêm) là mật khẩu dạng chữ thường. Sửa ô này là đổi mật khẩu, có hiệu lực ngay.
- Tài khoản cũ chỉ có mã băm (s, it, h) trong json thì CHƯA đăng nhập được cho đến khi điền cột D.
- Khóa tài khoản: đặt "act":false trong json. role: admin / cs1 / cs2 / th / xem.
- Các sheet entries, settings, reports, audit giữ nguyên, dữ liệu cũ vẫn dùng được.

## 2. Apps Script
1. Dán toàn bộ `Code.gs` thay mã cũ, chạy hàm `setup` một lần (cấp quyền).
2. Triển khai > Quản lý bản triển khai > Sửa > Phiên bản mới.
   Thực thi dưới tư cách: Tôi | Ai có quyền truy cập: **Bất kỳ ai**.

## 3. Đăng web
Tải `Index.html` lên GitHub/Netlify.
