# 🎯 Hướng Dẫn Nhúng Nâng Cao - Embed Improvements Guide

## 📋 Tóm tắt thay đổi

### ✅ Vấn Đề Cũ (Giải Quyết)
- ❌ Wordwall bị 404 vì sandbox quá chặt
- ❌ CORS block - `origin: 'null'`
- ❌ Thiếu `allow-same-origin` 
- ❌ Không thể nhúng URL trực tiếp
- ❌ Kích thước cố định, không auto-resize

### ✅ Giải Pháp Mới
- ✅ **Tự động phát hiện loại embed** (Wordwall, Quizizz, Kahoot, etc.)
- ✅ **Cấp quyền `allow-same-origin` cho quiz apps**
- ✅ **Chế độ nhúng URL** (không cần HTML code)
- ✅ **Auto-resize iframe** để hiển thị nội dung đầy đủ
- ✅ **Checkbox "Full Display"** để mở rộng khung
- ✅ **Sandbox profiles** - SECURE, QUIZ_APPS, CUSTOM_HTML, FULL

---

## 🎮 Cách Sử Dụng

### 1. Nhúng Mã HTML (Cách cũ)

```html
<iframe src="https://wordwall.net/resource/..." 
        width="100%" 
        height="600" 
        frameborder="0" 
        allowfullscreen 
        sandbox="allow-scripts allow-popups allow-forms allow-presentation allow-same-origin">
</iframe>
```

**Bước:**
1. Nhấp "Thêm nhúng" 
2. Chọn tab **"Mã HTML"**
3. Dán iframe code
4. Đặt chiều rộng (100%) & chiều cao (600)
5. ✅ Thêm nhúng

---

### 2. Nhúng URL (Cách Mới) ⭐

**Cách này đơn giản hơn!**

```
Bước:
1. Nhấp "Thêm nhúng"
2. Chọn tab "URL"  
3. Dán link: https://wordwall.net/resource/...
4. Đặt kích thước tùy chọn
5. ✅ Thêm nhúng
```

**Nó sẽ tự động:**
- Generate iframe HTML
- Phát hiện là Wordwall → Cấp `allow-same-origin`
- Áp dụng kích thước

---

## 🎨 Tùy Chọn Hiển Thị

### "Hiển thị đầy đủ" (Full Display)
- **Mục đích:** Auto-scale iframe để khớp nội dung
- **Dùng khi:** Wordwall, quiz app còn content bị cắt
- **Tác dụng:** Iframe sẽ tự expand cao theo nội dung

**Trước:**
```
┌─────────────────────┐
│                     │
│  Content bị cắt...  │  ← Chỉ thấy 60%
│  [Các nút bị ẩn]    │
└─────────────────────┘
```

**Sau (Full Display = ✅):**
```
┌─────────────────────┐
│                     │
│  Hiển thị đầy đủ    │
│  Tất cả nút hiện    │
│  Scroll nếu cần     │
│                     │
└─────────────────────┘
```

### "Tự động đổi kích thước" (Auto-Resize)
- **Mục đích:** Iframe gửi message để điều chỉnh cao
- **Dùng khi:** Content thay đổi động
- **Cơ chế:** postMessage API (cross-origin safe)

---

## 🔒 Sandbox Improvements (An toàn)

### Sandbox Profiles

| Profile | Attributes | Dùng cho |
|---------|-----------|---------|
| **SECURE** | `allow-scripts allow-popups allow-forms allow-presentation` | HTML/Video bình thường |
| **QUIZ_APPS** | `+ allow-same-origin` | Wordwall, Quizizz, Kahoot |
| **CUSTOM_HTML** | `+ allow-same-origin` | Custom HTML với API |
| **FULL** | Tất cả + `allow-same-origin` | Trusted content |

### Tự động phát hiện

```typescript
URL chứa "wordwall" → QUIZ_APPS profile ✅
URL chứa "quikikz" → QUIZ_APPS profile ✅
URL chứa "kahoot" → QUIZ_APPS profile ✅
URL = Unknown → SECURE profile (an toàn nhất) ✅
```

**Tại sao cần `allow-same-origin`?**
- Quiz apps gửi analytics data
- Cần cookie từ browser
- Không có `allow-same-origin` → CORS block → 404
- Với nó → Hoạt động bình thường ✅

---

## 🛠️ Troubleshooting

### ❌ "Vẫn hiển thị 404"

