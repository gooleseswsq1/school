# Hướng Dẫn: Phần Editor Giống Google Sites

## Overview (Tổng Quan)

Hệ thống đã được cập nhật với các tính năng mới giống Google Sites:

### ✨ Các Tính Năng Chính:

1. **Content Block (Nội dung - Ảnh & Tiêu đề)**
   - Thêm ảnh và tiêu đề cho nội dung
   - Hiển thị dạng grid 3 cột (3x3 = 9 items/trang)
   - Tự động phân trang khi vượt quá 9 items
   - Tạo shortcut/link cho từng item

2. **Block Toolbar (Thanh công cụ 4 nút)**
   - Video (Video)
   - Tài liệu (Document)
   - Nhúng (Embed)
   - **Nội dung (Content)** - MỚI ✨

3. **Grid Display (Hiển thị dạng lưới)**
   - 3 cột × 3 hàng = 9 items mỗi trang
   - Pagination tự động phân trang
   - Hover effects để xem actions

4. **Shortcut System (Hệ thống tắt)**
   - Tạo mã shortcut cho ảnh/nội dung
   - Copy shortcut code
   - Dùng để tạo đối tắt nhanh

## Cách Sử Dụng

### 1. Thêm Content Block

```
1. Vào trang editor
2. Bấm nút "Nội dung" ở dưới cùng bên trái
3. Một content block mới sẽ được tạo
```

### 2. Thêm Items Vào Content Block

```
1. Trong content block, bấm nút "+ Thêm"
2. Form sẽ mở ra:
   - Nhập tiêu đề
   - Chọn ảnh
3. Bấm "Thêm Nội dung"
```

### 3. Xem Grid & Pagination

```
- Grid hiển thị 3 cột
- Mỗi trang có tối đa 9 items
- Sử dụng nút "Trước" / "Sau" để chuyển trang
- Trang hiện tại se highlight màu xanh
```

### 4. Tạo Shortcut

```
1. Hover vào item trong grid
2. Bấm nút "Tắt" (link icon)
3. Mã shortcut sẽ hiện lên dưới ảnh
4. Bấm copy icon để sao chép mã
5. Sử dụng mã để tạo shortcut
```

### 5. Quản lý Items

```
- Để xóa item: Hover và bấm nút "Xóa"
- Để edit: Hiện tại phải xóa và thêm lại (upgrade sau)
```

## Cấu Trúc Dữ Liệu

### ContentItem Model

```typescript
{
  id: string;           // ID duy nhất của item
  title: string;        // Tiêu đề
  image?: string;       // Base64 hoặc URL ảnh
  shortcutCode?: string; // Mã shortcut (VD: ITEM1234)
  shortcutUrl?: string;  // URL shortcut
  order: number;        // Thứ tự hiển thị
}
```

### Pagination Logic

```
- Items per page: 9
- Grid: 3 columns × 3 rows
- Tính toán: Math.ceil(totalItems / 9)
- Hiển thị từ index: (page - 1) * 9 đến page * 9
```

## API Endpoints

### 1. Tạo Content Block

```bash
POST /api/blocks
{
  "pageId": "page-123",
  "type": "CONTENT"
}
```

Response:
```json
{
  "id": "block-123",
  "type": "CONTENT",
  "pageId": "page-123",
  "contentItems": [],
  "createdAt": "2026-02-15T..."
}
```

### 2. Cập nhật Content Items

```bash
PUT /api/blocks/block-123
{
  "items": [
    {
      "id": "item-1",
      "title": "Item 1",
      "image": "data:image/png;base64...",
      "shortcutCode": "ITEM0001"
    },
    {
      "id": "item-2",
      "title": "Item 2",
      "image": "data:image/png;base64...",
      "shortcutCode": "ITEM0002"
    }
  ]
}
```

Response: Updated block với contentItems

### 3. Lấy Block với Items

```bash
GET /api/blocks/block-123
```

Response:
```json
{
  "id": "block-123",
  "type": "CONTENT",
  "contentItems": [
    {
      "id": "item-1",
      "title": "Item 1",
      "image": "data:image/png;base64...",
      "shortcutCode": "ITEM0001",
      "order": 0
    }
  ]
}
```

