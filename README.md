# 🎓 Penta School — Nền tảng dạy & học thế hệ mới

![Next.js](https://img.shields.io/badge/Next.js-16.1-blue)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.19-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-blue)

---

## 📖 Giới thiệu

**Penta School** là nền tảng giáo dục trực tuyến (LMS) được thiết kế dành riêng cho hệ thống giáo dục Việt Nam. Hệ thống hỗ trợ đầy đủ 3 vai trò: **Admin**, **Giáo viên** và **Học sinh**, với các tính năng từ quản lý bài giảng, tạo đề kiểm tra đến chấm điểm tự động.

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
```

### Bước 3: Khởi tạo database
```bash
# Chạy migration
npx prisma migrate dev

# Seed dữ liệu mẫu (tùy chọn)
npm run prisma:seed
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
```

---

## 🌐 Deploy lên Web

### ⚠️ Lưu ý quan trọng trước khi deploy

> **Database**: SQLite chỉ dùng cho development. Khi deploy production, bạn **BẮT BUỘC** dùng PostgreSQL.
> - SQLite lưu file trên disk, không phù hợp với hosting serverless
> - Các nền tảng cloud không hỗ trợ ghi file persistent cho SQLite
> - PostgreSQL hỗ trợ đồng thời nhiều kết nối và ổn định cho production

---

### Cách 1: Deploy lên Vercel (Khuyến nghị)

Vercel là nền tảng tốt nhất cho Next.js, miễn phí cho dự án nhỏ.

#### Bước 1: Chuẩn bị database PostgreSQL

Sử dụng **Neon** (miễn phí) hoặc **Supabase**:

**Với Neon:**
1. Truy cập [neon.tech](https://neon.tech)
2. Tạo tài khoản và tạo database mới
3. Copy connection string

**Với Supabase:**
1. Truy cập [supabase.com](https://supabase.com)
2. Tạo project mới
3. Vào Settings → Database → Copy connection string

#### Bước 2: Chuyển database sang PostgreSQL

Sửa file `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Thay "sqlite" thành "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Bước 3: Push code lên GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Bước 4: Deploy trên Vercel

1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub
3. Click "Add New..." → "Project"
4. Import repository của bạn
5. Cấu hình Environment Variables:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

6. Vào **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`

7. Click **Deploy**

#### Bước 5: Chạy migration sau deploy

Vào Vercel Dashboard → chọn project → **Deployments** → click vào deployment mới nhất → **Functions** → tìm terminal hoặc sử dụng Vercel CLI:

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Chạy migration
vercel env pull .env.production
npx prisma migrate deploy
```

Hoặc thêm vào `package.json` script:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "vercel-build": "prisma migrate deploy && npm run build"
  }
}
```

Sửa Vercel Build Command thành: `npm run vercel-build`

---

### Cách 2: Deploy lên Railway

Railway hỗ trợ cả app và database PostgreSQL.

#### Bước 1: Tạo tài khoản Railway
Truy cập [railway.app](https://railway.app) và đăng nhập bằng GitHub.

#### Bước 2: Tạo PostgreSQL database
1. Click "New Project" → "Provision PostgreSQL"
2. Copy `DATABASE_URL` từ biến môi trường của PostgreSQL service

#### Bước 3: Deploy ứng dụng
1. Trong cùng project, click "New" → "GitHub Repo"
2. Chọn repository của bạn
3. Railway tự động detect Next.js và build

#### Bước 4: Cấu hình Environment Variables

Thêm các biến môi trường trong Railway Dashboard:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

#### Bước 5: Chạy migration

Railway sẽ chạy script `postinstall` tự động. Đảm bảo `package.json` có:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "railway:build": "prisma migrate deploy && npm run build"
  }
}
```

Set Build Command trong Railway thành: `npm run railway:build`

---

### Cách 3: Deploy bằng Docker

#### Bước 1: Tạo Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

