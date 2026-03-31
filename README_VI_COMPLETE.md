# 📚 Hệ Thống Quản Lý Học Tập - Penta School

> Một nền tảng giáo dục hiện đại giúp giáo viên chia sẻ tài liệu và học sinh truy cập nội dung học tập một cách linh hoạt và an toàn.

## 🎯 Giới thiệu Hệ Thống

Penta School là một hệ thống quản lý học tập (LMS - Learning Management System) được xây dựng với công nghệ hiện đại. Hệ thống hỗ trợ:

- 📖 Quản lý tài liệu đa dạng (Video, PowerPoint, Word, PDF, ảnh)
- 📝 Tạo bài giảng có cấu trúc phân cấp với các khối nội dung linh hoạt
- 🎥 Tích hợp video với các câu hỏi tương tác tại các điểm dừng
- 📋 Quản lý quiz và bài kiểm tra trực tuyến
- 🎨 Công cụ vẽ (Canvas) để tạo slide và nội dung trực quan
- 💬 Hệ thống bình luận với xóa tự động sau 7 ngày
- 👥 Quản lý người dùng với 3 vai trò: Admin, Giáo viên, Học sinh
- ⚡ Xác thực người dùng và phân quyền

---

## 🏗️ Cấu Trúc Cơ Sở Dữ Liệu

### 📊 Sơ Đồ Quan Hệ

```
User (1) ──── (M) Document
      ├─── (1) ──── (M) Page
      ├─── (1) ──── (M) Comment
      └─── (1) ──── (M) ActivationCode

Page (1) ──── (1) Page (tự tham chiếu - cấu trúc cây)
     └─── (1) ──── (M) PageBlock

PageBlock (1) ──── (M) PageDocument
          ├─── (M) ContentItem
          ├─── (M) Quiz
          └─── (M) VideoInteraction

Quiz (1) ──── (M) Question
    └─── (M) QuestionOption

Comment (1) ──── (M) Comment (tự tham chiếu - reply)
```

### 📋 Chi Tiết Các Bảng

#### 1. **User** - Dữ liệu người dùng
```sql
id (String) ................. Mã định danh duy nhất (CUID)
email (String) .............. Email người dùng (duy nhất)
name (String) ............... Tên đầy đủ
password (String) ........... Mật khẩu (mã hóa bcrypt)
role (UserRole) ............. Vai trò: ADMIN, TEACHER, STUDENT
isActive (Boolean) .......... Trạng thái kích hoạt tài khoản
createdAt (DateTime) ........ Thời gian tạo tài khoản
updatedAt (DateTime) ........ Thời gian cập nhật cuối cùng

Mã chỉ mục:
- email (tìm người dùng theo email)
- role (phân loại theo vai trò)
- isActive (lọc tài khoản hoạt động)
```

#### 2. **ActivationCode** - Mã kích hoạt tài khoản
```sql
id (String) ................. Mã định danh duy nhất
code (String) ............... Mã kích hoạt (duy nhất)
isUsed (Boolean) ............ Trạng thái sử dụng
usedBy (String) ............. Email người sử dụng (nếu đã dùng)
createdAt (DateTime) ........ Thời gian tạo mã
expiresAt (DateTime) ........ Thời gian hết hạn

Mã chỉ mục:
- code (tìm mã kích hoạt)
- isUsed (lọc mã chưa sử dụng)
- expiresAt (dọn dẹp mã hết hạn)
```

#### 3. **Document** - Tài liệu do người dùng tải lên
```sql
id (String) ................. Mã định danh duy nhất
title (String) .............. Tiêu đề tài liệu
description (String) ........ Mô tả chi tiết
fileUrl (String) ............ URL tệp đã tải lên
fileType (DocumentType) ..... Loại tệp: VIDEO|POWERPOINT|WORD|PDF|IMAGE|OTHER
fileSize (Int) .............. Dung lượng tệp (bytes)
author (User) ............... Người tải lên (tham chiếu)
authorId (String) ........... ID tác giả
score (Int) ................. Điểm số (0-100) cho bài tập
isAchieved (Boolean) ........ Đạt/Không đạt (cho bài kiểm tra)
status (String) ............. Trạng thái: submitted|graded|achieved
gradedBy (String) ........... ID giáo viên chấm điểm
gradedAt (DateTime) ......... Thời gian chấm điểm
createdAt (DateTime) ........ Thời gian tải lên
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- authorId (tìm tài liệu của một tác giả)
- fileType (lọc theo loại tệp)
- createdAt (sắp xếp theo ngày)
- status (theo dõi trạng thái chấm điểm)
```

