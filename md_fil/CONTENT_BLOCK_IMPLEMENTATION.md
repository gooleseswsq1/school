# 📱 Hệ Thống Editor Mới - Google Sites Style

## 🎯 Những Gì Đã Được Tạo

### 1️⃣ **ContentBlockComponent** (Nội dung - Ảnh & Tiêu đề)
- **Tệp**: `src/components/editor/ContentBlockComponent.tsx`
- **Tính năng**:
  - ✅ Thêm ảnh + tiêu đề
  - ✅ Grid 3 cột (3x3 = 9 items/trang)
  - ✅ Phân trang tự động
  - ✅ Tạo shortcut/mã tắt
  - ✅ Copy shortcut code

### 2️⃣ **BlockToolbar Update** (Thanh công cụ)
- **Tệp**: `src/components/editor/BlockToolbar.tsx`
- **Cập nhật**:
  - ✅ Thêm nút "Nội dung" (màu tím) cạnh 3 nút cũ
  - ✅ Hỗ trợ type "CONTENT"

### 3️⃣ **PageEditor Update** (Trình chỉnh sửa chính)
- **Tệp**: `src/components/editor/PageEditor.tsx`
- **Cập nhật**:
  - ✅ Hỗ trợ render ContentBlockComponent
  - ✅ Thêm interface ContentItem
  - ✅ Xử lý CONTENT block type

### 4️⃣ **API Routes Updates** (API endpoints)
Cập nhật:
- `src/app/api/blocks/route.ts` (POST - tạo block)
- `src/app/api/blocks/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/pages/route.ts` (GET, POST)
- `src/app/api/pages/[id]/route.ts` (GET, PUT, DELETE)

**Thay đổi**:
- ✅ Thêm "CONTENT" vào BlockType enum
- ✅ Include contentItems khi fetch data
- ✅ Xử lý items array trong PUT request

### 5️⃣ **Database Schema** (Cơ sở dữ liệu)
- **Tệp**: `prisma/schema.prisma`
- **Migrations**: `prisma/migrations/20260215135811_add_content_block`

**Mô hình mới**:
```
BlockType enum: + CONTENT

ContentItem model:
- id (string, pk)
- blockId (foreign key)
- title (string)
- image (string, base64/url)
- shortcutCode (string, optional)
- shortcutUrl (string, optional)
- order (int)
- createdAt, updatedAt (timestamp)

PageBlock: + contentItems relation
```

### 6️⃣ **EditorLayout** (Optional - bố cục cải tiến)
- **Tệp**: `src/components/editor/EditorLayout.tsx`
- **Tính năng**:
  - ✅ Layout giống Google Sites
  - ✅ Sidebar trái (Page tree)
  - ✅ Main editor ở giữa
  - ✅ Right tools panel
  - ✅ Bottom toolbar

---

## 🚀 Cách Sử Dụng

### Bước 1: Tạo Content Block
```
1. Vào trang editor (/teacher/editor)
2. Chọn trang muốn chỉnh sửa
3. Bấm nút "Nội dung" ở thanh công cụ dưới
```

### Bước 2: Thêm Items
```
1. Bấm "+ Thêm" trong block
2. Nhập tiêu đề (required)
3. Chọn ảnh (required)
4. Bấm "Thêm Nội dung"
```

### Bước 3: Quản lý Items
```
Grid view 3 cột:
[ Item 1 ] [ Item 2 ] [ Item 3 ]
[ Item 4 ] [ Item 5 ] [ Item 6 ]
[ Item 7 ] [ Item 8 ] [ Item 9 ]

Pagination:
[Trước] [1] [2] [3]... [Sau]
```

### Bước 4: Tạo Shortcuts
```
1. Hover vào item
2. Bấm nút "Tắt" (link icon)
3. Mã shortcut hiện lên
4. Click copy icon
5. Sử dụng mã ở nơi khác
```

---

## 📊 Kiến Trúc & Luồng Dữ Liệu

```
┌─────────────────────────────────────────────────┐
│         PageEditor Component                     │
└─────────────────────────────────────────────────┘
                    │
                    ├─ Left: PageTree (chọn trang)
                    ├─ Main: Blocks Editor (render blocks)
                    │        └─ ContentBlockComponent (nội dung)
                    │           ├─ Grid 3 cột (9 items/trang)
                    │           ├─ Pagination
                    │           └─ Shortcut Manager
                    └─ Bottom: BlockToolbar
                       ├─ Video
                       ├─ Document  
                       ├─ Embed
                       └─ Content ← MỚI

Data Flow:
User adds item
    ↓
ContentBlockComponent state updates
    ↓
onUpdate(items) called
    ↓
PUT /api/blocks/{blockId} with items array
    ↓
Backend: Delete old items, create new items
    ↓
Return updated block with contentItems
    ↓
UI re-renders with new items
    ↓
Grid displays with pagination
```

---

## 🗄️ Database Schema

```sql
-- Before
BlockType:
  VIDEO | DOCUMENT | EMBED | TEXT

PageBlock:
  id, pageId, type, order, ...
  ├─ documents (relation)
  └─ embedPage (relation)

-- After (NEW)
BlockType:
  VIDEO | DOCUMENT | EMBED | TEXT | CONTENT

PageBlock:
  id, pageId, type, order, ...
  ├─ documents (relation)
  ├─ contentItems (relation) ← NEW
  └─ embedPage (relation)

ContentItem: ← NEW TABLE
  id (PK)
  blockId (FK)
  title
  image
  shortcutCode
  shortcutUrl
  order
  createdAt
  updatedAt
```

---

## 🎨 UI/UX Features