#### Bước 2: Tạo docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: pentaschool
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: pentaschool
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pentaschool"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://pentaschool:your_secure_password@postgres:5432/pentaschool
      NEXT_PUBLIC_APP_URL: http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

#### Bước 3: Build & Run

```bash
# Build và chạy
docker-compose up -d --build

# Chạy migration
docker-compose exec app npx prisma migrate deploy

# Tạo admin
docker-compose exec app node scripts/create-admin.js
```

Truy cập tại `http://localhost:3000`

---

### Cách 4: Deploy lên VPS (Ubuntu)

#### Bước 1: Chuẩn bị server

```bash
# Update hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Cài Nginx
sudo apt install -y nginx

# Cài PM2 (process manager)
sudo npm install -g pm2
```

#### Bước 2: Cấu hình PostgreSQL

```bash
# Tạo database và user
sudo -u postgres psql

CREATE DATABASE pentaschool;
CREATE USER pentaschool WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pentaschool TO pentaschool;
\q
```

#### Bước 3: Deploy ứng dụng

```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> pentaschool
cd pentaschool

# Cài dependencies
npm install

# Cấu hình environment
sudo nano .env
```

Nội dung `.env`:
```env
DATABASE_URL="postgresql://pentaschool:your_secure_password@localhost:5432/pentaschool"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

```bash
# Generate Prisma Client
npx prisma generate

# Chạy migration
npx prisma migrate deploy

# Build
npm run build

# Tạo admin
node scripts/create-admin.js
```

#### Bước 4: Cấu hình PM2

```bash
# Khởi động với PM2
pm2 start npm --name "pentaschool" -- start

# Auto-start khi reboot
pm2 startup
pm2 save
```

#### Bước 5: Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/pentaschool
```

Nội dung:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/pentaschool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Bước 6: Cài SSL (HTTPS) với Let's Encrypt

```bash
# Cài Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

---

## ⚠️ Đánh giá độ ổn định hệ thống

### 📊 Điểm đánh giá: 3.6/10

| Tiêu chí | Điểm | Vấn đề chính |
|----------|------|--------------|
| Error Handling | 4/10 | Nhiều endpoint thiếu try-catch |
| Database | 3/10 | SQLite không phù hợp production |
| Memory Management | 5/10 | Có cleanup nhưng không đầy đủ |
| Input Validation | 4/10 | Thiếu validation nhiều nơi |
| Scalability | 2/10 | Không thể scale với SQLite |

### 🔴 Các vấn đề NGHIÊM TRỌNG có thể gây sập

#### 1. SQLite Lock khi nhiều user cùng lúc
```
50 học sinh nộp bài cùng lúc
→ SQLite lock database (chỉ 1 writer)
→ Các request khác timeout
→ Server hết memory
→ 500 Error hàng loạt
```
**BẮT BUỘC:** Chuyển sang PostgreSQL trước khi deploy

#### 2. Prisma Connection Leak
- Nhiều API route thiếu `prisma.$disconnect()`
- Connection pool exhausted sau 100+ requests
- Hệ thống không accept thêm connection

#### 3. Memory Leak trong Frontend
- `PageEditor.tsx`: Không có AbortController cho fetch
- `CanvasEditorPro.tsx`: Canvas không dispose đúng
- Browser tab crash sau ~20 phút sử dụng

#### 4. File Upload lưu Base64 trong Database
- Database phình to nhanh chóng
- SQLite limit ~2-4GB → corrupt khi đạt limit
- **MẤT TOÀN BỘ DỮ LIỆU**

### 🚨 Tình huống sập dự đoán

| Scenario | Nguyên nhân | Kết quả |
|----------|------------|---------|
| Exam Submission Spike | 200 học sinh nộp bài 5 phút | SQLite lock → 50% fail |
| Large File Upload | PDF 50MB | OOM kill → crash |
| Canvas Heavy Usage | 20 slides với ảnh | Browser memory > 2GB → crash |
| Concurrent Teachers | 10 GV cùng tạo bài | DB connections exhausted → 503 |

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

> 📄 Xem thêm: `md_fil/SYSTEM_STABILITY_ANALYSIS.md`

---

## ⚠️ Lưu ý khi Deploy

### 1. 🔐 Bảo mật

```env
# ✅ Tạo password mạnh cho database
DATABASE_URL="postgresql://user:STRONG_PASSWORD@host:5432/db"

