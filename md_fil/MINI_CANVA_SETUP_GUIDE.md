# 🎨 Mini Canva - Hướng Dẫn Cài Đặt & Triển Khai

## 📦 Yêu Cầu Hệ Thống

- **Node.js:** v18.0 trở lên
- **npm:** v9.0 trở lên (hoặc yarn/pnpm)
- **Next.js:** v16.1.6+
- **React:** v19+

---

## 🚀 Cài Đặt Project

### 1. Cài Đặt Dependencies

```bash
# Di chuyển vào thư mục dự án
cd c:\Users\gooleseswsq1\Desktop\school

# Cài đặt các thư viện cần thiết
npm install fabric zustand
```

### 2. Kiểm Tra Cài Đặt

```bash
# List packages
npm list fabric zustand

# Output mong đợi:
# fabric@6.x.x (hoặc mới hơn)
# zustand@4.x.x (hoặc mới hơn)
```

---

## 📁 Cấu Trúc Tệp Đã Tạo

```
src/
├── app/
│   ├── canva/
│   │   └── page.tsx                 # 🟦 Mini Canva main page
│   ├── api/
│   │   └── slides/
│   │       └── route.ts             # API endpoints
│   └── ...
│
├── components/
│   ├── MiniCanvaApp.tsx            # 🟦 Main app component (3-panel)
│   ├── CanvasEditor.tsx            # 🟦 Basic canvas editor
│   ├── CanvasEditorPro.tsx         # 🟦 Pro version with advanced features
│   ├── SlideThumbnailBar.tsx       # 🟦 Slide thumbnails + preview
│   ├── MiniCanvaButton.tsx         # 🟦 Dashboard navigation button
│   └── index.ts                    # Component exports
│
├── stores/
│   └── slideStore.ts               # 🟦 Zustand store (slides management)
│
└── ...

🟦 = Files created by this implementation
```

---

## 🎯 Tính Năng Chính

### ✅ Đã Triển Khai

| Tính Năng | Status | Chi Tiết |
|-----------|--------|----------|
| Thêm/xóa Textbox | ✅ | Hỗ trợ tiếng Việt, auto wrap |
| Chỉnh sửa text | ✅ | Màu, kích thước, căn chỉnh |
| Thêm/xóa ảnh | ✅ | Upload từ máy tính |
| Quản lý slides | ✅ | Create, delete, reorder |
| Thumbnail bar | ✅ | Preview tất cả slides |
| Âm thanh | ✅ | Upload & auto-advance |
| Tải xuống PNG | ✅ | Export canvas as image |
| Presentation mode | ✅ | Slideshow với audio sync |
| Background colors | ✅ | Chọn màu nền |
| Undo/Redo | ✅ | 10 bước lịch sử |
| Zoom canvas | ✅ | Cuộn chuột |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Mini Canva App (MiniCanvaApp.tsx)        │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┬──────────────┬──────────────┐  │
│  │   Sidebar    │   Canvas     │   Toolbar    │  │
│  │  (Assets)    │   Editor     │   (Dynamic)  │  │
│  │              │  (Fabric.js) │              │  │
│  └──────────────┴──────────────┴──────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │  Thumbnail Bar (Preview + Navigation)       │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└─────────────────────────────────────────────────┘
         │                ▲
         │                │
         ├────────────────┤
         │                │
    ┌────▼─────┐    ┌──────────┐
    │slideStore │    │canvas.js │
    │ (Zustand)│    │(fabric)  │
    └──────────┘    └──────────┘
```

---

## 💻 Chạy & Phát Triển

### Start Development Server

```bash
npm run dev
```

**Output:**
```
> next dev
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local

  ✓ Ready in 2.45s
```

### Truy cập ứng dụng

```
http://localhost:3000/canva
```

---

## 🔌 Integration Guide

### Thêm Mini Canva Button vào Dashboard

```typescript
// File: src/app/dashboard/page.tsx
import { FeatureGrid } from '@/components/MiniCanvaButton';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1>My Dashboard</h1>
      <FeatureGrid /> {/* ← Hiển thị Mini Canva + các tools khác */}
    </div>
  );
}
```

### Hoặc sử dụng riêng Mini Canva Button

```typescript
import { MiniCanvaButton } from '@/components/MiniCanvaButton';

