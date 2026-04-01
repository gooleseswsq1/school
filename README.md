# 🎓 Penta School — Nền tảng dạy & học thế hệ mới

![Next.js](https://img.shields.io/badge/Next.js-16.1-blue)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.19-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-blue)

---

## 📖 Giới thiệu

**Penta School** là nền tảng giáo dục trực tuyến (LMS - Learning Management System) được thiết kế dành riêng cho hệ thống giáo dục Việt Nam. Hệ thống hỗ trợ đầy đủ 3 vai trò: **Admin**, **Giáo viên** và **Học sinh**, với các tính năng từ quản lý bài giảng, tạo đề kiểm tra đến chấm điểm tự động.

### Tên gọi "Penta"
Biểu tượng ngũ giác (Pentagon) đại diện cho **5 trụ cột** cốt lõi của nền tảng:
1. 📚 Bài giảng theo lớp & trường
2. ✏️ Tạo & chấm bài tự động
3. 🎨 Canvas — thiết kế bài giảng tương tác
4. 🏦 Ngân hàng đề thi thông minh
5. 🤖 AI hỗ trợ giáo viên

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                     Penta School                            │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16 + React 19 + TypeScript)             │
│  ├── Trang chủ (Pentagon Interactive)                       │
│  ├── Dashboard Giáo viên                                    │
│  ├── Dashboard Học sinh                                     │
│  ├── Editor (Canva Block, Video, Quiz, Document)           │
│  └── Trang bài thi & Ngân hàng câu hỏi                     │
├─────────────────────────────────────────────────────────────┤
│  API Routes (Next.js App Router)                            │
│  ├── /api/auth/* — Đăng ký, đăng nhập                      │
│  ├── /api/exams/* — Đề thi & chấm điểm                    │
│  ├── /api/exam-banks/* — Ngân hàng câu hỏi                 │
│  ├── /api/pages/* — Bài giảng & nội dung                   │
│  ├── /api/quiz/* — Quiz nhúng trong bài giảng              │
│  ├── /api/teacher/* — Quản lý giáo viên                    │
│  └── /api/student/* — Học sinh & bài kiểm tra              │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL/SQLite via Prisma ORM)                │
│  ├── User, School, Class                                    │
│  ├── Exam, ExamBank, BankQuestion                          │
│  ├── ExamItem, StudentExamAttempt                           │
│  ├── Page, PageBlock, Quiz, Question                       │
│  └── Document, LibraryFile, Comment                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Hệ thống phân quyền

| Vai trò | Quyền hạn chính |
|---------|----------------|
| **ADMIN** | Quản lý toàn bộ hệ thống, kích hoạt tài khoản, quản lý trường học |
| **TEACHER** | Tạo bài giảng, tạo đề thi, ngân hàng câu hỏi, chấm điểm, quản lý lớp |
| **STUDENT** | Xem bài giảng, làm bài kiểm tra, xem điểm số, bình luận |

---

## 📚 Tính năng chính

### 1. 📖 Bài giảng đa phương tiện
- **Video nhúng** với tương tác (quiz giữa video)
- **Tài liệu** (Word, PDF, PowerPoint, Image)
- **Rich Text** với LaTeX hỗ trợ công thức Toán, Lý, Hóa
- **Canva Block** — thiết kế slide ngay trong hệ thống
- **Quiz nhúng** trong bài giảng
- Phân quyền theo **lớp**, **trường**, hoặc **công khai**

### 2. 🎨 Canvas Editor (Mini Canva)
- Thiết kế slide bài giảng trực tiếp trong trình duyệt
- Nhúng quiz, hình ảnh, công thức LaTeX vào từng slide
- Học sinh tương tác ngay mà không cần rời trang
- Hỗ trợ export PDF

### 3. 🏦 Ngân hàng đề thi thông minh
- Import câu hỏi từ file Word (.docx)
- Phân loại độ khó: Dễ / Trung bình / Khó
- Trộn đề tự động (nhiều mã đề)
- Chấm điểm tự động MCQ, True/False

### 4. 📚 Thư viện tài liệu chia sẻ
- Giáo viên upload tài liệu lên thư viện cá nhân
- Học sinh xem tài liệu của giáo viên đã liên kết
- Hệ thống bình luận trong thư viện

### 5. 📊 Bảng điểm có hệ số
- **Kiểm tra miệng** — hệ số 1
- **Kiểm tra 15 phút** — hệ số 1
- **Kiểm tra 1 tiết** — hệ số 2
- Công thức: `Điểm TB = (Σ điểm × hệ số) / (Σ hệ số)`

### 6. 💬 Hệ thống bình luận
- Bình luận cấp độ khối (block) hoặc toàn trang
- Hỗ trợ comment threading (trả lời bình luận)
- Tự động xóa bình luận hết hạn sau 7 ngày
- Xác thực người dùng trước khi bình luận

### 7. 🎥 Video tương tác
- Hỗ trợ YouTube, Vimeo, hoặc tải lên trực tiếp
- Thêm câu hỏi tương tác tại các điểm dừng cụ thể
- Lưu trữ dữ liệu tương tác dưới dạng JSON

---

## 🛠️ Công nghệ

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Next.js** | 16.1.6 | Framework React SSR/SSG |
| **React** | 19.2.3 | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Prisma** | 6.19.2 | ORM — Database |
| **PostgreSQL** | 14+ | Database (production) |
| **SQLite** | — | Database (development) |
| **TailwindCSS** | 3.4 | Styling |
| **Fabric.js** | 5.3 | Canvas Editor |
| **KaTeX** | 0.16 | Công thức Toán học |
| **Zustand** | 5.0 | State Management |
| **Zod** | 3.22 | Validation |
| **Mammoth** | 1.12 | Parse file Word (.docx) |
| **bcryptjs** | 3.0 | Mã hóa mật khẩu |
| **DOMPurify** | 3.0 | Sanitize HTML |

---

## 🚀 Cài đặt & Chạy Local

### Yêu cầu
- Node.js >= 18
- npm hoặc yarn
- Git

### Bước 1: Clone & cài đặt
```bash
git clone <repository-url>
cd school
npm install
```

### Bước 2: Cấu hình môi trường
Tạo file `.env` trong thư mục gốc:

```env
# Development: dùng SQLite
DATABASE_URL="file:./dev.db"

# Production: dùng PostgreSQL (xem phần Deploy)
# DATABASE_URL="postgresql://user:password@host:5432/dbname"

# App URL (cho production)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Secret (tạo random string)
JWT_SECRET="your-secret-key-here"
```

### Bước 3: Khởi tạo database
```bash
# Chạy migration
npx prisma migrate dev

# Seed dữ liệu mẫu (tùy chọn)
npm run prisma:seed

# Sinh Prisma client
npx prisma generate
```

### Bước 4: Chạy ứng dụng
```bash
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`

### Tạo tài khoản Admin đầu tiên
```bash
node scripts/create-admin.js
```

### Các script khác
```bash
npm run build              # Build production
npm run start              # Start production server
npm run lint               # Kiểm tra code
npm run test               # Chạy test
npm run prisma:seed        # Seed dữ liệu mẫu
npm run prisma:reset       # Reset database
npx prisma studio          # Mở Prisma Studio (http://localhost:5555)
```

---

## 📁 Cấu trúc thư mục

```
school/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data
│   ├── dev.db                 # SQLite database (dev)
│   └── migrations/            # Database migrations
├── public/
│   ├── uploads/               # File upload
│   ├── videos/                # Video files
│   └── interactive/           # Interactive templates
├── scripts/
│   ├── create-admin.js        # Tạo tài khoản admin
│   ├── test-parser.js         # Test parse Word
│   └── migrate-lectures-class.js
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Xác thực (login, register, logout, refresh)
│   │   │   ├── exams/         # Đề thi & chấm điểm
│   │   │   ├── exam-banks/    # Ngân hàng câu hỏi
│   │   │   ├── pages/         # Bài giảng & nội dung
│   │   │   ├── quiz/          # Quiz nhúng
│   │   │   ├── documents/     # Tài liệu
│   │   │   ├── teacher/       # Quản lý giáo viên
│   │   │   ├── student/       # Học sinh
│   │   │   ├── admin/         # Quản trị
│   │   │   └── cron/          # Công việc định kỳ
│   │   ├── admin/             # Trang Admin
│   │   ├── teacher/           # Trang Giáo viên
│   │   ├── student/           # Trang Học sinh
│   │   ├── auth/              # Trang xác thực
│   │   └── canva/             # Công cụ Canvas
│   ├── components/
│   │   ├── shared/            # Header, Footer, Navigation
│   │   ├── editor/            # Editor components
│   │   ├── teacher/           # Teacher components
│   │   ├── student/           # Student components
│   │   ├── admin/             # Admin components
│   │   ├── latex/             # LaTeX renderer
│   │   ├── quiz/              # Quiz UI
│   │   └── auth/              # Auth components
│   ├── services/              # API services
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   ├── lib/                   # Utility libraries
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility functions
├── md_fil/                    # Documentation
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── next.config.ts
└── .env                       # Environment variables
```

---

## 📊 Database Schema (Prisma)

### Bảng chính

#### User — Người dùng
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất (CUID) |
| email | String | Email (duy nhất) |
| name | String | Tên đầy đủ |
| password | String | Mật khẩu (mã hóa bcrypt) |
| role | UserRole | Vai trò: ADMIN, TEACHER, STUDENT |
| isActive | Boolean | Trạng thái kích hoạt tài khoản |
| schoolId | String? | ID trường học |
| classId | String? | ID lớp học |
| createdAt | DateTime | Thời gian tạo |
| updatedAt | DateTime | Thời gian cập nhật |

#### Page — Bài giảng
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| title | String | Tiêu đề bài giảng |
| slug | String | Đường dẫn tĩnh (URL-friendly) |
| description | String? | Mô tả bài giảng |
| parentId | String? | ID trang cha (NULL = trang gốc) |
| authorId | String | ID tác giả |
| order | Int | Thứ tự hiển thị |
| isPublished | Boolean | Trạng thái công khai |
| schoolId | String? | ID trường (phân quyền) |
| classId | String? | ID lớp (phân quyền) |

#### PageBlock — Khối nội dung
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| pageId | String | ID trang chứa |
| type | BlockType | VIDEO, DOCUMENT, TEXT, CONTENT, QUIZ, CANVA |
| order | Int | Thứ tự hiển thị |
| videoUrl | String? | URL video |
| videoType | String? | youtube, vimeo, upload |
| content | String? | Nội dung HTML/LaTeX |
| slidesData | String? | JSON dữ liệu canvas/slide |

#### Exam — Đề thi
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| title | String | Tiêu đề đề thi |
| description | String? | Mô tả |
| authorId | String | ID giáo viên tạo |
| bankId | String? | ID ngân hàng câu hỏi |
| duration | Int | Thời gian làm bài (phút) |
| totalPoints | Int | Tổng điểm |
| isPublished | Boolean | Trạng thái phát hành |

#### ExamBank — Ngân hàng câu hỏi
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| title | String | Tiêu đề ngân hàng |
| subject | String | Môn học |
| grade | Int | Lớp |
| authorId | String | ID giáo viên tạo |

#### Document — Tài liệu
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| title | String | Tiêu đề tài liệu |
| fileUrl | String | URL tệp đã tải lên |
| fileType | DocumentType | VIDEO, POWERPOINT, WORD, PDF, IMAGE, OTHER |
| fileSize | Int | Dung lượng tệp (bytes) |
| authorId | String | ID người tải lên |
| score | Int? | Điểm số (0-100) |
| status | String | submitted, graded, achieved |

#### Comment — Bình luận
| Field | Type | Mô tả |
|-------|------|--------|
| id | String | Mã định danh duy nhất |
| blockId | String | ID khối hoặc "page-{pageId}" |
| authorId | String | ID tác giả |
| replyToCommentId | String? | ID bình luận gốc (reply) |
| content | String | Nội dung bình luận |
| expiresAt | DateTime | Thời gian hết hạn (7 ngày) |

---

## 🎯 API Endpoints chính

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| POST | `/api/auth/refresh` | Làm mới token |

### Exams (Đề thi)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/exams` | Tạo đề thi mới |
| GET | `/api/exams` | Lấy danh sách đề |
| GET | `/api/exams/[examId]` | Lấy chi tiết đề |
| POST | `/api/exams/[examId]/submit` | Nộp bài |
| POST | `/api/exams/[examId]/publish` | Phát hành đề |

### Pages (Bài giảng)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/pages` | Tạo bài giảng |
| GET | `/api/pages` | Lấy danh sách bài giảng |
| GET | `/api/pages/public` | Lấy bài giảng công khai |
| GET | `/api/pages/[id]` | Lấy chi tiết bài giảng |
| PUT | `/api/pages/[id]` | Cập nhật bài giảng |
| DELETE | `/api/pages/[id]` | Xóa bài giảng |
| PUT | `/api/pages/[id]/blocks/reorder` | Sắp xếp khối |

### Documents (Tài liệu)
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/documents/upload` | Tải tài liệu lên |
| GET | `/api/documents` | Lấy danh sách tài liệu |
| GET | `/api/documents/public` | Lấy tài liệu công khai |

### Quizzes
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/quiz/questions` | Thêm câu hỏi quiz |
| GET | `/api/quiz/questions` | Lấy câu hỏi quiz |

### Teacher
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/teacher/student-grades` | Xem điểm học sinh |
| GET | `/api/teacher/library` | Thư viện giáo viên |
| GET | `/api/teacher/schedule` | Lịch dạy |

### Student
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/student/progress` | Tiến độ học tập |
| GET | `/api/student/goals` | Mục tiêu học tập |
| GET | `/api/student/schedule` | Lịch học |

---

## 🌐 Deploy lên Web

### ⚠️ Lưu ý quan trọng trước khi deploy

> **Database**: SQLite chỉ dùng cho development. Khi deploy production, bạn **BẮT BUỘC** dùng PostgreSQL.
> - SQLite lưu file trên disk, không phù hợp với hosting serverless
> - PostgreSQL hỗ trợ đồng thời nhiều kết nối và ổn định cho production

---

### Cách 1: Deploy lên Vercel (Khuyến nghị)

#### Bước 1: Chuẩn bị database PostgreSQL

Sử dụng **Neon** (miễn phí) hoặc **Supabase**:
1. Truy cập [neon.tech](https://neon.tech) hoặc [supabase.com](https://supabase.com)
2. Tạo database mới
3. Copy connection string

#### Bước 2: Chuyển database sang PostgreSQL

Sửa file `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Bước 3: Push code lên GitHub & Deploy

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

Truy cập [vercel.com](https://vercel.com), import repository, cấu hình:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

### Cách 2: Deploy lên Railway

1. Truy cập [railway.app](https://railway.app)
2. Tạo PostgreSQL database
3. Deploy ứng dụng từ GitHub
4. Cấu hình Environment Variables

---

### Cách 3: Deploy bằng Docker

```bash
# Build và chạy
docker-compose up -d --build

# Chạy migration
docker-compose exec app npx prisma migrate deploy

# Tạo admin
docker-compose exec app node scripts/create-admin.js
```

---

### Cách 4: Deploy lên VPS (Ubuntu)

```bash
# Cài Node.js, PostgreSQL, Nginx, PM2
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2

# Deploy ứng dụng
cd /var/www
sudo git clone <repository-url> pentaschool
cd pentaschool
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Khởi động với PM2
pm2 start npm --name "pentaschool" -- start
pm2 startup
pm2 save

# Cấu hình Nginx & SSL
sudo certbot --nginx -d yourdomain.com
```

---

## 🔐 Bảo mật

- **Mật khẩu**: Mã hóa bằng `bcryptjs` (salt rounds = 10)
- **HTML**: Sanitize bằng `DOMPurify` chống XSS
- **Validation**: Sử dụng `Zod` để validate input
- **SSL**: Bắt buộc HTTPS trong production
- **Database**: SSL connection cho PostgreSQL
- **JWT**: Token-based authentication

---

## ⚠️ Đánh giá độ ổn định hệ thống

### 📊 Điểm đánh giá (cập nhật): 6.2/10

| Tiêu chí | Điểm | Nhận định hiện tại |
|----------|------|--------------------|
| Error Handling | 6/10 | Nhiều route đã có try-catch, nhưng chưa đồng đều toàn bộ endpoint |
| Database | 7/10 | Production định hướng PostgreSQL; SQLite giữ cho môi trường development |
| Memory Management | 6/10 | Có cleanup/job xử lý định kỳ, cần thêm theo dõi memory chuyên sâu |
| Input Validation | 6/10 | Đã có Zod và cải thiện form-level, nhưng chưa phủ kín 100% API |
| Scalability | 6/10 | Đã có Redis/cache/rate-limit; cần thêm load test để nâng độ tin cậy |

### ✅ Checklist BẮT BUỘC trước khi deploy

- [ ] Chuyển database sang PostgreSQL
- [ ] Thêm `prisma.$disconnect()` trong tất cả API routes
- [ ] Giới hạn file upload size (max 10MB)
- [ ] Lưu file trên cloud storage (S3/Cloudinary)
- [ ] Thêm AbortController cho fetch requests
- [ ] Fix infinite re-render loops
- [ ] Thêm React Error Boundary
- [ ] Thêm rate limiting cho API
- [ ] Xóa console.log trong production
- [ ] Validate tất cả input parameters

---

## 🧪 Testing

```bash
# Chạy test
npm run test

# Kiểm tra linting
npm run lint

# Build production
npm run build

# Mở Prisma Studio
npx prisma studio
```

---

## 📝 Giấy phép

Dự án được phát triển cho mục đích giáo dục.

---

## 👨‍💻 Phát triển

Dự án được xây dựng với ❤️ cho hệ thống giáo dục Việt Nam.

**Penta School** — Nền tảng dạy & học thế hệ mới 🎓

---

## 📞 Hỗ trợ

Nếu gặp vấn đề khi deploy, hãy kiểm tra:
1. [Vercel Documentation](https://vercel.com/docs)
2. [Prisma Documentation](https://www.prisma.io/docs)
3. [Next.js Documentation](https://nextjs.org/docs)
4. Kiểm tra `md_fil/` trong repository để xem thêm tài liệu chi tiết