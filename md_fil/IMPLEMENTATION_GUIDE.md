# Hướng dẫn triển khai - Hệ thống quản lý trang bài giảng động

## 📋 Danh sách các tập tin đã tạo

### 📁 API Routes
```
src/app/api/
├── pages/                          # API cho quản lý pages
│   ├── route.ts                   # GET/POST pages
│   └── [id]/
│       └── route.ts               # GET/PUT/DELETE page
├── blocks/                         # API cho quản lý blocks
│   ├── route.ts                   # POST blocks
│   └── [id]/
│       ├── route.ts               # GET/PUT/DELETE block
│       └── documents/
│           └── route.ts           # POST/DELETE documents
└── public/
    └── pages/
        └── [slug]/
            └── route.ts           # GET public pages
```

### 📁 Components
```
src/components/editor/
├── PageEditor.tsx                 # Main editor component
├── PageTree.tsx                   # Page tree with drag & drop
├── BlockToolbar.tsx               # 3 main buttons (Video, Document, Embed)
├── VideoBlockComponent.tsx        # Video block (YouTube, Vimeo, Upload)
├── DocumentBlockComponent.tsx     # Document block
├── EmbedBlockComponent.tsx        # Embed block (Wordwall, Quizizz, etc)
└── PublicPageRenderer.tsx         # Public page viewer for students
```

### 📁 Hooks
```
src/hooks/
└── useDragDrop.ts                # Drag & Drop hooks
```

### 📁 Utils
```
src/lib/
└── video-utils.ts                # Video URL parsing utilities
```

### 📁 Pages
```
src/app/
├── teacher/
│   └── editor/
│       └── page.tsx              # Teacher page editor
└── [slug]/
    └── page.tsx                  # Public page for students
```

### 📁 Database
```
prisma/
├── schema.prisma                 # Updated with Page system
└── migrations/
    └── 20260215_add_page_system/
        └── migration.sql         # New migration
```

### 📁 Documentation
```
├── SYSTEM_DOCUMENTATION.md       # Complete system documentation
└── IMPLEMENTATION_GUIDE.md       # This file
```

## 🚀 Steps to Implement

### Step 1: Cài đặt Dependencies
```bash
npm install
```

Các packages được thêm:
- `@dnd-kit/core` - Drag & Drop
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - DND utilities
- `dompurify` - HTML sanitization
- `react-hot-toast` - Notifications
- `zod` - Validation

### Step 2: Cập nhật Database Schema
```bash
npm run prisma:migrate
```

Hoặc nếu sử dụng SQLite (reset database):
```bash
npm run prisma:reset
```

Các table mới được tạo:
- `Page` - Trang bài giảng (với tree structure)
- `PageBlock` - Khối nội dung (VIDEO, DOCUMENT, EMBED, TEXT)
- `PageDocument` - Tài liệu trong block

### Step 3: Khởi động Development Server
```bash
npm run dev
```

Truy cập `http://localhost:3000/teacher/editor`

## 📱 URL Routes

### Giáo viên
- **Editor**: `/teacher/editor`
- Xem chi tiết page: `/teacher/editor?pageId={id}`

### Học sinh / Công khai
- **Xem page**: `/{page-slug}`
- **Xem trang con**: `/{parent-slug}/{child-slug}` (cần phải implement dynamic routing chi tiết hơn)

### APIs
- **GET** `/api/pages?authorId={userId}` - Lấy tất cả pages
- **POST** `/api/pages` - Tạo page mới
- **GET** `/api/pages/{id}` - Lấy page chi tiết
- **PUT** `/api/pages/{id}` - Cập nhật page
- **DELETE** `/api/pages/{id}` - Xóa page
- **POST** `/api/blocks` - Tạo block
- **GET** `/api/blocks/{id}`
- **PUT** `/api/blocks/{id}` - Cập nhật block
- **DELETE** `/api/blocks/{id}` - Xóa block
- **POST** `/api/blocks/{id}/documents` - Thêm tài liệu
- **GET** `/api/public/pages/{slug}` - Lấy public page

## 🎨 Giao diện (UI/UX)

### PageEditor Layout:
```
┌─────────────────────────────────────────┐
│         Sidebar (PageTree)              │ Main Content Area
├─────────────────────────────────────────┤
│ • Trang mới                             │ ┌──────────────┐
│   - Trang A (parent)                    │ │ Title        │
│   - Trang A.1 (child)                   │ │ Description  │ [Save]
│   - Trang B                             │ └──────────────┘
│                                          │
│ Sortable:                               │ ┌──────────────┐
│ Drag & Drop trong cây                   │ │ Block 1      │
│                                          │ │ (Video)      │
│                                          │ └──────────────┘
│                                          │
│                                          │ ┌──────────────┐
│                                          │ │ Block 2      │
│                                          │ │ (Document)   │
│                                          │ └──────────────┘
│                                          │
│                                          │ ┌──────────────┐
│                                          │ │ Block 3      │
│                                          │ │ (Embed)      │
│                                          │ └──────────────┘
├─────────────────────────────────────────┤
│ [Thêm Video] [Tài liệu] [Nhúng]         │
└─────────────────────────────────────────┘
```