**Khắc phục:**
1. Kiểm tra URL đúng chưa
2. Bật "Hiển thị đầy đủ" 
3. Tăng chiều cao (từ 600px → 800px)
4. Xóa nhúng, thêm lại

**Nếu vẫn 404:**
- Trang web này có thể chặn iframe
- Thử download file .html từ trang
- Nhúng bằng srcdoc thay vì src

---

### ❌ "Content bị cắt từng phía"

**Giải pháp:**
1. ✅ Bật "Hiển thị đầy đủ"
2. Tăng chiều cao: 600 → 800 → 1000
3. Giảm width: 100% → 95% (nếu mobile issues)

---

### ❌ "Scroll nội dụng không hoạt động"

**Kiểm tra:**
1. Sandbox có `allow-popups` không? ✅
2. Để `overlfow: visible` enabled
3. Try tắt "Full Display" để back to fixed height

---

## 📊 Chi tiết Kỹ thuật

### Files Modified

1. **`src/utils/embedHandler.ts`** ⭐ NEW
   - `SANDBOX_PRESETS` - Profiles
   - `detectEmbedTypeAndSandbox()` - Auto-detect
   - `buildAutoResizeIframe()` - With postMessage
   - `setupAutoResizeListener()` - Resize logic

2. **`src/components/editor/EmbedBlockComponent.tsx`** 🔄 UPDATED
   - Radio buttons: Code vs URL mode
   - Checkbox: Full Display + Auto-Resize
   - State management: EmbedData interface
   - Backward compatible: Old code still works

3. **`src/app/api/blocks/route.ts`** 🔄 UPDATED
   - `detectSandboxForUrl()` - Server-side detection
   - Better sanitization with correct sandbox attrs

---

## 💡 Ví dụ Thực Tế

### Ví dụ 1: Nhúng Wordwall bằng URL

```
1. Add Block → Nhúng
2. Chọn "URL"
3. Dán: https://wordwall.net/resource/123456/
4. Height: 600px
5. ✅ Full Display: ON
6. Thêm nhúng
```

**Kết quả:** 
- Auto-generate iframe ✅
- Sandbox = QUIZ_APPS (có allow-same-origin) ✅
- Full Display = chiều cao auto-expand ✅
- Wordwall hoạt động 100% ✅

---

### Ví dụ 2: Nhúng Google Form

```
1. Google Form → Copy link to embed
2. Add Embed Block
3. Chọn "URL"
4. Dán URL
5. Thêm
```

**Tự động:**
- Phát hiện `forms.google.com` ✅
- Cấp QUIZ_APPS sandbox ✅
- Form sẽ interactive 100% ✅

---

### Ví dụ 3: Custom HTML (srcdoc)

```
1. Có HTML code
2. Chọn "Mã HTML"
3. Dán: <iframe srcdoc="<html>...</html>" ...>
4. Đặt size
5. Thêm
```

---

## 🔄 Backward Compatibility ✅

**Cũ:** Chỉ hỗ trợ code nhúng  
**Mới:** Support cả code + URL

**Old embeds vẫn hoạt động:**
- Parse old code ✅
- Detect loại (src vs srcdoc) ✅
- Apply correct sandbox ✅
- Hiển thị bình thường ✅

---

## 📚 API Reference

### EmbedConfig Interface
```typescript
interface EmbedConfig {
  type: 'src' | 'srcdoc';
  src?: string;
  srcdoc?: string;
  width?: string;
  height?: string;
  fullDisplay?: boolean;
  autoResize?: boolean;
}
```

### SANDBOX_PRESETS
```typescript
SECURE: 'allow-scripts allow-popups allow-forms allow-presentation'
QUIZ_APPS: '...  + allow-same-origin'
CUSTOM_HTML: '... + allow-same-origin'
FULL: 'allow-same-origin allow-scripts ...'
```

---

## 🎓 Học Thêm

- **CORS Issues?** → Xem `allow-same-origin` section
- **Sandbox quá chặt?** → Xem SANDBOX_PRESETS
- **Wordwall không show?** → Bật "Full Display"
- **Size không đúng?** → Điều chỉnh width/height

---

## ✅ Checklist Khi Sử Dụng

- [ ] Chọn mode (Code hay URL)
- [ ] Input embed code hoặc URL
- [ ] Set width & height
- [ ] Bật "Full Display" nếu content bị cắt
- [ ] Thêm nhúng
- [ ] Test hiển thị
- [ ] Nếu lỗi → Xem Troubleshooting

---

**Version:** 2.0 | **Updated:** Feb 16, 2026  
**Status:** ✅ Production Ready
