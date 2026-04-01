# 📚 PHÂN TÍCH TOÀN DIỆN HỆ THỐNG PENTA SCHOOL

## 📅 Ngày phân tích: 1/4/2026

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Giới thiệu
**Penta School** là hệ thống quản lý học tập (LMS - Learning Management System) chuyên nghiệp, được thiết kế cho môi trường giáo dục Việt Nam. Hệ thống hỗ trợ 3 vai trò người dùng: Admin, Giáo viên và Học sinh.

### 1.2 Công nghệ sử dụng
| Công nghệ | Phiên bản | Mô tả |
|-----------|-----------|--------|
| Next.js | 16.1.6 | Framework React với App Router |
| React | 19.2.3 | UI Library |
| TypeScript | 5.x | Type safety |
| Prisma | 6.19.2 | ORM |
| SQLite/PostgreSQL | - | Database |
| Tailwind CSS | 3.4.0 | CSS Framework |
| Zustand | 5.0.11 | State management |
| Fabric.js | 5.3.0 | Canvas editing |
| KaTeX | 0.16.44 | LaTeX rendering |

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Admin   │  │ Teacher  │  │ Student  │  │  Public  │  │
│  │Dashboard │  │Dashboard │  │Dashboard │  │  Pages   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTP/HTTPS
┌──────────────────────────┼───────────────────────────────────┐
│                   SERVER (Next.js)                           │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                    API Routes                          │  │
│  │  /api/auth  /api/pages  /api/exams  /api/student     │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                  Prisma ORM                            │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    DATABASE                                 │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              SQLite / PostgreSQL                       │  │
│  │  Users, Pages, Exams, Questions, Attempts, etc.      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Cấu trúc thư mục

```
school/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # Backend API routes (~40+ endpoints)
│   │   ├── auth/              # Authentication pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── student/           # Student pages
│   │   ├── teacher/           # Teacher pages
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components (~80+ components)
│   │   ├── editor/            # Page/Content editor
│   │   ├── student/           # Student components
│   │   ├── teacher/           # Teacher components
│   │   ├── shared/            # Shared components
│   │   └── latex/             # LaTeX rendering
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Library utilities (auth, cache, redis, etc.)
│   ├── services/              # Business logic services
│   ├── stores/                # Zustand state stores
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility functions
├── prisma/                    # Prisma ORM
│   ├── schema.prisma          # Database schema (40+ models)
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding
├── scripts/                   # Utility scripts
├── public/                    # Static assets
└── md_fil/                    # Documentation (~50+ files)
```

---

## 3. DATABASE SCHEMA CHI TIẾT

### 3.1 Enums (Liệt kê)

| Enum | Các giá trị | Mô tả |
|------|-------------|--------|
| UserRole | ADMIN, TEACHER, STUDENT | Vai trò người dùng |
| DocumentType | VIDEO, POWERPOINT, WORD, PDF, IMAGE, OTHER | Loại tài liệu |
| BlockType | VIDEO, DOCUMENT, TEXT, CONTENT, QUIZ, CANVA, RICH_TEXT, EMBED | Loại khối nội dung |
| PublishMode | PRIVATE, SCHOOL, PUBLIC | Chế độ xuất bản |
| Difficulty | EASY, MEDIUM, HARD | Độ khó câu hỏi |
| QuestionKind | MCQ, TF, TF4, SAQ, ESSAY | Loại câu hỏi |
| ExamKind | ORAL, QUIZ15, PERIOD | Loại kiểm tra |
| ExamStatus | DRAFT, OPEN, CLOSED, ARCHIVED | Trạng thái đề thi |

### 3.2 Models chính (25 models)

#### 👥 Hệ thống người dùng (5 models)
1. **User** - Người dùng với 3 vai trò, teacherCode cho giáo viên
2. **School** - Thông tin trường học
3. **Class** - Lớp học (liên kết với School)
4. **TeacherClass** - Quan hệ giáo viên - lớp
5. **StudentTeacher** - Quan hệ học sinh - giáo viên

#### 📚 Hệ thống bài giảng (6 models)
6. **Page** - Trang bài giảng với hierarchy (parent/child)
7. **PageBlock** - Các khối nội dung (VIDEO, DOCUMENT, TEXT, QUIZ, CANVA...)
8. **PageDocument** - Tài liệu đính kèm
9. **ContentItem** - Mục nội dung với shortcut codes
10. **Quiz** - Câu hỏi trắc nghiệm trong bài giảng
11. **Question/QuestionOption** - Câu hỏi và đáp án

