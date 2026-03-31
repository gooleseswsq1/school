# PHÂN TÍCH CẤU TRÚC DỰ ÁN PENTA SCHOOL

## 1. TỔNG QUAN

**Penta School** là một hệ thống quản lý học tập (LMS - Learning Management System) được xây dựng bằng Next.js, phục vụ cho môi trường giáo dục với 3 vai trò người dùng: Admin, Giáo viên và Học sinh.

- **Tên dự án:** pentaschool
- **Phiên bản:** 0.1.0
- **Framework:** Next.js 16.1.6 (App Router)
- **Ngôn ngữ:** TypeScript
- **Database:** PostgreSQL (qua Prisma ORM)
- **UI:** Tailwind CSS + Lucide React Icons
- **Deployment:** Vercel

---

## 2. CẤU TRÚC THƯ MỤC

```
school/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API)
│   │   ├── api/               # Backend API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── student/           # Student pages
│   │   ├── teacher/           # Teacher pages
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── canva/             # Canvas editor pages
│   │   └── [slug]/            # Dynamic routes
│   ├── components/            # React components
│   │   ├── admin/             # Admin components
│   │   ├── auth/              # Auth components
│   │   ├── editor/            # Page/Content editor
│   │   ├── student/           # Student components
│   │   ├── teacher/           # Teacher components
│   │   ├── shared/            # Shared components
│   │   ├── latex/             # LaTeX rendering
│   │   └── ui/                # UI primitives
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Library utilities
│   ├── services/              # Business logic services
│   ├── stores/                # Zustand state stores
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility functions
├── prisma/                    # Prisma ORM
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding
├── scripts/                   # Utility scripts
├── public/                    # Static assets
├── backup/                    # Backup files
└── md_fil/                    # Documentation
```

---

## 3. KIẾN TRÚC DATABASE (Prisma Schema)

### 3.1 Enums
| Enum | Mô tả |
|------|--------|
| `UserRole` | ADMIN, TEACHER, STUDENT |
| `DocumentType` | VIDEO, POWERPOINT, WORD, PDF, IMAGE |
| `BlockType` | VIDEO, DOCUMENT, TEXT, CONTENT, QUIZ, CANVA, RICH_TEXT, EMBED |
| `PublishMode` | PRIVATE, SCHOOL, PUBLIC |
| `Difficulty` | EASY, MEDIUM, HARD |
| `QuestionKind` | MCQ, TF, TF4, SAQ, ESSAY |
| `ExamKind` | ORAL, QUIZ15, PERIOD |
| `ExamStatus` | DRAFT, OPEN, CLOSED, ARCHIVED |

### 3.2 Models chính

#### Hệ thống người dùng
- **User**: Quản lý người dùng với 3 vai trò, có teacherCode cho giáo viên
- **School**: Thông tin trường học
- **Class**: Lớp học (liên kết với School)
- **TeacherClass**: Quan hệ giáo viên - lớp
- **StudentTeacher**: Quan hệ học sinh - giáo viên
- **ActivationCode**: Mã kích hoạt tài khoản

#### Hệ thống bài giảng (Page/Lecture)
- **Page**: Trang bài giảng với hierarchy (parent/child)
- **PageBlock**: Các khối nội dung (VIDEO, DOCUMENT, TEXT, QUIZ, CANVA...)
- **PageDocument**: Tài liệu đính kèm
- **ContentItem**: Mục nội dung với shortcut codes
- **Quiz**: Câu hỏi trắc nghiệm trong bài giảng
- **Question/QuestionOption**: Câu hỏi và đáp án

#### Hệ thống thi cử (Exam System)
- **ExamBank**: Ngân hàng câu hỏi (từ file Word)
- **BankQuestion**: Câu hỏi trong ngân hàng (MCQ, TF, TF4, SAQ, ESSAY)
- **Exam**: Đề thi được tạo từ ngân hàng
- **ExamBankRef**: Quan hệ nhiều-nhiều Exam ↔ ExamBank
- **ExamItem**: Câu hỏi trong đề (snapshot để bảo toàn)
- **StudentExamAttempt**: Bài làm của học sinh

#### Hệ thống khác
- **Document**: Tài liệu nộp bài
- **Comment**: Bình luận (có reply, tự động xóa sau 30 ngày)
- **LibraryFile**: Thư viện tài liệu giáo viên
- **Schedule**: Lịch học
- **StudentGoal**: Mục tiêu học tập

---