#### 4. **Page** - Bài giảng / Trang nội dung (cấu trúc phân cấp)
```sql
id (String) ................. Mã định danh duy nhất
title (String) .............. Tiêu đề bài giảng
slug (String) ............... Đường dẫn tĩnh (URL-friendly)
description (String) ........ Mô tả bài giảng
parentId (String) ........... ID trang cha (NULL = trang gốc)
author (User) ............... Tác giả (tham chiếu)
authorId (String) ........... ID tác giả
order (Int) ................. Thứ tự hiển thị trong danh sách
isPublished (Boolean) ....... Trạng thái công khai
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- authorId (tìm trang của tác giả)
- parentId (lấy các trang con)
- isPublished (chỉ hiện trang công khai)
- createdAt (sắp xếp theo ngày)
- unique(slug, authorId) (đảm bảo slug duy nhất trên người dùng)
```

#### 5. **PageBlock** - Khối nội dung trong bài giảng
```sql
id (String) ................. Mã định danh duy nhất
page (Page) ................. Trang chứa (tham chiếu)
pageId (String) ............. ID trang
type (BlockType) ............ Loại khối: 
                             - VIDEO: nhúng video
                             - DOCUMENT: tài liệu đính kèm
                             - TEXT: nội dung văn bản
                             - CONTENT: khối nội dung với hình ảnh
                             - QUIZ: bài kiểm tra
                             - CANVA: công cụ vẽ/slide
order (Int) ................. Thứ tự hiển thị trong trang
videoUrl (String) ........... URL video (YouTube, Vimeo, upload)
videoType (String) .......... Nguồn video: youtube|vimeo|upload
poster (String) ............. Hình thu nhỏ video
interactions (String) ....... JSON: danh sách câu hỏi tương tác video
content (String) ............ Nội dung văn bản (HTML, LaTeX)
slidesData (String) ......... JSON: dữ liệu canvas/slide
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- pageId (lấy tất cả khối của trang)
- type (lọc theo loại khối)
- order (sắp xếp khối)
```

#### 6. **PageDocument** - Tài liệu trong khối Document
```sql
id (String) ................. Mã định danh duy nhất
block (PageBlock) ........... Khối chứa (tham chiếu)
blockId (String) ............ ID khối
title (String) .............. Tiêu đề tài liệu
fileUrl (String) ............ URL tệp
fileType (String) ........... Loại tệp: pdf|doc|docx|ppt|pptx|xlsx...
fileSize (Int) .............. Dung lượng (bytes)
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- blockId (lấy tài liệu của khối)
```

#### 7. **ContentItem** - Mục nội dung (hình ảnh + tiêu đề)
```sql
id (String) ................. Mã định danh duy nhất
block (PageBlock) ........... Khối chứa (tham chiếu)
blockId (String) ............ ID khối
title (String) .............. Tiêu đề nội dung
image (String) .............. Base64 hoặc URL hình ảnh
shortcutCode (String) ....... Mã tắt để chia sẻ
shortcutUrl (String) ........ URL đường dẫn (QR code, v.v.)
order (Int) ................. Thứ tự hiển thị
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- blockId (lấy nội dung của khối)
- shortcutCode (tìm nội dung qua mã tắt)
```

#### 8. **Quiz** - Bài kiểm tra
```sql
id (String) ................. Mã định danh duy nhất
block (PageBlock) ........... Khối chứa (tham chiếu)
blockId (String) ............ ID khối
title (String) .............. Tiêu đề bài kiểm tra
order (Int) ................. Thứ tự hiển thị
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- blockId (lấy quiz của khối)
- blockId + order (sắp xếp quiz)
```

#### 9. **Question** - Câu hỏi
```sql
id (String) ................. Mã định danh duy nhất
quiz (Quiz) ................. Bài kiểm tra chứa (tham chiếu)
quizId (String) ............. ID quiz
questionText (String) ....... Nội dung câu hỏi
questionType (String) ....... Loại câu hỏi: 
                             - multiple: nhiều lựa chọn
                             - trueFalse: đúng/sai
                             - openEnded: tự luận
order (Int) ................. Thứ tự câu hỏi
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- quizId (lấy câu hỏi của quiz)
- order (sắp xếp câu hỏi)
```