#### 📝 Hệ thống thi cử (6 models)
12. **ExamBank** - Ngân hàng câu hỏi (từ file Word)
13. **BankQuestion** - Câu hỏi trong ngân hàng (MCQ, TF, TF4, SAQ, ESSAY)
14. **Exam** - Đề thi được tạo từ ngân hàng
15. **ExamBankRef** - Quan hệ nhiều-nhiều Exam ↔ ExamBank
16. **ExamItem** - Câu hỏi trong đề (snapshot để bảo toàn)
17. **StudentExamAttempt** - Bài làm của học sinh

#### 🔧 Hệ thống khác (8 models)
18. **Document** - Tài liệu nộp bài
19. **Comment** - Bình luận (có reply, tự động xóa sau 30 ngày)
20. **LibraryFile** - Thư viện tài liệu giáo viên
21. **Schedule** - Lịch học
22. **StudentGoal** - Mục tiêu học tập
23. **ActivationCode** - Mã kích hoạt tài khoản
24. **RefreshToken** - JWT refresh tokens
25. **BackgroundJob** - Jobs xử lý nền

---

## 4. API ROUTES CHI TIẾT

### 4.1 Authentication (3 endpoints)
| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/auth/register` | POST | Đăng ký tài khoản |
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/check-teacher-code` | GET | Kiểm tra mã giáo viên |

### 4.2 Pages - Bài giảng (8 endpoints)
| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/pages` | GET/POST | CRUD bài giảng |
| `/api/pages/[id]` | GET/PUT/DELETE | Chi tiết bài giảng |
| `/api/pages/public` | GET | Bài giảng công khai |
| `/api/pages/student-linked` | GET | Bài giảng của học sinh |
| `/api/pages/[id]/blocks/reorder` | POST | Sắp xếp khối |

### 4.3 Exams - Thi cử (10+ endpoints)
| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/exams` | GET/POST | CRUD đề thi |
| `/api/exams/[examId]` | GET/PUT/DELETE | Chi tiết đề thi |
| `/api/exams/parse-docx` | POST | Parse file Word thành câu hỏi |
| `/api/exams/[examId]/submit` | POST | Nộp bài thi |
| `/api/exam-banks` | GET/POST | CRUD ngân hàng đề |