## 4. CẤU TRÚC API ROUTES

### 4.1 Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/check-teacher-code` - Kiểm tra mã giáo viên

### 4.2 Admin
- `GET /api/admin/codes` - Quản lý mã kích hoạt

### 4.3 Pages (Bài giảng)
- `GET/POST /api/pages` - CRUD bài giảng
- `GET/PUT/DELETE /api/pages/[id]` - Chi tiết bài giảng
- `GET /api/pages/public` - Bài giảng công khai
- `GET /api/pages/student-linked` - Bài giảng của học sinh
- `POST /api/pages/[id]/blocks/reorder` - Sắp xếp khối

### 4.4 Blocks
- `GET/POST /api/blocks` - CRUD khối nội dung
- `GET/PUT/DELETE /api/blocks/[id]` - Chi tiết khối

### 4.5 Documents
- `GET/POST /api/documents` - CRUD tài liệu
- `POST /api/documents/upload` - Upload tài liệu
- `GET /api/documents/public` - Tài liệu công khai

### 4.6 Exams (Thi cử)
- `GET/POST /api/exams` - CRUD đề thi
- `GET/PUT/DELETE /api/exams/[examId]` - Chi tiết đề thi
- `POST /api/exams/parse-docx` - Parse file Word thành câu hỏi
- `DELETE /api/exams/auto-delete` - Xóa tự động

### 4.7 Exam Banks
- `GET/POST /api/exam-banks` - CRUD ngân hàng đề
- `POST /api/exam-banks/parse` - Parse ngân hàng

### 4.8 Quiz
- `GET/POST /api/quiz` - CRUD quiz
- `GET /api/quiz/questions` - Câu hỏi quiz

### 4.9 Student
- `GET /api/student/exams` - Đề thi của học sinh
- `GET/POST /api/student/goals` - Mục tiêu học tập
- `POST /api/student/link-teacher` - Liên kết giáo viên
- `GET /api/student/progress` - Tiến độ học tập
- `GET /api/student/schedule` - Lịch học

### 4.10 Teacher
- `GET /api/teacher/library` - Thư viện giáo viên
- `GET /api/teacher/schedule` - Lịch giáo viên
- `GET /api/teacher/student-grades` - Điểm học sinh
- `GET /api/teacher/student-requests` - Yêu cầu học sinh
- `GET /api/teacher/submissions` - Bài nộp

### 4.11 Storage
- `POST /api/storage/sign-upload` - Ký URL upload
- `GET /api/storage/health` - Kiểm tra sức khỏe storage

### 4.12 Others
- `GET /api/health` - Health check
- `GET /api/search` - Tìm kiếm
- `GET /api/schools` - Danh sách trường
- `POST /api/upload` - Upload chung
- `GET /api/videos` - Video
- `GET /api/slides` - Slides
- `GET /api/comments` - Bình luận
- `GET /api/classes` - Lớp học

---

## 5. CẤU TRÚC COMPONENTS

### 5.1 Editor Components (Bộ chỉnh sửa)
- `EditorLayout.tsx` - Layout chính của editor
- `ContentBlockComponent.tsx` - Khối nội dung
- `DocumentBlockComponent.tsx` - Khối tài liệu
- `CanvaBlockComponent.tsx` - Khối canvas
- `LinkBlockComponent.tsx` - Khối liên kết
- `VideoInteractionOverlay.tsx` - Tương tác video
- `PublicPageRenderer.tsx` - Render trang công khai
- `MagicQuizBuilder.tsx` - Tạo quiz tự động
- `QuizViewer.tsx` - Xem quiz

### 5.2 Student Components
- `StudentMainDashboard.tsx` - Dashboard chính
- `StudentPagesViewer.tsx` - Xem bài giảng
- `StudentLecturesViewer.tsx` - Xem bài giảng
- `StudentExamsPage.tsx` - Trang thi
- `StudentFlashcards.tsx` - Flashcard học tập
- `StudentLibraryViewer.tsx` - Thư viện
- `StudentSubmissionsViewer.tsx` - Bài nộp

### 5.3 Teacher Components
- `TeacherMainDashboard.tsx` - Dashboard giáo viên
- `TeacherCodeWidget.tsx` - Widget mã giáo viên
- `QuestionBankPage.tsx` - Ngân hàng câu hỏi
- `StudentSubmissionsViewer.tsx` - Xem bài nộp học sinh