#### 10. **QuestionOption** - Lựa chọn câu hỏi
```sql
id (String) ................. Mã định danh duy nhất
question (Question) ......... Câu hỏi chứa (tham chiếu)
questionId (String) ......... ID câu hỏi
optionText (String) ......... Nội dung lựa chọn
isCorrect (Boolean) ......... Là đáp áp đúng?
order (Int) ................. Thứ tự hiển thị lựa chọn
createdAt (DateTime) ........ Thời gian tạo
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- questionId (lấy lựa chọn của câu hỏi)
- order (sắp xếp lựa chọn)
```

#### 11. **Comment** - Bình luận (tự động xóa sau 7 ngày)
```sql
id (String) ................. Mã định danh duy nhất
blockId (String) ............ ID khối hoặc "page-{pageId}"
author (User) ............... Người bình luận (tham chiếu)
authorId (String) ........... ID tác giả
replyTo (Comment) ........... Bình luận gốc nếu là reply (tham chiếu)
replyToCommentId (String) ... ID bình luận gốc
content (String) ............ Nội dung bình luận
createdAt (DateTime) ........ Thời gian bình luận
expiresAt (DateTime) ........ Thời gian hết hạn (7 ngày)
updatedAt (DateTime) ........ Thời gian cập nhật

Mã chỉ mục:
- blockId (lấy bình luận của khối)
- authorId (bình luận của người dùng)
- replyToCommentId (lấy reply của bình luận)
- createdAt (sắp xếp theo ngày)
- expiresAt (tìm bình luận hết hạn để xóa)
```

---

## 🎮 Chức Năng Chính

### 👥 Quản Lý Người Dùng

| Chức năng | Admin | Giáo viên | Học sinh |
|-----------|-------|----------|---------|
| Tạo mã kích hoạt | ✅ | ❌ | ❌ |
| Quản lý mã kích hoạt | ✅ | ❌ | ❌ |
| Tạo bài giảng | ✅ | ✅ | ❌ |
| Tải tài liệu | ✅ | ✅ | ❌ |
| Xem bài giảng | ✅ | ✅ | ✅ |
| Bình luận | ✅ | ✅ | ✅ |
| Làm bài kiểm tra | ✅ | ✅ | ✅ |

### 📖 Quản Lý Bài Giảng

- **Cấu trúc phân cấp**: Bài giảng có thể có các trang con, tạo cấu trúc chương -> bài học
- **Phát hành bài giảng**: Công khai hoặc riêng tư
- **Sắp xếp nội dung**: Kéo thả để xắp xếp thứ tự

### 📑 Khối Nội Dung (PageBlock)

Một bài giảng có thể chứa nhiều khối nội dung:

#### **1. Khối Video (VIDEO)**
- Hỗ trợ YouTube, Vimeo, hoặc tải lên trực tiếp
- Tương tác video: Thêm câu hỏi tại các điểm dừng cụ thể
- Lưu trữ dữ liệu tương tác dưới dạng JSON

#### **2. Khối Tài Liệu (DOCUMENT)**
- Liên kết nhiều tài liệu (PDF, Word, PowerPoint, v.v.)
- Hiển thị danh sách tài liệu để tải về

#### **3. Khối Văn Bản (TEXT)**
- Hỗ trợ HTML giàu định dạng
- Hỗ trợ LaTeX cho công thức toán học
- Xử lý bằng DOMPurify để bảo mật

#### **4. Khối Nội Dung (CONTENT)**
- Hiển thị mục nội dung với hình ảnh
- Tạo mã tắt và URL để chia sẻ
- Hỗ trợ QR code cho các nội dung

#### **5. Khối Bài Kiểm Tra (QUIZ)**
- Tạo quiz với nhiều câu hỏi
- Hỗ trợ loại câu hỏi:
  - Trắc nghiệm (multiple choice)
  - Đúng/Sai (true/false)
  - Tự luận (open-ended)
- Lưu giữ câu trả lời

#### **6. Khối Vẽ (CANVA)**
- Công cụ vẽ sử dụng Fabric.js
- Tạo slide với các hình, văn bản, hình ảnh
- Lưu trữ dữ liệu canvas dưới dạng JSON

### 💬 Hệ Thống Bình Luận

- **Bình luận cấp độ khối**: Có thể bình luận trên khối nội dung hoặc toàn trang
- **Trả lời bình luận**: Hỗ trợ comment threading
- **Tự động xóa**: Bình luận hết hạn sau 7 ngày (qua cron job)
- **Xác thực người dùng**: Chỉ người đã đăng nhập mới bình luận

### 📊 Chấm Điểm Bài Tập

