# 🔧 Kiểm Tra Nhanh - HTML Embed Troubleshoot

Nếu embed của bạn không hoạt động, hãy kiểm tra danh sách này:

---

## ❌ Iframe Không Hiển Thị

### Kiểm tra:
- [ ] Có `height` attribute? (VD: `height="400"`)
- [ ] Iframe đóng đúng? (`</iframe>`)
- [ ] Url/srcdoc không có lỗi?
- [ ] Không có lỗi trong browser console (F12)

### Giải pháp:
```html
<!-- ❌ Sai - Không có height -->
<iframe src="..."></iframe>

<!-- ✅ Đúng - Có height -->
<iframe src="..." width="100%" height="400"></iframe>
```

---

## ❌ Srcdoc Không Hiển Thị

### Kiểm tra:
- [ ] Dùng single quotes ngoài? `srcdoc='...'`
- [ ] Dùng double quotes bên trong? `srcdoc='<div class="test">'`
- [ ] Không có single quote trong HTML?
- [ ] Closing tag `</iframe>` tồn tại?

### Giải pháp:
```html
<!-- ❌ Sai - Mixed quotes -->
<iframe srcdoc="<body>'test</body>"></iframe>

<!-- ✅ Đúng - Nhất quán -->
<iframe srcdoc='<body>test</body>'></iframe>
```

---

## ❌ JavaScript Trong Srcdoc Không Chạy

### Kiểm tra:
- [ ] Có `onclick="..."` attribute?
- [ ] Không chứa `eval()`?
- [ ] Không chứa `Function()`?
- [ ] Event listener đúng cú pháp?

### Giải pháp - Dùng Inline Event:
```html
<!-- ✅ Tốt -->
<button onclick="alert('Hello')">Click</button>

<!-- ⚠️ Không hoạt động trong srcdoc -->
<script>
  document.querySelector('button').addEventListener('click', () => {
    alert('Hello');
  });
</script>
```

---

## ❌ CSS Không áp Dụng

### Kiểm tra:
- [ ] Dùng `<style>...</style>` bên trong?
- [ ] Hay dùng inline `style="..."`?
- [ ] Không import CSS từ ngoài?

### Giải pháp:
```html
<!-- ✅ Tốt - Inline style -->
<button style="background: blue; color: white;">Click</button>

<!-- ✅ Tốt - Style tag -->
<iframe srcdoc='
  <html>
    <head>
      <style>
        button { background: blue; color: white; }
      </style>
    </head>
    <body><button>Click</button></body>
  </html>
'></iframe>
```

---

## ❌ Ký Tự Đặc Biệt Bị Lỗi

### Kiểm tra:
- [ ] Có dùng `&` mà không escape?
- [ ] Có dùng `"` bên trong attribute?
- [ ] Có dùng `<` hoặc `>` lạc lõng?

### Giải pháp - Escape HTML:
| Ký Tự | Escape |
|-------|--------|
| `&` | `&amp;` |
| `"` | `&quot;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `'` | `&#39;` |

**Ví dụ:**
```html
<!-- ❌ Sai -->
<iframe srcdoc="<div>A & B" C"></div>"></iframe>

<!-- ✅ Đúng -->
<iframe srcdoc='<html><div>A &amp; B &quot;C&quot;</div></html>'></iframe>
```

---

## ✅ Kiểm Tra Nhanh - Copy & Paste

### Test 1: HTML cơ bản
```html
<iframe srcdoc='<html><body><h1>Xin chào</h1></body></html>' width="100%" height="300"></iframe>
```
**→ Nếu hiển thị "Xin chào", hệ thống OK**

### Test 2: CSS
```html
<iframe srcdoc='<html><head><style>body{background:lightblue;}</style></head><body>CSS OK</body></html>' width="100%" height="300"></iframe>
```
**→ Nếu nền xanh, CSS OK**

### Test 3: JavaScript
```html
<iframe srcdoc='<html><body><button onclick="alert(123)">Click</button></body></html>' width="100%" height="300"></iframe>
```
**→ Nếu alert hiển thị, JS OK**

---

## 📊 Kiểm Tra Error - Mở DevTools

1. Nhấp **F12** trên bàn phím
2. Vào tab **Console**
3. Tìm message màu đỏ
4. Đọc nội dung lỗi

### Lỗi Phổ Biến:
```
SyntaxError: Unexpected token
→ Lỗi HTML/CSS/JS cú pháp

Refused to execute inline script
→ Cần thêm sandbox attributes (server làm)

Content size is too large
→ Nội dung quá lớn, tách thành nhiều phần
```

---

## 🎯 Debugging Step-by-Step

### Bước 1: Kiểm tra cú pháp
```html
<!-- Paste vào HTML Validator: https://validator.w3.org/ -->
<iframe srcdoc='<html>...</html>'></iframe>
```

### Bước 2: Kiểm tra trên CodePen
1. Vào https://codepen.io
2. Dán code vào HTML section
3. Xem kết quả

### Bước 3: Simplify
- Bỏ CSS, kiểm tra HTML có OK không
- Bỏ JS, kiểm tra CSS có OK không
- Bỏ từng phần để tìm lỗi

---

## 💡 Những Thứ Được Phép

✅ HTML basic tags (`<div>`, `<p>`, `<h1>`, etc.)  
✅ CSS inline (`style="..."`)  
✅ CSS bên trong (`<style>...</style>`)  
✅ JavaScript events (`onclick`, `onchange`, etc.)  
✅ Form elements (`<input>`, `<button>`, etc.)  
✅ Images (`<img>` từ URL)  
✅ Tables, Lists, etc.  

---

## ⛔ Những Thứ KHÔNG Được Phép

❌ `eval()`  
❌ `Function()` constructor  
❌ `document.location` redirect  
❌ Cookie access  
❌ LocalStorage access  
❌ External JavaScript imports (vì sandbox)  
❌ `<script src="..."></script>` từ ngoài  

---

## 📞 Vẫn Không Giải Quyết?

1. **Xem file guide**: `HTML_EMBED_GUIDE.md`
2. **Copy template**: `VIETNAMESE_QUIZ_TEMPLATES.md`
3. **Kiểm tra console**: F12 → Console → Xem error message
4. **Thử test case**: Dùng Test 1, 2, 3 từ trên

---

## 🧪 Ví Dụ Hoàn Chỉnh Làm Việc

```html
<iframe 
  srcdoc='
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; background: #f0f0f0; }
          .box { background: white; padding: 20px; border-radius: 8px; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Test</h2>
          <p id="result">Click button bên dưới:</p>
          <button onclick="document.getElementById(\"result\").innerHTML=\"✅ Success!\"; this.disabled=true;">Click Me</button>
        </div>
      </body>
    </html>
  ' 
  width="100%" 
  height="300" 
  style="border: none; border-radius: 8px;">
</iframe>
```

**Nếu button hoạt động → Mọi thứ OK! ✅**

---

Bất cứ lúc nào bạn cần, hãy xem danh sách này! 📋