### 4.4 Student (5 endpoints)
| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/student/exams` | GET | Đề thi của học sinh |
| `/api/student/goals` | GET/POST | Mục tiêu học tập |
| `/api/student/link-teacher` | POST | Liên kết giáo viên |
| `/api/student/progress` | GET | Tiến độ học tập |
| `/api/student/schedule` | GET | Lịch học |

### 4.5 Teacher (5 endpoints)
| Endpoint | Method | Chức năng |
|----------|--------|-----------|
| `/api/teacher/library` | GET | Thư viện giáo viên |
| `/api/teacher/schedule` | GET | Lịch giáo viên |
| `/api/teacher/student-grades` | GET | Điểm học sinh |
| `/api/teacher/student-requests` | GET | Yêu cầu học sinh |
| `/api/teacher/submissions` | GET | Bài nộp |

### 4.6 Other (15+ endpoints)
- `/api/health` - Health check
- `/api/search` - Tìm kiếm
- `/api/schools` - Danh sách trường
- `/api/upload` - Upload chung
- `/api/comments` - Bình luận
- `/api/classes` - Lớp học
- `/api/storage/*` - Storage management
- `/api/jobs/*` - Background jobs

---

## 5. COMPONENTS CHI TIẾT

### 5.1 Editor Components (10+ components)
| Component | Mô tả |
|-----------|--------|
| EditorLayout.tsx | Layout chính của editor |
| ContentBlockComponent.tsx | Khối nội dung |
| DocumentBlockComponent.tsx | Khối tài liệu |
| CanvaBlockComponent.tsx | Khối canvas |
| LinkBlockComponent.tsx | Khối liên kết |
| VideoInteractionOverlay.tsx | Tương tác video |
| PublicPageRenderer.tsx | Render trang công khai |
| MagicQuizBuilder.tsx | Tạo quiz tự động |
| QuizViewer.tsx | Xem quiz |
| CanvasEditor.tsx | Editor canvas |

### 5.2 Student Components (7+ components)
| Component | Mô tả |
|-----------|--------|
| StudentMainDashboard.tsx | Dashboard chính |
| StudentPagesViewer.tsx | Xem bài giảng |
| StudentLecturesViewer.tsx | Xem bài giảng |
| StudentExamsPage.tsx | Trang thi |
| StudentFlashcards.tsx | Flashcard học tập |
| StudentLibraryViewer.tsx | Thư viện |
| StudentSubmissionsViewer.tsx | Bài nộp |

### 5.3 Teacher Components (5+ components)
| Component | Mô tả |
|-----------|--------|
| TeacherMainDashboard.tsx | Dashboard giáo viên |
| TeacherCodeWidget.tsx | Widget mã giáo viên |
| QuestionBankPage.tsx | Ngân hàng câu hỏi |
| StudentSubmissionsViewer.tsx | Xem bài nộp học sinh |

### 5.4 Shared Components (5+ components)
| Component | Mô tả |
|-----------|--------|
| Header.tsx | Header chung |
| PentaSchoolLogo.tsx | Logo |
| PageSearchComponent.tsx | Tìm kiếm trang |
| PublishedPagesGrid.tsx | Grid trang đã xuất bản |
| MathRenderer.tsx | Render công thức toán |

---

## 6. HỆ THỐNG THI CỬ CHI TIẾT

### 6.1 Các loại câu hỏi hỗ trợ

| Loại | Tên đầy đủ | Chấm tự động | Thang điểm |
|------|------------|--------------|------------|
| **MCQ** | Multiple Choice Question | ✅ Có | 100% nếu đúng |
| **TF** | True/False | ✅ Có | 100% nếu đúng |
| **TF4** | 4 True/False items | ✅ Có | 100/50/25/10/0% |
| **SAQ** | Short Answer Question | ✅ Có | 100% nếu đúng (với tolerance) |
| **ESSAY** | Essay | ❌ Giáo viên chấm | Giáo viên quyết định |

### 6.2 Logic chấm điểm TF4 (Chuẩn K12 2025)

```
4/4 ý đúng → 100% điểm
3/4 ý đúng → 50% điểm
2/4 ý đúng → 25% điểm
1/4 ý đúng → 10% điểm
0/4 ý đúng → 0% điểm
```

### 6.3 Hệ số điểm theo loại kiểm tra

| ExamKind | Hệ số | Mô tả |
|----------|--------|--------|
| ORAL | 1 | Kiểm tra miệng |
| QUIZ15 | 1 | Kiểm tra 15 phút |
| PERIOD | 2 | Kiểm tra 1 tiết |

### 6.4 Quy trình tạo đề thi

```
1. Giáo viên upload file Word
   ↓
2. Hệ thống parse file (mammoth library)
   ↓
3. Tạo BankQuestion trong ExamBank
   ↓
4. Giáo viên chọn câu hỏi
   ↓
5. Tạo Exam với ExamItem (snapshot)
   ↓
6. Xuất bản đề thi (OPEN status)
   ↓
7. Học sinh làm bài
   ↓
8. Hệ thống chấm tự động
   ↓
9. Lưu kết quả vào StudentExamAttempt
```

---

## 7. HỆ THỐNG BÀI GIẢNG

### 7.1 Các loại khối nội dung (BlockType)

| Loại | Mô tả | Tính năng |
|------|--------|-----------|
| VIDEO | Video từ YouTube/Vimeo | Embed, poster, interactions |
| DOCUMENT | Tài liệu PDF/Word/PPT | Download, preview |
| TEXT | Văn bản thuần túy | Simple text content |
| CONTENT | Nội dung với hình ảnh | Image + text, shortcut codes |
| QUIZ | Câu hỏi trắc nghiệm | MCQ, auto-grade |
| CANVA | Canvas vẽ | Fabric.js editor |
| RICH_TEXT | Văn bản định dạng | HTML content |
| EMBED | Nội dung nhúng | iframe, external content |

### 7.2 Chế độ xuất bản

| Chế độ | Mô tả | Ai xem được |
|--------|--------|-------------|
| PRIVATE | Riêng tư | Chỉ tác giả |
| SCHOOL | Trong trường | Học sinh cùng trường |
| PUBLIC | Công khai | Mọi người |

### 7.3 Tính năng đặc biệt

1. **LaTeX Support**: Hỗ trợ công thức toán học với KaTeX
2. **Shortcut Codes**: Mã truy cập nhanh cho nội dung
3. **Drag & Drop**: Sắp xếp khối nội dung bằng kéo thả
4. **Hierarchy**: Cấu trúc phân cấp trang (parent/child)
5. **Version Control**: Theo dõi thay đổi qua updatedAt

---

## 8. TÍNH NĂNG BẢO MẬT

### 8.1 Authentication

1. **JWT Tokens**: Access token + Refresh token
2. **Password Hashing**: bcryptjs với salt
3. **Token Rotation**: Refresh token tự động làm mới
4. **Token Revocation**: Có thể thu hồi token

### 8.2 Authorization

1. **RBAC**: Role-Based Access Control
2. **Teacher Code**: Mã giáo viên để học sinh liên kết
3. **Class-based Access**: Kiểm tra quyền theo lớp học

### 8.3 Input Validation

1. **Zod Validation**: Validate request body
2. **DOMPurify**: Sanitize HTML input
3. **File Type Check**: Kiểm tra loại file upload

### 8.4 Security Headers

```json
{
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
}
```

---

## 9. HIỆU NĂNG VÀ TỐI ƯU

### 9.1 Caching Strategy

| Layer | Technology | Use Case |
|-------|------------|----------|
| Client | Browser Cache | Static assets |
| Server | Redis (optional) | Session, rate limiting |
| Database | Prisma | Query optimization |
| CDN | Vercel Edge | Global distribution |

### 9.2 Database Optimization

1. **Indexes**: Đánh index cho các field thường query
2. **Relations**: Use include() thay vì nhiều query
3. **Pagination**: Hỗ trợ phân trang
4. **Connection Pooling**: Quản lý connection hiệu quả

### 9.3 Frontend Optimization

1. **Code Splitting**: Lazy load components
2. **Image Optimization**: Next.js Image component
3. **Bundle Size**: Tree-shaking, minification
4. **SSR/SSG**: Server-side rendering cho SEO

---

## 10. VẤN ĐỀ VÀ GIẢI PHÁP

### 10.1 Vấn đề nghiêm trọng 🔴

| Vấn đề | Mô tả | Giải pháp |
|--------|--------|-----------|
| SQLite không phù hợp production | Chỉ hỗ trợ 1 writer, dễ lock | Chuyển sang PostgreSQL |
| Memory leaks | Component không cleanup đúng | Thêm AbortController, cleanup |
| Large file storage | Lưu base64 trong DB | Dùng cloud storage (S3/Cloudinary) |
| Infinite re-render loops | useEffect dependency sai | Fix dependency arrays |
| Thiếu error boundaries | Component crash crash toàn app | Thêm React Error Boundary |

### 10.2 Vấn đề trung bình 🟡

| Vấn đề | Mô tả | Giải pháp |
|--------|--------|-----------|
| Không có rate limiting | DDoS attack | Thêm rate limiting middleware |
| Thiếu logging | Khó debug khi crash | Thêm Winston/Pino logging |
| Console.log trong production | Performance impact | Xóa hoặc dùng proper logging |
| Thiếu loading states | User click nhiều lần | Thêm loading indicators |

### 10.3 Vấn đề nhẹ 🟢

| Vấn đề | Mô tả | Giải pháp |
|--------|--------|-----------|
| Missing error messages | User không biết lỗi gì | Thêm user-friendly error messages |
| UI inconsistencies | Giao diện không đồng nhất | Design system, component library |
| Missing tooltips | User không hiểu chức năng | Thêm tooltips và help text |

---

## 11. KHUYẾN NGHỊ CẢI THIỆN

### 11.1 Trước khi deploy (BẮT BUỘC)

- [ ] Chuyển database sang PostgreSQL
- [ ] Thêm `prisma.$disconnect()` trong tất cả API routes
- [ ] Giới hạn file upload size (max 10MB)
- [ ] Lưu file trên cloud storage thay vì database
- [ ] Thêm AbortController cho tất cả fetch requests
- [ ] Fix infinite re-render loops
- [ ] Thêm React Error Boundary
- [ ] Thêm rate limiting cho API
- [ ] Xóa console.log trong production
- [ ] Validate tất cả input parameters

### 11.2 Sau khi deploy 1 tháng

- [ ] Thêm monitoring (Sentry, LogRocket)
- [ ] Implement caching (Redis)
- [ ] Add CDN cho static assets
- [ ] Tối ưu database queries
- [ ] Thêm comprehensive test suite

### 11.3 Dài hạn (6-12 tháng)

- [ ] Microservices architecture
- [ ] Load balancing
- [ ] Database sharding
- [ ] Kubernetes deployment
- [ ] Mobile app (React Native)

---

## 12. ĐÁNH GIÁ TỔNG THỂ

### 12.1 Bảng đánh giá

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| **Kiến trúc** | 8/10 | Kiến trúc rõ ràng, separation of concerns tốt |
| **Database Design** | 9/10 | Schema mạnh mẽ, hỗ trợ đầy đủ tính năng |
| **API Design** | 7/10 | RESTful, đầy đủ endpoints |
| **Frontend** | 7/10 | Components organized, responsive |
| **Security** | 6/10 | JWT, RBAC nhưng thiếu rate limiting |
| **Performance** | 5/10 | Cần optimization, caching |
| **Scalability** | 4/10 | SQLite không scale, cần PostgreSQL |
| **Error Handling** | 5/10 | Thiếu error boundaries, logging |
| **Testing** | 4/10 | Thiếu comprehensive tests |
| **Documentation** | 8/10 | Documents chi tiết, đầy đủ |
| **TỔNG** | **6.3/10** | **Khá, cần cải thiện trước production** |

### 12.2 Điểm mạnh

1. ✅ **Kiến trúc rõ ràng**: Tách biệt API, Components, Services
2. ✅ **Database schema mạnh mẽ**: 25 models, hỗ trợ đầy đủ tính năng LMS
3. ✅ **Type safety**: TypeScript + Zod validation
4. ✅ **Exam system chuyên nghiệp**: Snapshot, auto-grading, TF4 support
5. ✅ **LaTeX support**: Tốt cho toán học
6. ✅ **Canvas editing**: Tính năng nâng cao
7. ✅ **Documentation**: Chi tiết và đầy đủ

### 12.3 Điểm yếu

1. ❌ **SQLite không phù hợp production**: Cần PostgreSQL
2. ❌ **Memory leaks**: Cần fix cleanup
3. ❌ **Thiếu error handling**: Cần error boundaries
4. ❌ **Thiếu rate limiting**: Dễ bị DDoS
5. ❌ **Large file storage**: Lưu base64 trong DB
6. ❌ **Thiếu tests**: Cần comprehensive test suite

---

## 13. TRIỂN KHAI DEPLOYMENT

### 13.1 Vercel Configuration

```json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### 13.2 Environment Variables cần thiết

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NEXT_PUBLIC_APP_URL=https://...
REDIS_URL=redis://... (optional)
SUPABASE_URL=https://... (optional)
SUPABASE_ANON_KEY=... (optional)
```

### 13.3 Deployment Steps

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Deploy to Vercel
vercel --prod
```

---

## 14. KẾT LUẬN

### 14.1 Tổng quan

Penta School là một hệ thống LMS **chuyên nghiệp và đầy đủ tính năng**, được thiết kế tốt cho môi trường giáo dục Việt Nam. Hệ thống có kiến trúc rõ ràng, database schema mạnh mẽ, và hỗ trợ nhiều tính năng nâng cao như thi cử với auto-grading, LaTeX rendering, và canvas editing.

### 14.2 Đánh giá cuối cùng

| Aspect | Rating | Comment |
|--------|--------|---------|
| **Code Quality** | ⭐⭐⭐⭐ | Clean code, well organized |
| **Feature Completeness** | ⭐⭐⭐⭐⭐ | Full LMS features |
| **Production Readiness** | ⭐⭐⭐ | Need PostgreSQL, error handling |
| **Scalability** | ⭐⭐⭐ | Need optimization |
| **Security** | ⭐⭐⭐⭐ | Good foundation, need rate limiting |
| **Documentation** | ⭐⭐⭐⭐⭐ | Excellent documentation |

### 14.3 Recommendations

1. **Immediate** (Before production):
   - Switch to PostgreSQL
   - Add error boundaries
   - Implement rate limiting
   - Fix memory leaks

2. **Short-term** (1 month after launch):
   - Add monitoring
   - Implement caching
   - Add comprehensive tests
   - Optimize database queries

3. **Long-term** (6-12 months):
   - Microservices architecture
   - Mobile app
   - AI-powered features
   - Advanced analytics

---

## 📚 TÀI LIỆU THAM KHẢO

- [PHAN_TICH_CAU_TRUC_DU_AN.md](PHAN_TICH_CAU_TRUC_DU_AN.md) - Phân tích cấu trúc dự án
- [md_fil/ARCHITECTURE.md](md_fil/ARCHITECTURE.md) - Kiến trúc hệ thống
- [md_fil/SYSTEM_STABILITY_ANALYSIS.md](md_fil/SYSTEM_STABILITY_ANALYSIS.md) - Phân tích độ ổn định
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Hướng dẫn deployment
- [README.md](README.md) - Đọc file README chính

---

**Ngày cập nhật**: 1/4/2026  
**Phiên bản phân tích**: 1.0  
**Người phân tích**: AI Assistant
