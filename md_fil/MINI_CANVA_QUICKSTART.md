# 🎨 Mini Canva - Hướng Dẫn Bắt Đầu Nhanh

## ✨ Giới Thiệu

**Mini Canva** là một trình chỉnh sửa slides chuyên nghiệp được tối ưu cho UX/UI, cho phép bạn:
- 📝 Thêm văn bản, ảnh, và các yếu tố khác
- 🎯 Quản lý nhiều slides như PowerPoint
- 🎵 Thêm âm thanh cho mỗi slide
- 📥 Tải xuống slides dưới dạng ảnh PNG

---

## 🚀 Truy Cập Ứng Dụng

```bash
# Mở trình duyệt và truy cập:
http://localhost:3000/canva
```

---

## 📋 Interface Chính

### Layout 3 Vùng

```
┌─────────────────────────────────────────────────┐
│           🎨 Mini Canva  │ Slide 1/1│  Trình Chiếu │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│ ASSETS & │         CANVAS CHÍNH                 │
│TEMPLATES │         (Vùng chỉnh sửa)            │
│ (Left    │                                       │
│ Panel)   │                                       │
│          │                                       │
├──────────┴───────────────────────────────────────┤
│  [Slide 1] [Slide 2] [+] ← Thumbnail Bar        │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Các Tính Năng Chính

### 1️⃣ **Thêm Văn Bản**
```
1. Click nút "Văn bản" ở toolbar trên
2. Một ô text xuất hiện ở giữa canvas
3. Nhấp đôi để chỉnh sửa nội dung
4. Thay đổi:
   - Màu chữ
   - Kích thước font (8px - 72px)
   - Căn chỉnh (trái, giữa, phải)
```

**Lưu ý:** Hỗ trợ 100% tiếng Việt với xuống hàng tự động! ✅

---

### 2️⃣ **Thêm Ảnh**
```
1. Click nút "Ảnh" ở toolbar
2. Chọn ảnh từ máy tính
3. Ảnh tự động thêm vào canvas
4. Kéo hoặc resize ảnh như bạn muốn
```

**Định dạng hỗ trợ:** JPG, PNG, GIF, WebP

---

### 3️⃣ **Quản Lý Slides**

#### Thêm Slide Mới
- Click nút `+` ở thanh thumbnail dưới cùng
- Mỗi slide là một bản vẽ **độc lập**

#### Chuyển Slide
- Click vào slide bạn muốn ở thanh thumbnail
- Dữ liệu slide cũ tự động lưu

#### Xóa Slide
- Hover vào thumbnail slide
- Click ❌ để xóa (phải có ≥ 2 slides)

---

### 4️⃣ **Thay Đổi Màu Nền**
```
1. Ở toolbar, click ícong Palette (🎨)
2. Chọn màu từ color picker
3. Nền slide thay đổi ngay lập tức
```

---

### 5️⃣ **Tải Xuống Slide**
```
1. Chúc chắc slide đã hoàn thiện
2. Click nút "Tải xuống" 
3. Ảnh PNG tự động được tải với tên:
   slide-[timestamp].png
```

---

### 6️⃣ **Âm Thanh Slide** 🎵
```
1. Scroll xuống dưới canvas
2. Mục "Âm thanh slide"
3. Click để chọn file MP3/WAV/OGG
4. Âm thanh được gắn với slide (sẵn sàng cho presentation mode)
```

---

## 💡 Mẹo Sử Dụng

### ⚡ Tính Năng Advanced

1. **Undo/Redo** 
   - Click nút `Undo` để hoàn tác thay đổi cuối
   - Lưu lịch sử 10 bước gần nhất

2. **Sao Chép Đối Tượng**
   - Chọn text/ảnh
   - Click nút `Sao chép`
   - Đối tượng được duplicate gần vị trí cũ

3. **Zoom Canvas**
   - Cuộn chuột để phóng to/thu nhỏ
   - Giúp chỉnh sửa chi tiết hơn

4. **Căn Chỉnh Text**
   - Sau khi click text, dùng nút Align (⬅️ 📍 ➡️)
   - 3 tùy chọn: Trái, Giữa, Phải

---

## 🎨 Màu Sắc Mặc Định

Khi thêm văn bản mới:
- **Màu chữ:** Đen (#000000)
- **Kích thước:** 20px
- **Font:** Arial

Bạn có thể thay đổi ngay sau khi thêm.

---

## 📱 Responsive Design

| Màn hình | Giao diện |
|----------|-----------|
| **< 768px** | Left panel ẩn, nhấn ☰ để bật |
| **≥ 768px** | Left panel hiển thị mặc định |
| **Canvas** | Luôn 960x540 (16:9 ratio) |

---

## ⚙️ Lưu Ý Kỹ Thuật

### Dữ Liệu Được Lưu?
- ✅ Canvas data (tất cả objects)
- ✅ Màu nền slide
- ✅ Âm thanh URL
- ❌ Để persistent storage, cần kết nối backend

### Hiệu Suất
- Smooth với **< 100 objects** trên canvas
- Nếu chậm, thử:
  - Giảm độ phân giải ảnh
  - Xóa objects không dùng

### Browser Support
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ❌ Internet Explorer (cổ lỗi)

---

## 🔧 Keyboard Shortcuts (Sắp tới)

| Phím | Hành động |
|------|-----------|
| `Ctrl+S` | Lưu |
| `Ctrl+Z` | Undo |
| `Delete` | Xóa |
| `Ctrl+D` | Duplicate |

---

## 🐛 Troubleshooting

### ❌ Canvas không hiển thị
```
→ Refresh trình duyệt (Ctrl+F5)
→ Kiểm tra console (F12) có lỗi không
```

### ❌ Text bị cắt
```
→ Kéo để mở rộng khung text
→ Hoặc giảm kích thước font
```

### ❌ Ảnh không thêm được
```
→ Kiểm tra format (JPG, PNG, GIF)
→ Kiểm tra kích thước file (< 5MB recommended)
```

### ❌ Dữ liệu mất sau refresh
```
→ Hiện tại dữ liệu chỉ lưu trong RAM
→ Click "Tải xuống" để lưu thành PNG trước khi refresh
→ Backend sẽ được thêm để lưu projects vĩnh viễn
```

---

## 📈 Tiếp Theo

Chúng tôi sắp thêm:
- ✨ Presentation Mode (tự động chuyển slides)
- 🎭 Effects & Filters cho ảnh
- 📦 Template Library
- 💾 Lưu projects vào database
- 🎬 Export dưới dạng Video
- 👥 Collaboration (chỉnh sửa cùng lúc)

---

## 📞 Liên Hệ & Feedback

Gặp vấn đề? Có ý kiến? 
- 📧 Gửi feedback qua form
- 🐦 Tag @YourTeam trên Twitter
- 💬 Tham gia Discord community

---

**Bắt đầu tạo ngay!** 🚀
