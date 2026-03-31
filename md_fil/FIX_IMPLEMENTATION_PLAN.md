# KẾ HOẠCH SỬA LỖI HỆ THỐNG PENTA SCHOOL

## PHÂN TÍCH VẤN ĐỀ

### Bug nghiêm trọng:
- File `src/app/api/auth/check-teacher-code/route.ts` chứa nội dung SAI (đang có code student/exams)

### Vấn đề chính:
1. Đăng ký học sinh đang yêu cầu mã giáo viên + mã kích hoạt → Cần: KHÔNG cần mã giáo viên khi đăng ký
2. Dashboard giáo viên thiếu phần quản lý học sinh
3. Dashboard học sinh thiếu nút +Key
4. Liên kết giáo viên-học sinh: cần gửi yêu cầu → giáo viên chấp nhận → tự động xóa sau 1 ngày
5. Đề thi không hiện cho học sinh đúng cách

## FILES CẦN THAY ĐỔI

1. prisma/schema.prisma - Thêm requestExpiresAt field
2. src/app/api/auth/check-teacher-code/route.ts - Rewrite
3. src/app/api/auth/register/route.ts - Bỏ link teacher khi đăng ký
4. src/components/auth/RegisterForm.tsx - Bỏ trường mã giáo viên
5. src/app/api/student/link-teacher/route.ts - File mới
6. src/app/api/teacher/student-requests/route.ts - File mới
7. src/app/api/cron/student-requests-cleanup/route.ts - File mới
8. src/components/student/StudentMainDashboard.tsx - Thêm +Key
9. src/components/teacher/TeacherMainDashboard.tsx - Thêm student management
10. src/components/teacher/StudentManagementPanel.tsx - File mới