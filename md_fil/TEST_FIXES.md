# Hướng dẫn test các tính năng được sửa

## Vấn đề đã sửa:

### 1. File upload không lưu vào disk
- ✅ Sửa: API `/api/student-submissions` giờ lưu file vào `/public/uploads/{studentId}/{timestamp}-{fileName}`
- ✅ Sửa: Tên học sinh được lưu đúng (từ `studentName` trong formData)
- ✅ Sửa: StudentUploadPage gửi `studentName` khi upload

### 2. Thông báo nộp bài ko hiển thị
- ✅ Sửa: Message '✓ Nộp bài thành công' được set và display đúng

### 3. Teacher không thấy submissions
- ✅ Sửa: API `/api/teacher/submissions` trả về tất cả student submissions

## Các endpoint debug:
- `GET http://localhost:3000/api/debug-submissions` - Xem tất cả submissions trong DB
- `GET http://localhost:3000/api/debug-upload` - Xem file uploads folder structure

## Các bước test:

### Test 1: Đăng nhập Student
1. Vào `http://localhost:3000/auth/login`
2. Đăng nhập với student account (ví dụ: studentId=test123, name=Lê Đăng Khoa)

### Test 2: Upload bài
1. Vào `http://localhost:3000/student/upload`
2. Upload file (ảnh, PDF, etc.)
3. Nhập tiêu đề bài nộp
4. Click "Nộp bài"
5. ✅ Kiểm tra: Có message "✓ Nộp bài thành công" không?
6. ✅ Kiểm tra: File có hiển thị dưới "Lịch sử nộp bài" không?
7. ✅ Kiểm tra: Tên học sinh hiển thị là "Lê Đăng Khoa" hay "Student test123"?
8. ✅ Kiểm tra: Ngày nộp có hiển thị không?

### Test 3: File upload vào disk
1. Vào `http://localhost:3000/api/debug-upload`
2. ✅ Kiểm tra: JSON có `files: [{...}]` hay rỗng?
3. ✅ Kiểm tra: File path là `/uploads/{studentId}/{timestamp}-{fileName}` không?

### Test 4: Database submissions
1. Vào `http://localhost:3000/api/debug-submissions`
2. ✅ Kiểm tra: Có submissions không?
3. ✅ Kiểm tra: `authorName` là tên thật hay "Student..."?
4. ✅ Kiểm tra: `fileUrl` match với file system không?

### Test 5: Student view submissions
1. Vào `http://localhost:3000/student/submissions`
2. ✅ Kiểm tra: Có submissions hiển thị không?
3. ✅ Kiểm tra: Tên học sinh đúng không?

### Test 6: Teacher view submissions
1. Vào `http://localhost:3000/teacher/submissions`
2. ✅ Kiểm tra: Có student group hiển thị không?
3. ✅ Kiểm tra: Click vào student có thấy submissions không?
4. ✅ Kiểm tra: Button "Xem" (mắt xanh) có hiển thị không?
5. ✅ Kiểm tra: Click "Xem" có preview file không?

### Test 7: Teacher grade submission
1. Click button "Chấm" ở bài nộp
2. Nhập điểm (ví dụ: 85)
3. Tick checkbox "Đạt"
4. Click "Lưu điểm"
5. ✅ Kiểm tra: Toast "Đã lưu điểm số" có hiển thị không?

### Test 8: Student view graded submission
1. Vào `http://localhost:3000/student/submissions`
2. ✅ Kiểm tra: Bài được chấm có hiển thị điểm không?
3. ✅ Kiểm tra: Status hiển thị "Đạt" hoặc "Chưa đạt" không?
4. ✅ Kiểm tra: Ngày chấm hiển thị không?