- Giáo viên chấm điểm tài liệu do học sinh tải lên
- Lưu trữ: điểm số (0-100), trạng thái (đạt/không đạt), thời gian chấm, người chấm

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend & Framework
- **Next.js 16.1.6** - React framework với App Router
- **React 19.2.3** - Thư viện UI
- **TypeScript 5** - Ngôn ngữ lập trình
- **Tailwind CSS 4** - CSS framework
- **Lucide React** - Icon library

### Backend & Database
- **Prisma 6.19.2** - ORM (Object-Relational Mapping)
- **SQLite** - CSDL nhẹ (dev), có thể thay PostgreSQL

### Công Cụ & Thư Viện
- **Fabric.js 5.3.0** - Thư viện vẽ 2D
- **KaTeX 0.16.28** - Render công thức toán học
- **DOMPurify 3.0.6** - Sanitize HTML
- **dnd-kit** - Thư viện kéo thả
- **Zustand** - State management
- **Zod** - Schema validation
- **bcryptjs** - Mã hóa mật khẩu
- **UUID** - Tạo ID duy nhất

### Công Cụ Phát Triển
- **ESLint** - Linting
- **PostCSS** - CSS processing
- **React Hot Toast** - Thông báo

---

## 📁 Cấu Trúc Dự Án

```
school/
├── prisma/
│   ├── schema.prisma ............. Định nghĩa CSDL
│   ├── seed.js/ts ................ Dữ liệu mẫu ban đầu
│   ├── migrations/ ............... Lịch sử thay đổi CSDL
│   └── dev.db .................... File CSDL SQLite
├── src/
│   ├── app/
│   │   ├── layout.tsx ............ Root layout
│   │   ├── page.tsx .............. Trang chủ
│   │   ├── api/ .................. API routes
│   │   │   ├── auth/ ............. Xác thực (login, register)
│   │   │   ├── pages/ ............ CRUD bài giảng
│   │   │   ├── documents/ ........ CRUD tài liệu
│   │   │   ├── blocks/ ........... CRUD khối nội dung
│   │   │   ├── quizzes/ .......... CRUD quiz
│   │   │   ├── comments/ ......... CRUD bình luận
│   │   │   ├── admin/ ............ Quản lý admin (mã kích hoạt)
│   │   │   ├── cron/ ............. Công việc định kỳ (dọn dẹp bình luận)
│   │   │   └── ... (các API khác)
│   │   ├── auth/ ................. Trang xác thực
│   │   ├── dashboard/ ............ Bảng điều khiển
│   │   ├── teacher/ .............. Tính năng giáo viên
│   │   │   ├── upload ............ Tải tài liệu
│   │   │   ├── create-page ....... Tạo bài giảng
│   │   │   ├── manage-pages ...... Quản lý bài giảng
│   │   │   └── submissions ....... Xem bài nộp
│   │   ├── student/ .............. Tính năng học sinh
│   │   │   ├── browse ............ Duyệt tài liệu
│   │   │   ├── view/ ............. Xem bài giảng
│   │   │   └── submissions ....... Nộp bài tập
│   │   ├── admin/ ................ Tính năng admin
│   │   │   └── codes ............ Quản lý mã kích hoạt
│   │   ├── canva/ ................ Công cụ vẽ Canvas
│   │   └── [slug]/ ............... Trang động (bài giảng công khai)
│   │
│   ├── components/
│   │   ├── shared/ ............... Header, Footer, Navigation
│   │   ├── editor/ ............... Các component chỉnh sửa
│   │   │   ├── PageEditor.tsx .... Editor bài giảng
│   │   │   ├── CanvasEditorPro .. Editor Canvas
│   │   │   ├── VideoInteractionOverlay
│   │   │   ├── CommentSection .... Bình luận
│   │   │   └── ...
│   │   ├── cards/ ................ Card hiển thị
│   │   │   ├── DocumentCard
│   │   │   ├── VideoCard
│   │   │   ├── QuizCard
│   │   │   └── ...
│   │   ├── upload/ ............... Upload tệp
│   │   ├── teacher/ .............. Component giáo viên
│   │   ├── student/ .............. Component học sinh
│   │   ├── admin/ ................ Component admin
│   │   ├── latex/ ................ Render LaTeX
│   │   ├── quiz/ ................. Quiz UI
│   │   └── ...
│   │
│   ├── services/
│   │   ├── userService.ts ........ Quản lý người dùng
│   │   ├── documentService.ts .... Quản lý tài liệu
│   │   ├── quizService.ts ........ Quản lý quiz
│   │   ├── adminService.ts ....... Quản lý admin
│   │   ├── commentCleanup.ts ..... Xóa bình luận hết hạn
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── prisma.ts ............ Prisma client (singleton)
│   │   ├── auth.ts .............. Xác thực helper
│   │   ├── utils.ts ............. Tiện ích chung
│   │   ├── validators.ts ........ Zod schemas
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useAuth.ts ........... Hook xác thực
│   │   ├── usePages.ts .......... Hook quản lý bài giảng
│   │   ├── useFetch.ts .......... Hook fetch dữ liệu
│   │   └── ...
│   │
│   ├── stores/
│   │   └── editorStore.ts ....... Zustand state management
│   │
│   ├── types/
│   │   └── index.ts ............. TypeScript types
│   │
│   └── utils/
│       ├── cn.ts ................ Class name merge (clsx)
│       ├── formatters.ts ........ Format dữ liệu
│       └── ...
│
├── public/
│   └── ... (tệp tĩnh, logo, hình ảnh)
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── eslint.config.mjs
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt

### Điều Kiện Tiên Quyết

- Node.js 18+ 
- npm hoặc yarn
- SQLite (đã tích hợp sẵn)

### Bước 1: Clone & Cài Đặt Dependencies

```bash
# Clone dự án
git clone <repository-url>
cd school

