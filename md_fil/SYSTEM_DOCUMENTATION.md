# Hệ thống quản lý trang bài giảng động (Dynamic Page Management System)

Hệ thống này cho phép giáo viên tạo, quản lý và xuất bản các trang bài giảng với nội dung động, bao gồm video, tài liệu và embedded content.

## Tính năng chính

### 1. **Cấu trúc cây (Tree Structure) cho quản lý trang**
- Tạo các trang cha và trang con
- Quản lý phân cấp nội dung trực quan
- Drag & Drop để sắp xếp lại trang

### 2. **Ba nút chức năng chính**

#### 🎥 Nút 1: Chèn Video (Video Block)
- **Hỗ trợ**:
  - YouTube links (youtube.com/watch?v=xxx, youtu.be/xxx)
  - Vimeo links (vimeo.com/xxx)
  - Upload trực tiếp (.mp4)
- **Tính năng**:
  - Tự động phát hiện loại video
  - Thiết lập poster/thumbnail tuỳ chọn
  - Responsive với aspect ratio 16:9
  - Chỉnh sửa và xóa video

#### 📄 Nút 2: Tài liệu cho học sinh (Document Block)
- **Hỗ trợ các định dạng**:
  - PDF, Word (doc/docx)
  - PowerPoint (ppt/pptx)
  - Excel (xls/xlsx)
  - Và các loại tệp khác
- **Tính năng**:
  - Thêm/xóa tài liệu
  - Hiển thị biểu tượng theo loại tệp
  - Download button cho học sinh
  - Hiển thị kích thước tệp

#### 🔗 Nút 3: Nhúng nội dung (Embed Block)
- **Hỗ trợ**:
  - Wordwall
  - Quizizz
  - Kahoot
  - Bất kỳ iframe/script nào từ nguồn đáng tin cậy
- **Bảo mật**:
  - Sanitization tự động với DOMPurify
  - Chỉ cho phép iframe và attributes an toàn
  - Ngăn chặn XSS attacks

## Cấu trúc cơ sở dữ liệu

### Models Chính

```
User (Giáo viên / Học sinh)
├── pages: Page[]
└── documents: Document[]

Page (Trang bài giảng)
├── parentId (null = trang cha)
├── children: Page[]
├── blocks: PageBlock[]
├── author: User
└── order (thứ tự hiển thị)

PageBlock (Khối nội dung)
├── type: VIDEO | DOCUMENT | EMBED | TEXT
├── Video fields (videoUrl, videoType, poster)
├── Document fields (documents: PageDocument[])
├── Embed fields (embedCode, embedPageId)
└── Text fields (content)

PageDocument (Tài liệu)
├── block: PageBlock
├── fileUrl
├── fileType
└── fileSize
```

## API Endpoints

### Pages
- `GET /api/pages?authorId=xxx` - Lấy tất cả pages
- `POST /api/pages` - Tạo page mới
- `GET /api/pages/{id}` - Lấy page chi tiết
- `PUT /api/pages/{id}` - Cập nhật page
- `DELETE /api/pages/{id}` - Xóa page

### Blocks
- `POST /api/blocks` - Tạo block mới
- `GET /api/blocks/{id}` - Lấy block chi tiết
- `PUT /api/blocks/{id}` - Cập nhật block
- `DELETE /api/blocks/{id}` - Xóa block

### Documents
- `POST /api/blocks/{id}/documents` - Thêm tài liệu
- `DELETE /api/blocks/{id}/documents?documentId=xxx` - Xóa tài liệu

### Public Pages
- `GET /api/public/pages/{slug}` - Lấy page công khai

## Cách sử dụng cho giáo viên

### 1. Truy cập trang editor
```
/teacher/editor
```

### 2. Tạo trang mới
- Nhấp "Trang mới" trong sidebar
- Nhập tên trang và slug
- Trang sẽ được tạo ngay lập tức

### 3. Thêm nội dung
- Sử dụng 3 nút chức năng ở dưới cùng
- Mỗi nút sẽ thêm một block mới
- Chỉnh sửa hoặc xóa block bằng toolbar hover

### 4. Quản lý cấu trúc
- Kéo thả để sắp xếp trang
- Tạo trang con bằng cách chọn parent page

### 5. Xuất bản trang
- Bật công khai bằng toggle "Công khai"
- Trang sẽ có sẵn tại `/{slug}`

## Cách sử dụng cho học sinh

### Xem trang bài giảng
1. Truy cập `/{page-slug}`
2. Xem video, tài liệu và nội dung nhúng
3. Download tài liệu bằng nút "Download"
4. Tương tác với Wordwall, Quizizz, Kahoot trực tiếp

## Setup và triển khai

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cài đặt database
```bash
npm run prisma:migrate
```

### 3. Khởi động development server
```bash
npm run dev
```

## Các packages đã thêm

- `@dnd-kit/core` - Drag & Drop toolkit
- `@dnd-kit/sortable` - Sortable collections
- `@dnd-kit/utilities` - DND utilities
- `dompurify` - HTML sanitization
- `react-hot-toast` - Toast notifications
- `zod` - Schema validation

## Bảo mật

1. **Embed Code**: Tất cả embedCode được sanitize với DOMPurify trước khi lưu
2. **Authorization**: Chỉ giáo viên có thể tạo/sửa trang của mình
3. **Public Pages**: Chỉ published pages mới hiển thị cho học sinh
4. **File Access**: URLs tài liệu phải từ các nguồn đáng tin cậy

## Các tính năng trong tương lai

- [ ] Rich text editor cho text blocks
- [ ] Drag & drop để sắp xếp blocks
- [ ] Thống kê học sinh truy cập
- [ ] Comments/feedback từ học sinh
- [ ] Quản lý phiên bản nội dung
- [ ] Export page thành PDF

---

**Ngày tạo**: February 15, 2026
**Phiên bản**: 1.0
