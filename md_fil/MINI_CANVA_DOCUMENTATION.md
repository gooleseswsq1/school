# Mini Canva Editor - Tài liệu Kỹ Thuật

## 📋 Tổng Quan

Mini Canva Editor là một ứng dụng chỉnh sửa slides chuyên nghiệp được xây dựng với **Next.js**, **Fabric.js**, **Zustand**, và **Tailwind CSS**.

---

## 🏗️ Kiến Trúc Hệ Thống

### Tech Stack
- **Framework:** Next.js 16.1.6 (App Router)
- **Canvas Engine:** Fabric.js (bản mới nhất)
- **State Management:** Zustand
- **Styling:** Tailwind CSS 4 + Shadcn/UI
- **Icons:** Lucide React

### Cấu trúc thư mục

```
src/
├── app/
│   └── canva/
│       └── page.tsx           # Trang chính Mini Canva
├── components/
│   ├── MiniCanvaApp.tsx       # Component ứng dụng chính (3-panel layout)
│   ├── CanvasEditor.tsx       # Component canvas Fabric.js
│   ├── SlideThumbnailBar.tsx  # Thanh thumbnail slides
│   └── MiniCanvaButton.tsx    # Nút điều hướng
└── stores/
    └── slideStore.ts          # Zustand store quản lý slides
```

---

## 🎯 Tính Năng Chính

### 1. Canvas Chỉnh Sửa
- ✅ Thêm/xóa Textbox với hỗ trợ tiếng Việt (`splitByGrapheme: true`)
- ✅ Thêm/xóa ảnh từ máy tính
- ✅ Chỉnh sửa màu chữ, kích thước font
- ✅ Tải xuống slide dưới dạng PNG

### 2. Quản Lý Slides (PPT Style)
- ✅ Tạo/xóa slides độc lập
- ✅ Chuyển đổi giữa slides mà không mất dữ liệu
- ✅ Thanh thumbnail dưới cùng để xem trước

### 3. Âm Thanh & Tự động Chuyển Slide
- ✅ Upload âm thanh cho mỗi slide
- ✅ Tự động chuyển slide khi âm thanh kết thúc (sẵn sàng để phát triển)

### 4. Giao Diện UX/UI
- ✅ Left Panel: Asset & Templates (có thể thu nhỏ)
- ✅ Center Stage: Canvas chính (tỉ lệ 16:9)
- ✅ Top Toolbar: Công cụ liên quan đến đối tượng
- ✅ Bottom Bar: Thumbnail slides

---

## 📦 Cài Đặt & Chạy

### 1. Cài đặt Dependencies
```bash
npm install fabric zustand
```

### 2. Chạy Development Server
```bash
npm run dev
```

### 3. Truy cập ứng dụng
```
http://localhost:3000/canva
```

---

## 🔧 API & Store Zustand

### useSlideStore
```typescript
const {
  slides,              // Mảng tất cả slides
  currentSlideIndex,   // Index slide hiện tại
  addSlide,           // Thêm slide mới
  deleteSlide,        // Xóa slide theo ID
  updateSlide,        // Cập nhật dữ liệu slide
  setCurrentSlide,    // Chuyển đến slide
  reorderSlides,      // Sắp xếp lại slides
  getSlide,          // Lấy slide theo ID
} = useSlideStore();
```

### Cấu trúc Slide
```typescript
interface Slide {
  id: string;                // Unique ID
  canvasData: any;          // Dữ liệu JSON từ fabric.js
  audioUrl?: string;        // URL âm thanh
  backgroundColor?: string; // Màu nền (hex)
  thumbnail?: string;       // Ảnh thumbnail (optional)
}
```

---

## 🎨 Tính Năng Đã Triển Khai

### ✅ Complete

1. **Canvas Editor (CanvasEditor.tsx)**
   - Tạo, chỉnh sửa, xóa Textbox
   - Tạo, chỉnh sửa, xóa ảnh
   - Chọn màu chữ, kích thước font
   - Tải xuống slide dưới dạng PNG