## 🎬 Video Block Features

### Hỗ trợ các URL:
- YouTube: `https://youtube.com/watch?v=xxx` hoặc `youtu.be/xxx`
- Vimeo: `https://vimeo.com/xxx`
- Direct: `https://example.com/video.mp4`

### Parse & Generate:
```typescript
// Input: "https://youtube.com/watch?v=dQw4w9WgXcQ"
// Output: {
//   videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
//   videoType: "youtube"
// }
```

## 📄 Document Block Features

### Hỗ trợ các loại:
- PDF
- Word (doc, docx)
- PowerPoint (ppt, pptx)
- Excel (xls, xlsx)
- Khác

### Tính năng:
- Thêm/xóa tài liệu
- Hiển thị biểu tượng theo loại
- Download button
- Kích thước tệp

## 🔗 Embed Block Features

### Hỗ trợ:
- Wordwall
- Quizizz
- Kahoot
- Bất kỳ iframe an toàn

### Bảo mật:
- DOMPurify sanitization
- Chỉ cho phép: iframe, src, width, height, frameborder, scrolling, allow, allowfullscreen
- Ngăn XSS attacks

## 🔄 Data Flow

### Tạo Page:
```
User → Button "Trang mới" 
→ Prompt "Tên trang?" 
→ Prompt "Slug?" 
→ POST /api/pages 
→ Response: Page object 
→ Update UI
```

### Thêm Block:
```
User → Click "Thêm Video" 
→ POST /api/blocks (type: VIDEO, pageId: xxx) 
→ Response: Block object 
→ Refresh page data 
→ Block appears in editor
```

### Cập nhật Block:
```
User → Click Edit on block 
→ Form inputs 
→ PUT /api/blocks/{id} 
→ Sanitize embed code (if needed) 
→ Response: Updated block 
→ Update UI
```

### View Public Page (Student):
```
Student → Visit /my-page-slug 
→ GET /api/public/pages/my-page-slug 
→ Response: Page with blocks 
→ Render PublicPageRenderer 
→ Display video, documents, embeds
```

## 🛡️ Security Considerations

1. **Authentication**: Middleware để xác minh giáo viên
2. **Authorization**: Chỉ tác giả mới có thể chỉnh sửa page
3. **Input Validation**: Zod schemas cho tất cả inputs
4. **Code Sanitization**: DOMPurify cho embed code
5. **CORS**: API endpoints kiểm tra origin
6. **Rate Limiting**: Thêm rate limiting cho upload

## 🐛 Troubleshooting

### Database Error
```bash
npm run prisma:reset  # Reset database completely
npm run prisma:migrate  # Apply migrations
```

### Module Not Found
```bash
npm install  # Reinstall dependencies
```

### Video không hiển thị
- Kiểm tra URL hợp lệ
- Kiểm tra CORS settings
- Đảm bảo iframe attributes

## ✅ Checklist Triển khai

- [ ] Chạy `npm install`
- [ ] Chạy `npm run prisma:migrate`
- [ ] Nhập authentication middleware (nếu chưa có)
- [ ] Test PageEditor tại `/teacher/editor`
- [ ] Test video upload/YouTube
- [ ] Test document upload
- [ ] Test embed code (Wordwall, etc)
- [ ] Test public page view
- [ ] Test drag & drop
- [ ] Cập nhật navigation trong Header

## 📚 Các tệp package.json đã cập nhật

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.1",
    "dompurify": "^3.0.6",
    "react-hot-toast": "^2.4.1",
    "zod": "^3.22.4"
  }
}
```

## 🎯 Next Steps (Tương lai)

1. **Rich Text Editor**: Thêm editor cho text blocks
2. **Drag & Drop Blocks**: Sắp xếp lại blocks
3. **Student Analytics**: Thống kê truy cập
4. **Comments**: Thêm comment từ học sinh
5. **Export to PDF**: Xuất page thành PDF
6. **Scheduled Publish**: Lên lịch xuất bản
7. **Media Library**: Quản lý media tập trung
8. **Templates**: Mẫu trang sẵn có

---

**Version**: 1.0  
**Last Updated**: February 15, 2026
