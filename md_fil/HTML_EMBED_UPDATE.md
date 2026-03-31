# 🎉 HTML Embed System - Cập Nhật Hoàn Thành

**Ngày**: February 16, 2026  
**Trạng thái**: ✅ Hoàn thành

---

## 📋 Tóm Tắt Thay Đổi

Hệ thống đã được nâng cấp để hỗ trợ **nhúng HTML trực tiếp (srcdoc)** tương tự như Google Sites, bên cạnh việc hỗ trợ iframe từ URL ngoài.

---

## ✨ Các Tính Năng Mới

### 1. Hỗ Trợ `srcdoc` Attribute

**Trước (chỉ src):**
```html
<iframe src="https://example.com"></iframe>
```

**Giờ (hỗ trợ srcdoc):**
```html
<iframe srcdoc="<html><body>Nội dung HTML</body></html>"></iframe>
```

### 2. Xử Lý Tự Động

- ✅ Phát hiện tự động loại iframe (src vs srcdoc)
- ✅ Render đúng cách cho từng loại
- ✅ Xử lý escape HTML trên server
- ✅ Unescape khi render trên client

### 3. Bảo Mật Tăng Cường

- ✅ Sanitize tất cả embed code trước lưu
- ✅ Thêm `sandbox` attributes
- ✅ Chặn các script nguy hiểm

---

## 📁 Các File Được Thay Đổi/Tạo

### 1. ✅ **Cập Nhật Sanitization** 
**Files**: 
- `src/app/api/blocks/route.ts`
- `src/app/api/blocks/[id]/route.ts`

**Thay đổi**:
- ✏️ Hàm `sanitizeEmbedCode()` giờ hỗ trợ cả `src` và `srcdoc`
- ✏️ Thêm xử lý escape/unescape HTML
- ✏️ Thêm sandbox attributes tự động
- ✏️ Hỗ trợ các thuộc tính: width, height, title, style

### 2. ✨ **Tạo Embed Handler Utility**
**File**: `src/utils/embedHandler.ts` (200+ lines)

**Chức năng**:
```typescript
- parseEmbedCode()      // Phân tích mã iframe
- unescapeHtmlEntities() // Giải escape HTML entities
- buildIframeHtml()     // Xây dựng iframe đúng cách
```

### 3. 🚀 **Cập Nhật EmbedBlockComponent**
**File**: `src/components/editor/EmbedBlockComponent.tsx`

**Cải thiện**:
- ✨ Phát hiện tự động srcdoc vs src
- ✨ Render riêng cho srcdoc bằng `iframe.srcdoc` property
- ✨ Hỗ trợ script execution
- ✨ Placeholder placeholder cập nhật với ví dụ
- ✨ Khuyến nghị công nghệ trong form

### 4. 📖 **Hướng Dẫn Chi Tiết**
**File**: `HTML_EMBED_GUIDE.md`

Bao gồm:
- Giới thiệu về hai loại nhúng
- Hướng dẫn từng bước
- Các template HTML cơ bản
- Troubleshooting

### 5. 🇻🇳 **Mẫu Quiz Tiếng Việt**
**File**: `VIETNAMESE_QUIZ_TEMPLATES.md`

Bao gồm:
- Quiz hành tinh (ví dụ bạn cung cấp)
- Quiz toán học
- Quiz điền khuyết
- Quiz đúng/sai
- Tất cả sẵn sàng sử dụng

---

## 🎯 Cách Sử Dụng

### Bước 1: Tạo Embed

Vào `Trang Bài Giảng` → `Thêm Block` → `Nhúng (Embed)`

### Bước 2: Dán Mã

Có hai cách:

**Cách 1 - Từ URL:**
```html
<iframe src="https://youtube.com/embed/..." width="100%" height="600"></iframe>
```

**Cách 2 - HTML Trực Tiếp (MỚI):**
```html
<iframe srcdoc="<html><body>...</body></html>" width="100%" height="400"></iframe>
```