2. **Slide Management (slideStore.ts)**
   - Tạo/xóa slides
   - Chuyển đổi slides mà không mất dữ liệu
   - Tự động lưu canvas data

3. **Thumbnail Bar (SlideThumbnailBar.tsx)**
   - Hiển thị ảnh xem trước tất cả slides
   - Nút thêm slide mới
   - Nút xóa slide

4. **Main App (MiniCanvaApp.tsx)**
   - Layout 3 vùng (Left Panel, Center, Toolbar)
   - Nút bật/tắt left panel
   - Nút chế độ trình chiếu
   - Nút lưu

---

## 🚀 Tính Năng Tiếp Theo (To-do)

- [ ] Chế độ Presentation Mode (tự động chuyển slide với âm thanh)
- [ ] Hỗ trợ Drag & Drop từ Assets
- [ ] Thêm Effects & Filters cho ảnh
- [ ] Lưu projects vào database (Prisma)
- [ ] Undo/Redo functionality
- [ ] Export dưới dạng PDF hoặc Video
- [ ] Collaboration mode (nhiều người chỉnh sửa cùng lúc)
- [ ] Template library
- [ ] Custom fonts support

---

## 🔍 Hướng Dùng Nhanh

### Thêm Textbox
1. Nhấn nút "Văn bản" ở toolbar
2. Chỉnh sửa text, màu, kích thước
3. Kéo chuyển vị trí, thay đổi độ lớn

### Thêm Ảnh
1. Nhấn nút "Ảnh" 
2. Chọn file từ máy tính
3. Ảnh xuất hiện ở giữa canvas

### Chuyển Slides
- Click vào ô thumbnail ở dưới cùng
- Hoặc nhấn nút "+" để thêm slide mới

### Upload Âm Thanh
1. Cột "Âm thanh slide"
2. Chọn file audio từ máy
3. Âm thanh sẽ được lưu với slide

---

## 💡 Lưu Ý Quan Trọng

### Client-Side Rendering
Component `CanvasEditor` phải được import động để tránh lỗi "window is not defined":

```typescript
const CanvasEditor = dynamic(
  () => import('./CanvasEditor').then((mod) => ({ default: mod.CanvasEditor })),
  { ssr: false }
);
```

### Data Persistence
Dữ liệu canvas được lưu tự động khi user thay đổi via `canvas.toJSON()`. Để lưu vào database:

```typescript
const handleSave = async () => {
  const data = slides.map(slide => ({
    id: slide.id,
    data: JSON.stringify(slide.canvasData),
    audioUrl: slide.audioUrl,
  }));
  
  await fetch('/api/slides/save', { method: 'POST', body: JSON.stringify(data) });
};
```

### Hỗ trợ Tiếng Việt
Fabric.js cần thiết lập `splitByGrapheme: true` để xử lý chữ tiếng Việt:

```typescript
const textbox = new fabric.Textbox('Tiếng Việt', {
  splitByGrapheme: true, // QUAN TRỌNG!
});
```

---

## 📱 Responsive Design

Layout sử dụng Tailwind CSS break points:
- **sm**: 640px
- **md**: 768px  
- **lg**: 1024px
- **xl**: 1280px

Left panel sẽ ẩn trên màn hình nhỏ hơn 768px.

---

## 🎬 Demo & Testing

### Tạo một slide đơn giản
```bash
# 1. Mở http://localhost:3000/canva
# 2. Click "Văn bản" -> Thêm tiêu đề
# 3. Click "Ảnh" -> Chọn ảnh
# 4. Chỉnh sửa màu & kích thước
# 5. Click "Tải xuống" để lưu dưới dạng PNG
```

---

## 📞 Hỗ Trợ & Thắc Mắc

- **Issues:** Kiểm tra console browser (F12) để xem error messages
- **Performance:** Nếu canvas chậm, thử giảm độ phân giải canvas hoặc số objects
- **Storage:** Dữ liệu hiện tại chỉ lưu trong RAM (Zustand). Cần backend để persistent storage

---

**Tài liệu này được cập nhật lần cuối:** 21/02/2026