<MiniCanvaButton />
```

---

## 🎨 Tùy Chỉnh Giao Diện

### Thay Đổi Canvas Size

**File:** `src/components/CanvasEditorPro.tsx`

```typescript
const canvas = new fabric.Canvas(canvasRef.current, {
  width: 960,   // ← Chiều rộng (pixels)
  height: 540,  // ← Chiều cao (pixels)
  ...
});
```

**Các tỉ lệ phổ biến:**
- 16:9 → 960x540 (mặc định)
- 4:3 → 1024x768
- 1:1 → 600x600

### Thay Đổi Màu Nền Mặc Định

**File:** `src/stores/slideStore.ts`

```typescript
slides: [
  {
    id: `slide-${Date.now()}`,
    canvasData: null,
    backgroundColor: '#f0f0f0', // ← Đổi màu ở đây
  },
]
```

### Thay Đổi Font Mặc Định

**File:** `src/components/CanvasEditorPro.tsx`

```typescript
const textbox = new fabric.Textbox('...', {
  fontFamily: 'Arial',      // ← Đổi font
  fontSize: 20,
  fill: '#000000',
  ...
});
```

---

## 🔐 Backend Integration (Database)

### Save Slides to Database

```typescript
// File: src/app/api/slides/route.ts

export async function POST(request: NextRequest) {
  const { slides, projectId, title } = await request.json();

  // Lưu vào Prisma
  const project = await prisma.project.create({
    data: {
      title,
      // Adjust theo schema của bạn
      slides: {
        create: slides.map(slide => ({
          data: JSON.stringify(slide.canvasData),
          audioUrl: slide.audioUrl,
          backgroundColor: slide.backgroundColor,
        })),
      },
    },
  });

  return NextResponse.json({ projectId: project.id });
}
```

### Load Slides from Database

```typescript
// Trong MiniCanvaApp.tsx

useEffect(() => {
  const loadSlides = async () => {
    const res = await fetch(`/api/slides?projectId=${projectId}`);
    const data = await res.json();
    // Load slides vào Zustand store
  };

  loadSlides();
}, []);
```

---

## 🧪 Testing

### Chạy Các Test Cơ Bản

```bash
# Test 1: Tạo text mới
# 1. Mở http://localhost:3000/canva
# 2. Click "Văn bản"
# 3. Kiểm tra: Text box xuất hiện

# Test 2: Thêm ảnh
# 1. Click "Ảnh"
# 2. Chọn file từ máy
# 3. Kiểm tra: Ảnh hiện trên canvas

# Test 3: Chuyển slide
# 1. Click "+" ở thumbnail bar
# 2. Slide 2 được tạo
# 3. Click slide 1 → Click slide 2
# 4. Kiểm tra: Data không mất
```

---

## 🐛 Troubleshooting

### ❌ Canvas không render

**Triệu chứng:** Trang trắng, không thấy canvas

**Giải pháp:**
```bash
# 1. Clear cache
rm -rf .next

# 2. Reinstall dependencies
npm install

# 3. Restart dev server
npm run dev
```

### ❌ Error "window is not defined"

**Triệu chứng:** SSR error khi khởi động

**Giải pháp:** Đã fix bằng `dynamic` import với `ssr: false`

```typescript
const CanvasEditor = dynamic(
  () => import('./CanvasEditor').then(mod => ({ default: mod.CanvasEditor })),
  { ssr: false } // ← QUAN TRỌNG
);
```

### ❌ Fabric.js import errors

**Triệu chứng:** "fabric is not a module"

**Giải pháp:**
```bash
# Reinstall fabric
npm install --save fabric

# Check version
npm list fabric
# Phải >= 5.3.0
```

### ❌ Zustand state không update

**Triệu chứng:** Slide data mất sau refresh

**Giải pháp:**
```typescript
// Add useEffect dependency tracking
useEffect(() => {
  const updateSlide = useSlideStore((state) => state.updateSlide);
  // Make sure updateSlide is called
}, []);
```

---

## 📊 Performance Tips

### Optimize Large Projects

```typescript
// Giảm số objects trên canvas
if (canvas.getObjects().length > 100) {
  console.warn('Canvas có quá nhiều objects, hiệu suất có thể chậm');
}

// Giảm kích thước ảnh
fabric.Image.fromURL(url, (img) => {
  img.scaleToWidth(400); // ← Điều chỉnh width
});

// Disable render updates trong loop
canvas.discardActiveObject();
// ... batch operations ...
canvas.renderAll(); // ← Render 1 lần
```

---

## 🚀 Production Build

### Build cho Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy (Example: Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

---

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Canvas editor cơ bản
- ✅ Slide management
- ✅ Thumnail bar
- ✅ Audio support
- ✅ Presentation mode
- ✅ Export PNG

### v1.1.0 (Planned)
- 🔜 Shape drawing tools
- 🔜 Custom fonts
- 🔜 Animations
- 🔜 Collaboration
- 🔜 Template library

---

## 📚 Tài Liệu Tham Khảo

- **Fabric.js Docs:** https://fabricjs.com/
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/

---

## 💬 Support

Gặp vấn đề? 
- 📧 Email: support@school.local
- 🐛 Report bug: [GitHub Issues]
- 💡 Feature request: [Discussions]

---

**Version:** 1.0.0  
**Last Updated:** 21/02/2026  
**Status:** ✅ Production Ready