### 5.4 Shared Components
- `Header.tsx` - Header chung
- `PentaSchoolLogo.tsx` - Logo
- `PageSearchComponent.tsx` - Tìm kiếm trang
- `PublishedPagesGrid.tsx` - Grid trang đã xuất bản

### 5.5 Canvas Components
- `CanvasEditor.tsx` - Editor canvas cơ bản
- `CanvasEditorPro.tsx` - Editor canvas nâng cao
- `MiniCanvaButton.tsx` - Nút mini canvas
- `MiniCanvaApp.tsx` - App mini canvas

### 5.6 LaTeX Components
- `MathRenderer.tsx` - Render công thức toán
- `InlineContentRenderer.tsx` - Render nội dung inline

---

## 6. DEPENDENCIES CHÍNH

### Frontend
- **Next.js 16.1.6** - Framework React
- **React 19.2.3** - UI Library
- **Tailwind CSS 3.4.0** - CSS Framework
- **Lucide React** - Icons
- **Zustand** - State management
- **@dnd-kit** - Drag & drop
- **Fabric.js** - Canvas editing
- **KaTeX** - LaTeX rendering
- **DOMPurify** - HTML sanitization

### Backend
- **Prisma 6.19.2** - ORM
- **PostgreSQL** - Database
- **Supabase** - Storage (optional)
- **bcryptjs** - Password hashing
- **Zod** - Validation

### Tools
- **TypeScript** - Type safety
- **Vitest** - Testing
- **ESLint** - Linting

---

## 7. TÍNH NĂNG CHÍNH

### 7.1 Hệ thống bài giảng
- Tạo bài giảng với nhiều loại khối (VIDEO, TEXT, QUIZ, CANVA...)
- Hỗ trợ LaTeX cho công thức toán
- Hệ thống shortcut codes để truy cập nhanh
- Chế độ xuất bản: PRIVATE, SCHOOL, PUBLIC
- Drag & drop để sắp xếp khối

### 7.2 Hệ thống thi cử
- Ngân hàng câu hỏi từ file Word
- Parse tự động câu hỏi MCQ, TF, TF4, SAQ, ESSAY
- Tạo đề thi với trộn câu hỏi tự động
- Hệ thống phân cấp độ khó (EASY, MEDIUM, HARD)
- Chấm bài tự động (MCQ, TF, SAQ)
- Snapshot câu hỏi để bảo toàn đề

### 7.3 Hệ thống người dùng
- 3 vai trò: Admin, Teacher, Student
- Mã giáo viên để học sinh liên kết
- Hệ thống lớp học
- Kích hoạt tài khoản bằng mã

### 7.4 Hệ thống tương tác
- Bình luận với reply
- Flashcard học tập
- Mục tiêu học tập
- Lịch học
- Thư viện tài liệu

---

## 8. CẤU HÌNH DEPLOYMENT

### 8.1 Vercel Configuration (`vercel.json`)
- **Framework:** Next.js
- **Region:** `sin1` (Singapore - gần Việt Nam)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **API Timeout:** 60 giây cho tất cả API routes

### 8.2 Security Headers
```json
{
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
}
```

### 8.3 Performance
- Static files: Cache 1 năm (immutable)
- Webpack optimization: Tách KaTeX bundle riêng
- Turbopack enabled (Next.js 16)

### 8.4 Đánh giá Vercel Deployment
**Ưu điểm:**
- ✅ Region Singapore → latency thấp cho người dùng Việt Nam
- ✅ Security headers đầy đủ
- ✅ API timeout 60s đủ cho xử lý file Word lớn
- ✅ Static file caching tối ưu

**Hạn chế:**
- ⚠️ Serverless functions có cold start → có thể chậm lần đầu
- ⚠️ Không có WebSocket support cho real-time features
- ⚠️ File size limit 50MB cho serverless functions
- ⚠️ Cần Supabase hoặc S3 cho persistent file storage

---

## 9. HỆ THỐNG CHẤM ĐIỂM THI CỬ

### 9.1 Các loại câu hỏi hỗ trợ

| Loại | Mô tả | Chấm tự động |
|------|--------|--------------|
| **MCQ** | Trắc nghiệm 4 lựa chọn (A/B/C/D) | ✅ Có |
| **TF** | Đúng/Sai | ✅ Có |
| **TF4** | 4 ý Đúng/Sai (K12 2025) | ✅ Có (thang điểm riêng) |
| **SAQ** | Trả lời ngắn (số) | ✅ Có (với tolerance) |
| **ESSAY** | Tự luận | ❌ Giáo viên chấm tay |

