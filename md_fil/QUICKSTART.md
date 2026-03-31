# 🚀 Quick Start - Hệ thống quản lý trang bài giảng động

## ⚡ Các bước nhanh

### 1️⃣ Cài đặt Dependencies
```bash
npm install
```

### 2️⃣ Cập nhật Database
```bash
npm run prisma:migrate
```

Hoặc nếu muốn reset database hoàn toàn:
```bash
npm run prisma:reset
```

### 3️⃣ Khởi động Development Server
```bash
npm run dev
```

### 4️⃣ Truy cập Editor
```
http://localhost:3000/teacher/editor
```

---

## 📱 Các tính năng chính

### 🎥 Video Block
- Hỗ trợ YouTube, Vimeo, và upload trực tiếp
- Tự động detect loại video
- Thiết lập poster/thumbnail
- Responsive 16:9 aspect ratio

### 📄 Document Block  
- Upload tài liệu (PDF, Word, PowerPoint, Excel)
- Download button cho học sinh
- Hiển thị biểu tượng theo loại file
- Hiển thị kích thước file

### 🔗 Embed Block
- Nhúng Wordwall, Quizizz, Kahoot
- Sanitized code (bảo mật)
- Custom iframe support

### � Content Block (MỚI ✨)
- Thêm ảnh và tiêu đề cho nội dung
- Hiển thị dạng grid 3 cột (3x3 = 9 items/trang)
- Tự động phân trang khi vượt quá 9 items
- Tạo shortcut/link cho từng item
- Copy shortcut code để chia sẻ
- Xem lại: [CONTENT_BLOCK_GUIDE.md](CONTENT_BLOCK_GUIDE.md)

### �🌳 Page Tree Management
- Tạo pages phân cấp
- Drag & Drop để sắp xếp
- Quản lý parent/child pages

---

## 🎯 Use Cases

### Cho Giáo viên
1. Tạo trang bài giảng
2. Thêm video giảng dạy
3. Upload tài liệu bài tập
4. Nhúng bài test (Wordwall/Quizizz)
5. Xuất bản trang cho học sinh

### Cho Học sinh
1. Xem bài giảng
2. Xem video
3. Download tài liệu
4. Làm bài test/quiz
5. Tương tác với nội dung nhúng

---

## 📂 File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── pages/              # Pages API
│   │   ├── blocks/             # Blocks API
│   │   └── public/             # Public pages API
│   ├── teacher/
│   │   └── editor/             # Page editor
│   └── [slug]/                 # Public page viewer
├── components/
│   └── editor/                 # All editor components
├── hooks/
│   └── useDragDrop.ts          # DND hooks
└── lib/
    └── video-utils.ts          # Video parsing
```

---

## 🔌 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/pages?authorId=` | Lấy tất cả pages |
| POST | `/api/pages` | Tạo page mới |
| GET | `/api/pages/{id}` | Lấy page chi tiết |
| PUT | `/api/pages/{id}` | Cập nhật page |
| DELETE | `/api/pages/{id}` | Xóa page |
| POST | `/api/blocks` | Tạo block (VIDEO, DOCUMENT, EMBED, **CONTENT**) |
| PUT | `/api/blocks/{id}` | Cập nhật block (hỗ trợ items array) |
| DELETE | `/api/blocks/{id}` | Xóa block |
| POST | `/api/blocks/{id}/documents` | Thêm tài liệu |
| GET | `/api/public/pages/{slug}` | Lấy public page |

---

## 📋 Request/Response Examples

### Create Page (POST /api/pages)
```json
{
  "title": "Bài 1: Giới thiệu HTML",
  "slug": "bai-1-html",
  "description": "Bài giảng về HTML cơ bản",
  "authorId": "teacher-1",
  "parentId": null
}
```

Response:
```json
{
  "id": "page-123",
  "title": "Bài 1: Giới thiệu HTML",
  "slug": "bai-1-html",
  "description": "Bài giảng về HTML cơ bản",
  "blocks": [],
  "children": [],
  "...": "..."
}
```

### Add Video Block (POST /api/blocks)
```json
{
  "pageId": "page-123",
  "type": "VIDEO",
  "videoUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "videoType": "youtube",
  "poster": "https://example.com/poster.jpg"
}
```

### Add Document (POST /api/blocks/{blockId}/documents)
```json
{
  "title": "Bài tập về nhà",
  "fileUrl": "https://example.com/homework.pdf",
  "fileType": "pdf",
  "fileSize": 2048000
}
```

### Create Embed (POST /api/blocks)
```json
{
  "pageId": "page-123",
  "type": "EMBED", 
  "embedCode": "<iframe src=\"https://wordwall.net/...\" ...></iframe>"
}
```

---

## 🛠️ Troubleshooting

### "Cannot find module 'react-hot-toast'"
```bash
npm install react-hot-toast
```

### Database migration failed
```bash
# Xoá database cũ
npm run prisma:reset

# Hoặc chỉ create migrations
npm run prisma:migrate
```

### Videos không load
- Kiểm tra URL có hợp lệ không
- Kiểm tra CORS settings
- Đảm bảo domain YouTube/Vimeo được phép

### Drag & Drop không hoạt động
- Đảm bảo `@dnd-kit` packages đã install
- Kiểm tra console cho errors
- Thử reload trang

---

## 🔐 Security Notes

1. **Embed Code**: Tất cả được sanitize với DOMPurify
2. **File Uploads**: URL phải từ trusted sources (cloudinary, aws s3, etc)
3. **Authorization**: API kiểm tra authorId
4. **CORS**: Configure properly cho production

---

## 📚 Documentation

- **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** - Tài liệu hệ thống đầy đủ
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Hướng dẫn chi tiết
- **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** - Tóm tắt setup

---

## 🎨 UI Components Created

- `PageEditor` - Main editor interface
- `PageTree` - Hierarchical page list
- `VideoBlockComponent` - Video editing/display
- `DocumentBlockComponent` - Document management
- `EmbedBlockComponent` - Embed code editor
- **`ContentBlockComponent`** - Content blocks (images & titles) **✨ NEW**
- `BlockToolbar` - 4 action buttons (Video, Document, Embed, **Content**)
- `EditorLayout` - Google Sites-like layout **✨ NEW**
- `PublicPageRenderer` - Student view

---

## 📦 New Dependencies

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.1",
  "dompurify": "^3.0.6",
  "react-hot-toast": "^2.4.1",
  "zod": "^3.22.4"
}
```

---

## ✅ Verification Checklist

- [ ] `npm install` completed
- [ ] `npm run prisma:migrate` successful  
- [ ] Development server started (`npm run dev`)
- [ ] Can access `/teacher/editor`
- [ ] Can create new page
- [ ] Can add video block
- [ ] Can add document block
- [ ] Can add embed block
- [ ] Can view public page at `/{slug}`
- [ ] Drag & drop in page tree works

---

## 🚀 Next Steps

1. Integrate with real authentication system
2. Add file upload handling (Cloudinary/S3)
3. Implement rich text editor for TEXT blocks
4. Add block ordering (drag within page)
5. Add student analytics
6. Add comments/feedback feature

---

**Version**: 1.0  
**Last Updated**: February 15, 2026  
**Author**: AI Assistant