# Cài đặt dependencies
npm install
```

### Bước 2: Cấu Hình Biến Môi Trường

Tạo file `.env.local` trong thư mục gốc:

```bash
# Database URL
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret (tạo random string)
JWT_SECRET="your-secret-key-here"

# API Base URL
NEXT_PUBLIC_API_URL="http://localhost:3000"

# NextAuth configuration (nếu cần)
NEXTAUTH_URL="http://localhost:3000"
```

### Bước 3: Thiết Lập Cơ Sở Dữ Liệu

```bash
# Chạy migration tạo bảng
npm run prisma:migrate

# (Tùy chọn) Tạo dữ liệu mẫu
npm run prisma:seed

# Sinh Prisma client
npx prisma generate
```

### Bước 4: Chạy Ứng Dụng

```bash
# Development server
npm run dev

# Truy cập: http://localhost:3000
```

### Bước 5: Xây Dựng cho Production

```bash
# Build dự án
npm run build

# Start production server
npm run start
```

---

## 📡 API Endpoints

### Authentication / Xác Thực

```
POST /api/auth/register ............ Đăng ký tài khoản mới
POST /api/auth/login ............... Đăng nhập
```

### Pages / Bài Giảng

```
GET    /api/pages .................. Lấy danh sách bài giảng
POST   /api/pages .................. Tạo bài giảng mới
GET    /api/pages/:id .............. Lấy chi tiết bài giảng
PUT    /api/pages/:id .............. Cập nhật bài giảng
DELETE /api/pages/:id .............. Xóa bài giảng
GET    /api/pages/public ........... Lấy bài giảng công khai
```

### PageBlocks / Khối Nội Dung

```
POST   /api/pages/:pageId/blocks ... Thêm khối vào bài giảng
PUT    /api/blocks/:blockId ........ Cập nhật khối
DELETE /api/blocks/:blockId ........ Xóa khối
```

### Documents / Tài Liệu

```
POST   /api/documents .............. Tải tài liệu lên
GET    /api/documents .............. Lấy danh sách tài liệu
GET    /api/documents/:id .......... Lấy chi tiết tài liệu
PUT    /api/documents/:id .......... Cập nhật tài liệu (chấm điểm)
DELETE /api/documents/:id .......... Xóa tài liệu
```

### Quizzes / Bài Kiểm Tra

```
POST   /api/quiz ................... Tạo quiz mới
GET    /api/quiz/:id ............... Lấy chi tiết quiz
PUT    /api/quiz/:id ............... Cập nhật quiz
DELETE /api/quiz/:id ............... Xóa quiz
GET    /api/quiz/questions ......... Lấy danh sách câu hỏi quiz
```

### Questions / Câu Hỏi

```
POST   /api/quiz/questions ......... Thêm câu hỏi vào quiz
PUT    /api/quiz/questions ......... Cập nhật câu hỏi quiz
DELETE /api/quiz/questions ......... Xóa câu hỏi quiz
```

### Comments / Bình Luận

```
POST   /api/comments ............... Thêm bình luận
GET    /api/comments/:blockId ...... Lấy bình luận của khối
PUT    /api/comments/:commentId .... Cập nhật bình luận
DELETE /api/comments/:commentId .... Xóa bình luận
```

### Admin / Quản Trị

```
POST   /api/admin/codes ............ Tạo mã kích hoạt
GET    /api/admin/codes ............ Lấy danh sách mã
```

### Utilities / Tiện Ích

```
POST   /api/cron/comment-cleanup ... Xóa bình luận hết hạn (Cron Job)
GET    /api/download ............... Tải file với auth
```

---

## 🔐 Bảo Mật

### Mã Hóa Mật Khẩu
- Sử dụng **bcryptjs** để mã hóa mật khẩu trước khi lưu
- Xác thực khi đăng nhập

### Xác Thực & Phân Quyền
- Mã kích hoạt cho tài khoản mới (ADMIN tạo mã)
- JWT tokens cho session management
- Kiểm tra vai trò (role-based access)

### Bảo Vệ Dữ Liệu
- **DOMPurify**: Xử lý HTML content để ngăn XSS
- **Zod**: Validate dữ liệu input
- **CORS** & **CSRF protection** (cấu hình bổ sung)

### Xóa Dữ Liệu Tự Động
- Bình luận tự động xóa sau 7 ngày
- Cron job chạy định kỳ để dọn dẹp

---

## 📊 Ví Dụ Luồng Dữ Liệu

### Luồng 1: Giáo Viên Tạo & Xuất Bản Bài Giảng

```
1. Giáo viên đăng nhập → /api/auth/login
2. Tạo bài giảng → POST /api/pages
   ├─ Tạo khối video → POST /api/blocks (type: VIDEO)
   ├─ Tạo khối quiz → POST /api/blocks (type: QUIZ)
   │  ├─ Thêm câu hỏi → POST /api/questions
   │  └─ Thêm lựa chọn → POST /api/question-options
   ├─ Tạo khối text → POST /api/blocks (type: TEXT)
   └─ Xuất bản → PUT /api/pages/:id (isPublished: true)