### 9.2 Logic chấm điểm tự động

#### MCQ / TF
```typescript
if (studentAnswer === correctAnswer) {
  score += points;
}
```

#### SAQ (Short Answer Question)
```typescript
// So sánh số với sai số cho phép
if (Math.abs(studentNum - correctNum) <= tolerance) {
  score += points;
}
// Hỗ trợ dấu phẩy thập phân Việt Nam: "3,14" → "3.14"
```

#### TF4 (4 ý Đúng/Sai - Chuẩn K12 2025)
```typescript
// Thang điểm đặc biệt:
// 4/4 đúng = 100% điểm
// 3/4 đúng = 50% điểm
// 2/4 đúng = 25% điểm
// 1/4 đúng = 10% điểm
// 0/4 đúng = 0% điểm
```

#### ESSAY
- Đánh dấu `isPassed = null`
- Thông báo: "Phần tự luận đang chờ giáo viên chấm"
- Giáo viên chấm thủ công qua dashboard

### 9.3 Quy trình chấm bài

1. **Học sinh nộp bài** → POST `/api/exams/[examId]/submit`
2. **Kiểm tra điều kiện:**
   - Exam status phải là `OPEN`
   - Học sinh chưa nộp bài trước đó
3. **Chấm tự động:**
   - Lặp qua từng `ExamItem`
   - So sánh `answers[itemId]` với `answerSnapshot`
   - Tính điểm theo loại câu hỏi
4. **Lưu kết quả:**
   - `score`: Điểm đạt được
   - `maxScore`: Điểm tối đa
   - `isPassed`: true/false/null
   - `timeSpent`: Thời gian làm bài
5. **Trả về kết quả** cho học sinh

### 9.4 Điểm chuẩn qua (Pass threshold)
```typescript
const isPassed = score >= maxScore * 0.5; // 50% để đậu
```

### 9.5 Hệ số điểm theo loại kiểm tra

| ExamKind | Hệ số | Mô tả |
|----------|--------|--------|
| ORAL | 1 | Kiểm tra miệng |
| QUIZ15 | 1 | Kiểm tra 15 phút |
| PERIOD | 2 | Kiểm tra 1 tiết |

### 9.6 Tính năng đặc biệt

1. **Snapshot câu hỏi:** Khi tạo đề, câu hỏi được snapshot để đảm bảo đề không thay đổi sau khi xuất bản
2. **Trộn câu hỏi:** Hỗ trợ trộn thứ tự câu hỏi và đáp án
3. **Nhiều mã đề:** Tạo nhiều variant từ cùng ngân hàng câu hỏi
4. **Giới hạn thời gian:** Hỗ trợ countdown timer
5. **Chống gian lận:** Mỗi học sinh chỉ làm 1 lần
6. **Review mode:** Mở xem lại bài sau khi chấm (configurable)

### 9.7 API Endpoints liên quan

| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/exams/[examId]/submit` | POST | Nộp bài và chấm tự động |
| `/api/exams/[examId]` | GET | Lấy đề thi (ẩn đáp án) |
| `/api/student/exams` | GET | Danh sách đề của học sinh |
| `/api/teacher/student-grades` | GET | Xem điểm học sinh |
| `/api/teacher/submissions/exams` | GET | Xem bài nộp theo đề |

---

## 10. ĐÁNH GIÁ TỔNG THỂ

### Ưu điểm
1. **Kiến trúc rõ ràng:** Tách biệt rõ ràng giữa API, Components, Services
2. **Database schema mạnh mẽ:** Hỗ trợ đầy đủ các tính năng LMS
3. **Type safety:** Sử dụng TypeScript và Zod validation
4. **Exam system chuyên nghiệp:** Hệ thống thi cử với snapshot và trộn đề
5. **LaTeX support:** Hỗ trợ tốt cho toán học
6. **Canvas editing:** Tính năng chỉnh sửa canvas nâng cao

### Hạn chế
1. **File Word parsing:** Phụ thuộc vào mammoth library, có thể gặp vấn đề với format phức tạp
2. **Storage:** Hiện tại dùng data URLs, cần migrate sang cloud storage cho production
3. **Testing:** Cần tăng cường test coverage

### Khuyến nghị
1. Implement proper file storage (S3/Cloudinary)
2. Add comprehensive test suite
3. Implement caching layer (Redis)
4. Add monitoring và logging
5. Implement rate limiting cho API