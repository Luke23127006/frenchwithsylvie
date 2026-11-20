# French with Sylvie UI preview

This is a local Next.js app with its own UI, styles, and sample data. It needs no account or environment file.

## Mở preview trên Windows

1. Mở thư mục `ui-preview` và bấm đúp **Open Preview.cmd**.
2. Lần đầu có thể mất vài phút để cài tự động. Nếu cửa sổ yêu cầu Node.js, cài bản **LTS** từ trang vừa mở rồi bấm đúp lại.
3. Preview tự mở một cửa sổ Chrome hoặc Edge riêng, với extension được tắt. Giữ cửa sổ dòng lệnh Preview mở trong lúc sử dụng và đóng cửa sổ đó để dừng. Nếu trình duyệt không tự mở, mở `http://127.0.0.1:3001` trong cửa sổ riêng tư có tắt extension.

Ở góc dưới bên phải, bấm **Preview navigation** để mở hoặc thu gọn bảng chuyển trang. Bảng mở trực tiếp trang chào mừng, đăng nhập, onboarding, dashboard học viên, trang làm bài, dashboard giáo viên, chấm bài, thống kê lớp và báo cáo học viên. Có các liên kết riêng để xem dashboard trống và bài tập ở nhiều trạng thái.

Để thử luồng đăng nhập, dùng tên `student` hoặc `teacher` với mật khẩu `demo123`. Các thao tác chỉ cập nhật dữ liệu mẫu trong bộ nhớ. Dừng và mở lại preview để đặt lại dữ liệu. Liên kết email được mô phỏng cục bộ.

## Chạy bằng terminal

From the repository root, run:

```sh
cd ui-preview
npm ci
npm run dev
```

Open `http://127.0.0.1:3001` for the welcome page. Open `http://127.0.0.1:3001/student?scenario=empty` to see the empty dashboard.

Edit `app/` and `components/` for screens, `components/ui/` for UI primitives, and `app/preview.css` for styles. Update `lib/mock-data.ts` for fixtures and `lib/actions/` for simulated actions. Keep design changes inside `ui-preview/` when preparing a PR.

After review, port approved changes into the corresponding screens in `next-app/` and connect any new interactions to its data flow. The preview only runs in development mode.