## Database Schema

### BlockType Enum
```prisma
enum BlockType {
  VIDEO
  DOCUMENT
  EMBED
  TEXT
  CONTENT    // ← MỚI
}
```

### ContentItem Model
```prisma
model ContentItem {
  id            String     @id @default(cuid())
  block         PageBlock  @relation("BlockContentItems", ...)
  blockId       String
  title         String
  image         String?    // Base64 hoặc URL
  shortcutCode  String?    // Generated code
  shortcutUrl   String?    // Generated URL
  order         Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  @@index([blockId])
  @@index([shortcutCode])
}
```

### PageBlock Update
```prisma
model PageBlock {
  // ... existing fields ...
  contentItems ContentItem[] @relation("BlockContentItems")
}
```

## Component Structure

### ContentBlockComponent
- Location: `src/components/editor/ContentBlockComponent.tsx`
- Props:
  - `id`: Block ID
  - `items`: Array of ContentItem
  - `onUpdate`: Callback để update items
  - `onDelete`: Callback để xóa block

### EditorLayout (Optional)
- Location: `src/components/editor/EditorLayout.tsx`
- Cung cấp layout giống Google Sites với:
  - Sidebar trái (page tree)
  - Main editor ở giữa
  - Right panel cho tools
  - Bottom toolbar cho block controls

## TypeScript Interfaces

```typescript
interface ContentItem {
  id: string;
  title: string;
  image?: string;
  shortcutUrl?: string;
  shortcutCode?: string;
}

interface PageBlock {
  id: string;
  type: "VIDEO" | "DOCUMENT" | "EMBED" | "TEXT" | "CONTENT";
  order: number;
  // ... other fields ...
  items?: ContentItem[];  // For CONTENT blocks
}
```

## Styling & Colors

- Primary: Blue (#2563eb)
- Secondary: Purple (#9333ea) - Shortcut buttons
- Danger: Red (#dc2626) - Delete buttons
- Border: Gray (#e5e7eb)
- Grid gaps: 1rem (16px)

## Features To Implement Later (Trong Tương Lai)

```
[] Edit item (edit title & image)
[] Drag & drop reorder items
[] Duplicate item
[] Bulk upload images
[] Custom grid columns (2x2, 4x4, etc.)
[] Image filters & effects
[] Rich text descriptions for items
[] Item categories/tags
[] Shortcut analytics
[] Preview shortcut before saving
```

## Testing

### Manual Testing Checklist
```
□ Create new CONTENT block
□ Add items with images
□ Verify grid displays 3 columns
□ Add 10+ items to test pagination
□ Navigate between pages
□ Create shortcut for item
□ Copy shortcut code
□ Delete item and verify count updates
□ Save page and reload - data persists
```

## Troubleshooting

### Items not saving?
1. Kiểm tra console xem có error không
2. Đảm bảo image là Base64 format
3. Verify block ID là đúng

### Pagination not working?
1. Kiểm tra total items vs itemsPerPage
2. Verify current page state

### Shortcut code không hiện?
1. Kiểm tra item có id không
2. Verify generateShortcutCode() function

### Grid không hiển thị đúng?
1. Kiểm tra grid-cols-3 CSS class
2. Verify items không bị overflow

## Migration Notes

### Nếu upgrade từ phiên bản cũ:
```bash
# 1. Chạy migration
npx prisma migrate deploy

# 2. Database sẽ thêm ContentItem table

# 3. Existing blocks không affected (chỉ thêm contentItems field)
```

## Performance Tips

1. **Base64 Images**: Limit kích thước (< 2MB)
2. **Pagination**: Automatically caps items ở 9/page
3. **Re-renders**: Component uses proper React hooks
4. **Database**: ContentItem indexes on blockId & shortcutCode

## Support & Contact

Nếu có vấn đề hoặc câu hỏi, vui lòng liên hệ team development.

---

**Last Updated**: February 15, 2026  
**Version**: 1.0.0