```

### Luồng 2: Học Sinh Xem Bài Giảng & Bình Luận

```
1. Học sinh đăng nhập → /api/auth/login
2. Duyệt bài giảng công khai → GET /api/pages/public
3. Xem chi tiết bài giảng → GET /api/pages/:id
   ├─ Lấy tất cả khối → GET /api/pages/:id/blocks
   ├─ Xem video & tương tác
   ├─ Làm bài kiểm tra → POST /api/quiz-submissions
   └─ Bình luận → POST /api/comments
```

### Luồng 3: Giáo Viên Chấm Điểm

```
1. Giáo viên xem bài tập → GET /api/teacher/submissions
2. Tải file bài tập
3. Chấm điểm & lưu → PUT /api/documents/:id
   {
     score: 85,
     isAchieved: true,
     status: "graded"
   }
```

---

## 🧪 Testing & Development

### Chạy Prisma Studio (Xem CSDL trực quan)

```bash
npx prisma studio
# Mở http://localhost:5555
```

### Reset Database

```bash
# Xóa tất cả dữ liệu và re-run migrations
npm run prisma:reset
```

### Build & Lint Check

```bash
# Kiểm tra linting
npm run lint

# Build production
npm run build
```

---

## 🐛 Troubleshooting

### Lỗi: `PrismaClient` không tìm thấy

```bash
npx prisma generate
```

### Lỗi migration

```bash
# Reset database
npm run prisma:reset

# Re-run migrations
npm run prisma:migrate
```

### Port 3000 đã được sử dụng

```bash
# Chạy trên port khác
npm run dev -- -p 3001
```

---

## 📝 Hướng Phát Triển

### Tính năng sắp tới

- [ ] Upload file lên S3/Cloud Storage
- [ ] Thống kê & Analytics
- [ ] Export bài giảng thành PDF
- [ ] Video live streaming
- [ ] Notification system
- [ ] Mobile app
- [ ] Multi-language support tích phân
- [ ] Theme customization

### Cải thiện hiệu năng

- [ ] Pagination cho danh sách lớn
- [ ] Caching (Redis)
- [ ] CDN cho file & image
- [ ] Optimize Prisma queries
- [ ] Image compression

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Contributors

- Development Team

---

## 📧 Support

Để báo cáo lỗi hoặc đề xuất tính năng, vui lòng tạo issue trên repository.

---

## 📚 Tài Liệu Tham Khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Documentation](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)

---

**Cập nhật lần cuối**: March 2026