# ✅ Sử dụng HTTPS trong production
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# ✅ Bật SSL cho PostgreSQL
DATABASE_URL="postgresql://...?sslmode=require"
```

### 2. 📁 File Upload

Khi deploy, file upload cần được xử lý đặc biệt:

**Vercel/Railway (Serverless):**
- Không thể lưu file trên server
- Cần dùng **Cloudinary**, **AWS S3**, hoặc **UploadThing**

**VPS/Docker:**
- Mount volume cho thư mục `public/uploads`
- Đảm bảo quyền ghi: `chmod -R 755 public/uploads`

### 3. 🔄 Database Migration

```bash
# Khi thay đổi schema.prisma, luôn chạy migration trước khi deploy
npx prisma migrate dev --name describe_your_changes

# Trong production
npx prisma migrate deploy
```

### 4. 📊 Monitoring

```bash
# PM2 monitoring (VPS)
pm2 monit

# Xem logs
pm2 logs pentaschool

# Xem trạng thái
pm2 status
```

### 5. 🔄 Backup Database

```bash
# Backup PostgreSQL
pg_dump -U pentaschool -d pentaschool > backup_$(date +%Y%m%d).sql

# Restore
psql -U pentaschool -d pentaschool < backup_file.sql
```

### 6. ⚡ Performance

- Bật **caching** cho static assets trong Nginx
- Sử dụng **CDN** cho file media (video, images)
- Tối ưu **Prisma queries** (tránh N+1 queries)
- Sử dụng **connection pooling** cho PostgreSQL (PgBouncer)

### 7. 🌍 Environment Variables Checklist

| Variable | Mô tả | Bắt buộc |
|----------|--------|----------|
| `DATABASE_URL` | Connection string database | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL chính thức của app | ✅ |

### 8. 🚨 Lỗi thường gặp

**Lỗi: "Can't reach database server"**
```bash
# Kiểm tra database có chạy không
sudo systemctl status postgresql

# Kiểm tra connection string
npx prisma db pull
```

**Lỗi: "Module not found"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Lỗi: "Prisma Client not generated"**
```bash
# Regenerate client
npx prisma generate
```

**Lỗi: Build fail trên Vercel**
```json
// Thêm vào package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

---

## 📁 Cấu trúc thư mục

```
school/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data
│   └── migrations/            # Database migrations
├── public/
│   ├── uploads/               # File upload
│   └── videos/                # Video files
├── scripts/
│   ├── create-admin.js        # Tạo tài khoản admin
│   ├── test-parser.js         # Test parse Word
│   └── migrate-lectures-class.js
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   ├── admin/             # Trang Admin
│   │   ├── teacher/           # Trang Giáo viên
│   │   └── student/           # Trang Học sinh
│   ├── components/            # React Components
│   ├── services/              # API services
│   ├── hooks/                 # Custom hooks
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

## 🎯 API Endpoints chính

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |

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
| GET | `/api/pages/public` | Lấy bài giảng công khai |
| PUT | `/api/pages/[id]/blocks/reorder` | Sắp xếp block |

---

## 🔐 Bảo mật

- **Mật khẩu**: Mã hóa bằng `bcryptjs` (salt rounds = 10)
- **HTML**: Sanitize bằng `DOMPurify` chống XSS
- **Validation**: Sử dụng `Zod` để validate input
- **SSL**: Bắt buộc HTTPS trong production
- **Database**: SSL connection cho PostgreSQL

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