### ContentBlockComponent UI
```
┌─────────────────────────────────────────────┐
│ Nội dung (Ảnh & Tiêu đề)  [+ Thêm] [Xóa]   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │          │  │          │  │          │  │
│  │  Image   │  │  Image   │  │  Image   │  │
│  │          │  │          │  │          │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  │
│  │Title     │  │Title     │  │Title     │  │
│  │Link code │  │Link code │  │Link code │  │
│  │[Tắt][Xóa]  │[Tắt][Xóa]   │[Tắt][Xóa]  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  Pagination: [Trước][1][2][3][Sau]         │
│              9 mục                         │
└─────────────────────────────────────────────┘
```

### Color Scheme
- Buttons: Blue (#2563eb) - Primary actions
- Shortcut: Purple (#9333ea) - Secondary
- Danger: Red (#dc2626) - Delete
- Text: Gray (#4b5563) - Content
- Border: Light Gray (#e5e7eb)

---

## 🔧 API Endpoints

### 1. Create Content Block
```bash
POST /api/blocks
Content-Type: application/json

{
  "pageId": "page-id",
  "type": "CONTENT"
}

Response (201):
{
  "id": "block-id",
  "type": "CONTENT",
  "pageId": "page-id",
  "contentItems": [],
  "createdAt": "2026-02-15T..."
}
```

### 2. Update Content Items
```bash
PUT /api/blocks/block-id
Content-Type: application/json

{
  "items": [
    {
      "id": "item-1",
      "title": "First Item",
      "image": "data:image/png;base64,iVBORw0KG...",
      "shortcutCode": "ITEM0001"
    },
    {
      "id": "item-2", 
      "title": "Second Item",
      "image": "data:image/png;base64,iVBORw0KG...",
      "shortcutCode": "ITEM0002"
    }
  ]
}

Response (200):
{
  "id": "block-id",
  "type": "CONTENT",
  "contentItems": [
    { "id": "item-1", ... },
    { "id": "item-2", ... }
  ]
}
```

### 3. Get Block with Items
```bash
GET /api/blocks/block-id

Response:
{
  "id": "block-id",
  "type": "CONTENT",
  "contentItems": [...]
}
```

### 4. Delete Block
```bash
DELETE /api/blocks/block-id

Response (200):
{ "success": true }
```

---

## 📦 Files Modified/Created

### Created
- ✅ `src/components/editor/ContentBlockComponent.tsx`
- ✅ `src/components/editor/EditorLayout.tsx`
- ✅ `prisma/migrations/20260215135811_add_content_block/`
- ✅ `CONTENT_BLOCK_GUIDE.md`
- ✅ `CONTENT_BLOCK_IMPLEMENTATION.md` (this file)

### Modified
- ✅ `src/components/editor/BlockToolbar.tsx`
- ✅ `src/components/editor/PageEditor.tsx`
- ✅ `src/app/api/blocks/route.ts`
- ✅ `src/app/api/blocks/[id]/route.ts`
- ✅ `src/app/api/pages/route.ts`
- ✅ `src/app/api/pages/[id]/route.ts`
- ✅ `prisma/schema.prisma`

### Total Changes
- **New files**: 4
- **Modified files**: 7
- **Database migrations**: 1
- **Lines of code added**: ~800+

---

## ✨ Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Add images + titles | ✅ | Upload images and add titles |
| Grid display (3 cols) | ✅ | Display in 3-column grid |
| Pagination (9 items) | ✅ | Automatically pagination at 9 items |
| Shortcut system | ✅ | Generate shortcut codes |
| Copy shortcut | ✅ | Copy code to clipboard |
| Edit item | ⏳ | Coming soon |
| Drag & drop | ⏳ | Coming soon |
| Bulk upload | ⏳ | Coming soon |
| Custom grid sizes | ⏳ | Coming soon |

---

## 🧪 Testing

### Unit Testing
```bash
# Check if block creation works
POST /api/blocks with type: "CONTENT"

# Check if items update works  
PUT /api/blocks/{id} with items array

# Check if pagination calc is correct
Add 15 items -> should show 2 pages
```

### Integration Testing
```bash
1. Create page
2. Add CONTENT block
3. Add 12 items
4. Verify grid shows 9 items
5. Navigate to page 2 -> shows 3 items
6. Create shortcut for item
7. Copy shortcut code
8. Delete item
9. Verify count updates
10. Save page
11. Reload browser -> data persists
```

---

## 📝 Notes

- All images are stored as **Base64** in database
- Shortcut codes are **auto-generated** from item ID
- Pagination is **client-side** for performance
- All API responses include **contentItems** array
- Components are **fully typed** with TypeScript
- Database uses **SQLite** (dev) - ready for PostgreSQL

---

## 🚨 Known Issues & Limitations

1. **Image Size**: Large Base64 images can slow down page. Consider image compression.
2. **Edit Item**: Currently must delete and re-add (upgrade coming)
3. **Drag & Drop**: Not yet implemented (coming soon)
4. **Max Items**: No hard limit, but performance tested up to 100 items

---

## 🔄 Upgrade Path

### To Add Edit Feature:
```typescript
// 1. Create ContentItemEditor component
// 2. Add edit button in grid item
// 3. Show modal with title + image picker
// 4. Send PATCH request to update item
// 5. Re-fetch items and update UI
```

### To Add Drag & Drop:
```typescript
// 1. Import react-beautiful-dnd
// 2. Wrap grid in DragDropContext
// 3. Update order on drop
// 4. Send order update to API
```

---

## 📚 Related Documentation

- [CONTENT_BLOCK_GUIDE.md](./CONTENT_BLOCK_GUIDE.md) - Detailed usage guide
- [prisma/schema.prisma](./prisma/schema.prisma) - Database schema
- [src/components/editor/ContentBlockComponent.tsx](./src/components/editor/ContentBlockComponent.tsx) - Component code

---

**Last Updated**: February 15, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
