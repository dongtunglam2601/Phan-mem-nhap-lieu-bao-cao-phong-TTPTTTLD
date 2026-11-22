Google Sheets được sao lưu lúc 23:00 hằng ngày, múi giờ Asia/Ho_Chi_Minh (16:00 UTC). Tác vụ chạy trên bản triển khai production đã được xuất bản, kể cả khi không có trình duyệt mở. Deploy Preview không tự chạy lịch.

Dữ liệu sẵn sàng sao lưu là bản đầy đủ được chuyển gần nhất từ ứng dụng lên Netlify Database. Ứng dụng hiện có thể lưu dữ liệu riêng trên từng trình duyệt; tính năng này không tự gộp các máy và không thay đổi kho dữ liệu nhập liệu hiện tại.

Trong mục **Dữ liệu đã nhập**, quản trị viên đăng ký email quản trị sao lưu, xác minh qua email, rồi đăng nhập tại khung **Sao lưu Google Sheets**. Email phải trùng email đã cấu hình cho quản trị sao lưu. Trên máy có đầy đủ dữ liệu, bấm **Đồng bộ dữ liệu máy này và bật tự đồng bộ**. Mỗi phiên mở ứng dụng cần kết nối lại trước khi nhập hoặc sửa dữ liệu. Sau mỗi lần lưu, chờ thông báo **Đã đồng bộ** trước khi đóng trang. Thay đổi chưa lên kho tập trung không thể được sao lưu khi máy đóng.

Bản sao tập trung được thay thế toàn bộ mỗi lần đồng bộ. Cần hợp nhất dữ liệu trên máy trước khi chuyển sang thiết bị khác. Kiểm tra phiên bản ngăn các phiên đang chạy ghi đè lên thay đổi mới của nhau; sau xung đột cần tải trạng thái và kiểm tra dữ liệu trước khi đồng bộ lại.

Bản sao gửi tới Web App giữ định dạng `ver`, `ts`, `entries`, `settings`, `users`, `reports`. Tài khoản chỉ chứa thông tin cơ bản và phân quyền; mật khẩu, muối và giá trị băm không được tải lên. Khi khôi phục tài khoản từ bản sao này, quản trị viên cần đặt lại mật khẩu.

Đích nhận là Web App Google Apps Script hiện có đã được xác nhận. Liên kết Sheets xuất bản chỉ dùng để xem. Web App cần tiếp nhận POST JSON và trả JSON xác nhận như `{"success":true}`, `{"ok":true}` hoặc `{"status":"success"}`. Phản hồi HTML, lỗi HTTP và phản hồi không xác nhận được đều được ghi là chưa thành công. Lịch sử chạy được giữ 90 ngày và hiển thị trong khung sao lưu. Không có bản sao tập trung thì tác vụ bỏ qua, không gửi dữ liệu trống.

Kiểm tra tự động: `npm test` và `npm run typecheck`. Việc nhận dữ liệu thực tế của Web App cần được kiểm tra sau khi triển khai và đồng bộ dữ liệu đầu tiên.
