# 📱 Hướng dẫn: Nhúng HTML được tùy chỉnh - Giống như Google Sites

## Giới thiệu

Hệ thống hiện nay hỗ trợ nhúng nội dung HTML trực tiếp vào các trang bài giảng, tương tự như Google Sites. Bạn có thể nhúng quiz, flashcards, hoặc bất kỳ nội dung HTML nào mà bạn muốn.

---

## 🎯 Hai cách nhúng chính

### 1️⃣ Nhúng từ URL ngoài (src)

Đây là cách nhúng từ các trang web hoặc embedding service:

```html
<iframe src="https://example.com/quiz" width="100%" height="600"></iframe>
```

**Hỗ trợ:** 
- ✅ YouTube
- ✅ Vimeo
- ✅ Google Forms
- ✅ Quizizz
- ✅ Kahoot
- ✅ Wordwall
- ✅ Quizlet
- ✅ Bất kỳ URL nào đáng tin cậy

---

### 2️⃣ Nhúng HTML trực tiếp (srcdoc) ✨ MỚI

Nhúng mã HTML trực tiếp vào iframe mà không cần máy chủ ngoài:

```html
<iframe srcdoc="<html><body><h1>Xin chào!</h1></body></html>" width="100%" height="300"></iframe>
```

---

## 📋 Ví dụ Thực Tế: Quiz Tiếng Việt

### Ví dụ: Quiz về Hành tinh

Đây là ví dụ bạn đã cung cấp, giờ hoạt động hoàn hảo:

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            background: #f4f4f9;
          }
          .quiz-container {
            max-width: 400px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h3 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            font-size: 14px;
          }
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 15px 0;
          }
          button {
            display: block;
            width: 100%;
            margin: 10px 0;
            padding: 12px;
            border: none;
            border-radius: 4px;
            background: white;
            border: 1px solid #ddd;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
          }
          button:hover {
            background: #f0f0f0;
          }
          button.correct {
            background: #4caf50;
            color: white;
            border-color: #4caf50;
          }
          button.incorrect {
            background: #f44336;
            color: white;
            border-color: #f44336;
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <h3>❓ Câu hỏi: Hành tinh nào gần Mặt trời nhất?</h3>
          <p>Question: Which planet is closest to the Sun?</p>
          <hr>
          <button onclick="this.classList.add(\"incorrect\"); alert(\"Sai rồi! Hãy thử lại.\")">Kim tinh (Venus)</button>
          <button onclick="this.classList.add(\"correct\"); alert(\"✓ Chính xác! Thủy tinh (Mercury) là hành tinh gần Mặt trời nhất.\")">✓ Thủy tinh (Mercury)</button>
          <button onclick="this.classList.add(\"incorrect\"); alert(\"Sai rồi!\")">Hỏa tinh (Mars)</button>
        </div>
      </body>
    </html>'
  width="100%" 
  height="350" 
  style="border: none; border-radius: 8px;">
</iframe>
```

---

## 🛠️ Cách Sử Dụng Bước-Từng-Bước

### Bước 1: Mở Trình Chỉnh Sửa Trang

1. Vào trang bài giảng của bạn
2. Nhấp nút **"Thêm Block"** hoặc **"+"**
3. Chọn **"Nhúng"** (Embed)

### Bước 2: Dán Mã HTML

```
┌─────────────────────────────────┐
│ Nhấp để thêm nhúng              │
│ (Wordwall, Quizizz, Kahoot...) │
└─────────────────────────────────┘
```

Nhấp vào đó, sau đó:

1. Dán mã iframe của bạn
2. Có thể là `src="..."` hoặc `srcdoc="..."`
3. Nhấp **Thêm nhúng**

### Bước 3: Xem Trước

Nội dung sẽ hiển thị ngay lập tức nhưng trang bạn có thể cần reload để thấy kết quả tối ưu.

---

## 📝 Template HTML Cơ Bản

### Quiz đơn giản

```html
<iframe srcdoc='
  <html>
    <body style="font-family: sans-serif; padding: 20px;">
      <div style="max-width: 400px; margin: auto;">
        <h2>Câu hỏi của tôi</h2>
        <button onclick="alert(\"Sai!\")">Đáp án 1</button>
        <button onclick="alert(\"Đúng!\")">Đáp án 2</button>
      </div>
    </body>
  </html>' 
  width="100%" height="400"></iframe>
```

### Flashcard

```html
<iframe srcdoc='
  <html>
    <body style="font-family: sans-serif; padding: 20px; background: #f5f5f5;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 300px; margin: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3>Mặt trước</h3>
        <p style="cursor: pointer; user-select: none;" onclick="document.body.innerHTML = (document.body.innerHTML.includes(\"Mặt sau\")) ? document.body.innerHTML.replace(\"Mặt sau\", \"Mặt trước\") : document.body.innerHTML.replace(\"Mặt trước\", \"Mặt sau\"); return false;">
          Nhấp để lật thẻ
        </p>
      </div>
    </body>
  </html>' 
  width="100%" height="300"></iframe>
```

---

## ⚙️ Các Thuộc tính Iframe Hỗ Trợ

| Thuộc tính | Giá trị | Ví dụ |
|-----------|--------|-------|
| `width` | % hoặc px | `width="100%"` |
| `height` | px | `height="600"` |
| `src` | URL | `src="https://..."` |
| `srcdoc` | HTML code | `srcdoc="<html>..."` |
| `title` | Text | `title="Quiz về Toán"` |
| `style` | CSS | `style="border-radius: 10px;"` |

---

## 🔒 Lưu ý Bảo Mật

✅ **Được phép:**
- HTML, CSS, JavaScript cơ bản
- Các sự kiện onclick, onchange
- Các thẻ form

⛔ **Không được phép:**
- `eval()` hoặc `Function()`
- Truy cập cookie
- Redirect từ `document.location`

---

## 🐛 Troubleshooting

### Vấn đề: Iframe không hiển thị

**Giải pháp:**
1. Kiểm tra cú pháp HTML
2. Đảm bảo `height` được chỉ định (ví dụ `height="400"`)
3. Không có lỗi JavaScript trong console

### Vấn đề: JavaScript không chạy

**Giải pháp:**
1. Dùng `onclick="..."` thay vì thẻ `<script>`
2. Đảm bảo code không chứa `eval()`
3. Kiểm tra browser console (F12)

### Vấn đề: Styling không được áp dụng

**Giải pháp:**
1. Dùng inline `style="..."` thay vì `<style>`
2. Hay dùng `<style>` bên trong `<head>`
3. Tránh dùng class ngoài iframe

---

## 💡 Mẹo

1. **Sử dụng `width="100%"`** để iframe tự co giãn theo màn hình
2. **Đặt `height` cao hơn nội dung** tránh thanh cuộn không cần thiết
3. **Thử nghiệm trong DevTools** (F12) trước khi dán

---

## 📞 Cần Trợ Giúp?

- 📖 Xem [MDN: iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- 🚀 Thử các ví dụ trên [CodePen](https://codepen.io)
- 💬 Hỏi ChatGPT để tạo mã HTML tuỳ chỉnh