### Bước 3: Nhấp Thêm

Form sẽ tự validate và lưu.

---

## 🔍 Chi Tiết Kỹ Thuật

### Server-side (sanitization)

```typescript
// Input: <iframe srcdoc='<div>Test</div>' width="100%"></iframe>
// Process:
// 1. Parse iframe tag
// 2. Unescape srcdoc value
// 3. Escape cho HTML attribute
// 4. Thêm sandbox attributes
// Output: Safe để lưu vào DB
```

### Client-side (rendering)

```typescript
// Cho src:
<div dangerouslySetInnerHTML={{ __html: embedCode }} />

// Cho srcdoc:
<iframe ref={iframeRef} />
useEffect(() => {
  iframeRef.current.srcdoc = unescapedContent;
}, [])
```

---

## ✅ Kiểm Tra (Testing)

### Test Case 1: Srcdoc với HTML cơ bản

```html
<iframe srcdoc="<html><body><h1>Xin chào</h1></body></html>" width="100%" height="300"></iframe>
```

✅ **Kỳ vọng**: Hiển thị "Xin chào"

### Test Case 2: Srcdoc với CSS

```html
<iframe srcdoc="<html><head><style>body{background:red;}</style></head><body>Red</body></html>" width="100%" height="300"></iframe>
```

✅ **Kỳ vọng**: Nền đỏ

### Test Case 3: Srcdoc với JavaScript

```html
<iframe srcdoc="<html><body><button onclick="alert('Hi')">Click</button></body></html>" width="100%" height="300"></iframe>
```

✅ **Kỳ vọng**: Button hoạt động

### Test Case 4: Quiz Tiếng Việt

Sử dụng ví dụ từ `VIETNAMESE_QUIZ_TEMPLATES.md`

✅ **Kỳ vọng**: Quiz hiển thị và phản ứi đúng

---

## 🐛 Troubleshooting

| Vấn Đề | Nguyên Nhân | Giải Pháp |
|--------|-----------|----------|
| Iframe không hiển thị | Thiếu `height` | Thêm `height="400"` |
| JavaScript không chạy | Thiếu `sandbox` | Server sẽ thêm tự động |
| Nội dung bị cắt | `height` quá nhỏ | Tăng giá trị height |
| Styling không áp dụng | Dùng class ngoài | Dùng inline style |

---

## 🚀 Tính Năng Tương Lai (Optional)

- [ ] Upload file HTML từ máy tính
- [ ] Library template có sẵn
- [ ] Preview trước khi lưu
- [ ] Thêm preview full-screen
- [ ] Copy/duplicate embed
- [ ] Version control cho embed

---

## 📚 Tài Liệu Liên Quan

1. **[HTML_EMBED_GUIDE.md](HTML_EMBED_GUIDE.md)** - Hướng dẫn chi tiết
2. **[VIETNAMESE_QUIZ_TEMPLATES.md](VIETNAMESE_QUIZ_TEMPLATES.md)** - Mẫu quiz sẵn sàng
3. **MDN Docs**: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
4. **HTML5 Spec**: https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-srcdoc

---

## 🎓 Ví Dụ Nhanh

### Dán ngay vào form "Nhúng":

```html
<iframe srcdoc='<html><body style="font-family: sans-serif; padding: 20px;"><h3>👋 Chào mừng!</h3><p>Đây là nội dung nhúng HTML tuỳ chỉnh.</p></body></html>' width="100%" height="300"></iframe>
```

---

## ✨ Kết Luận

Giờ bạn có thể:

✅ Nhúng HTML tuỳ chỉnh (trực tiếp, không cần server ngoài)  
✅ Tạo quiz, flashcard, tool tương tác  
✅ Sử dụng tất cả ví dụ tiếng Việt sẵn có  
✅ An toàn - tất cả được xác thực trên server  

---

**Hỏi chưa rõ? Xem file guide hoặc thử các template!** 🎉
