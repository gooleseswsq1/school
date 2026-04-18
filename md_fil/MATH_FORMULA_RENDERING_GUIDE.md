# Hướng dẫn: Hiển thị Công thức Toán học (Math Formula Rendering)

## 🔧 Vấn đề đã được sửa

**Lỗi**: Công thức toán học không hiển thị trên Vercel (production)

**Nguyên nhân**: 
- LaTeX/KaTeX CSS không được bundled đúng trên Vercel
- SVG format from CodeCogs có vấn đề CORS trên serverless

**Giải pháp**: 
- Sử dụng SafeMathRenderer với CodeCogs PNG API
- Thêm `\dpi{300}` cho độ phân giải cao

---

## 📋 Kiến trúc Hiện Tại

```
Nội dung có Công thức Toán
    ↓
InlineContentRenderer (src/components/latex/InlineContentRenderer.tsx)
    ↓
SafeMathRenderer (src/components/latex/SafeMathRenderer.tsx)
    ↓
CodeCogs PNG API: https://latex.codecogs.com/png.latex
    ↓
Hiển thị trên Giao diện (hoạt động trên Vercel)
```

---

## 💻 Cách sử dụng

### Nơi dùng để hiển thị công thức (tự động):

1. **Câu hỏi Quiz**: Các công thức trong `question.questionText` sẽ tự động hiển thị
   ```typescript
   // Quest text: "Đạo hàm của $f(x) = x^2$ là"
   // → Công thức $f(x) = x^2$ tự động convert thành ảnh
   ```

2. **Tùy chọn Trắc nghiệm**: Công thức trong options tự động hiển thị
   ```typescript
   // Option: "A) $2x$ B) $x^2$ C) Không xác định"
   // → Tất cả công thức tự động convert
   ```

### Cú pháp Công thức:

#### Công thức Inline (nội dòng):
```
$a^2 + b^2 = c^2$  hoặc  \(e = mc^2\)
```

#### Công thức Block (khối):
```
$$\int_0^1 x^2 dx = \frac{1}{3}$$  hoặc  \[\lim_{n→∞} (1 + 1/n)^n = e\]
```

#### Ký hiệu toán Việt Nam:
```
$vec(AB)$ → $\overrightarrow{AB}$     (vectơ AB)
$arc(AB)$ → $\stackrel{\frown}{AB}$   (cung AB)
$ovl(123)$ → $\overline{123}$         (gạch đầu số 123)
$C_n^k$ → $\binom{n}{k}$              (tổ hợp)
$30°$ → $30^\circ$                    (độ)
```

#### Unicode Greek & Operators:
```
α β γ δ ... Ω  (Greek letters)
± × ÷ · ≤ ≥ ≠ ≈  (operators)
→ ← ↔ ⇒ ⇐ ⇔  (arrows)
∑ ∏ ∫ ∮ √  (special operators)
∈ ∉ ⊂ ⊃ ⊆ ⊇  (set notation)
```

---

## ✅ Các file đã sửa

### 1. SafeMathRenderer.tsx
**Thay đổi**: Sử dụng PNG format thay vì SVG
```typescript
// URL: https://latex.codecogs.com/png.latex?\dpi{300}{formula}
// Lợi ích:
// - PNG hoạt động tốt trên Vercel
// - \dpi{300} = độ phân giải 300 DPI → rõ ràng
// - Proper URL encoding
```

### 2. ProductionMathRenderer.tsx (Mới)
**Chức năng**: Fallback thông minh
```typescript
// 1. Cố gắng dùng KaTeX (nhanh, local)
// 2. Nếu KaTeX CSS không tải trong 500ms → chuyển sang ảnh
// 3. Nếu là SSR → mặc định dùng ảnh
```

### 3. InlineContentRenderer.tsx
**Hiện trạng**: Đã dùng SafeMathRenderer ✓
```typescript
// Tự động render toàn bộ công thức dưới dạng ảnh
// Hỗ trợ cả {{INLINE_IMG:N}} markers
```

---

## 🧪 Kiểm thử

### Test trên Local:
```bash
npm run dev
# Truy cập: http://localhost:3000/math-demo
# Xem các ví dụ công thức
```

### Test trên Vercel:
```bash
# Deploy và chạy một câu hỏi quiz có công thức
# Công thức phải load từ CodeCogs (ảnh)
# Kiểm tra DevTools → Network → xem latex.codecogs.com requests
```

### Kiểm tra Console:
```javascript
// Phải thấy công thức được render (không có lỗi đỏ)
// Nếu có lỗi, check:
// 1. CodeCogs URL accessible?
// 2. LaTeX syntax hợp lệ?
// 3. Network không block?
```

---

## 🐛 Troubleshooting

### Công thức hiển thị dưới dạng chữ đỏ thay vì ảnh
**Nguyên nhân**: CodeCogs request thất bại

**Giải pháp**:
1. Kiểm tra DevTools → Network → `latex.codecogs.com`
2. Nếu 404 → LaTeX syntax sai, test tại https://latex.codecogs.com/
3. Nếu timeout → CodeCogs chậm, chờ hoặc retry
4. Nếu CORS error → ít khi xảy ra, báo cáo issue

### Công thức không hiển thị cử toàn:
1. **Check**: Công thức có `$...$` hay `$$...$$` không?
2. **Check**: Cú pháp LaTeX đúng không?
3. **Check**: Unicode Greek có được convert không? (Xem ký hiệu Việt Nam ở trên)

### Test LaTeX trực tiếp:
```
Nếu muốn test công thức:
1. Vào https://latex.codecogs.com/
2. Nhập công thức: \frac{a}{b}
3. Nếu render được → OK
4. Nếu không → LaTeX syntax sai
```

---

## 📦 Dependencies

```json
{
  "katex": "^0.16.x",           // For editor mode (optional)
  "react-katex": "^3.x",         // For editor mode (optional)
  // SafeMathRenderer không cần dependencies!
  // Nó dùng CodeCogs API online (free)
}
```

---

## 🎯 Hiệu suất

- **Inline formula** (`$...$`): ảnh ~20KB/công thức
- **Block formula** (`$$...$$`): ảnh ~50KB/công thức
- **Caching**: Cùng công thức → dùng URL cache của CodeCogs
- **Fallback text**: Nếu ảnh fail → hiển thị raw LaTeX chữ đỏ

---

## 📝 Ghi chú

- **Mobius**: Hiện tại dùng SafeMathRenderer ✓
- **Vercel Compatible**: Yes ✓
- **SSR Safe**: Có đặc biệt xử lý SSR ✓
- **Browser Support**: Tất cả browser hiện đại ✓

---

**Version**: 2.0 (Fixed CodeCogs PNG format - 2026-04-19)
