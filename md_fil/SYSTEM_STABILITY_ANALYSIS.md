# 🔍 Phân tích độ ổn định hệ thống Penta School

## 📊 Tổng quan

Phân tích này dựa trên việc đọc và review toàn bộ codebase, bao gồm:
- API Routes (src/app/api/)
- Database Schema (prisma/schema.prisma)
- Frontend Components (src/components/)
- State Management (src/stores/)

---

## 🔴 Các vấn đề NGHIÊM TRỌNG có thể gây sập hệ thống

### 1. SQLite không phù hợp cho Production

**File:** `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Vấn đề:**
- SQLite chỉ hỗ trợ **1 writer tại một thời điểm**
- Khi nhiều học sinh nộp bài thi cùng lúc → **database lock** → timeout → crash
- Không có connection pooling
- Không hỗ trợ replication cho scaling

**Tình huống sập:**
```
50 học sinh nộp bài cùng lúc
→ SQLite lock database
→ Các request khác timeout
→ Server hết memory chờ đợi
→ 500 Internal Server Error hàng loạt
```

**Giải pháp:** Chuyển sang PostgreSQL

---

### 2. Prisma Client không disconnect đúng cách

**Vấn đề:** Nhiều API route không có `finally { await prisma.$disconnect(); }`

**Ví dụ trong `src/app/api/exams/route.ts`:**
```typescript
export async function GET(req: NextRequest) {
  // ... code xử lý
  // KHÔNG CÓ prisma.$disconnect() → connection leak
}
```

**Tình huống sập:**
```
100 request liên tiếp
→ 100 Prisma connections mở ra
→ Không có disconnect
→ Connection pool exhausted
→ Database không accept thêm connection
→ Hệ thống sập
```

**Giải pháp:** Thêm disconnect trong finally block hoặc dùng middleware

---

### 3. File Upload lưu Base64 trong Database

**Vấn đề:** Các field như `fileUrl`, `answers`, `optionsSnapshot` lưu JSON string/base64

**Tình huống sập:**
```
Giáo viên upload file Word 10MB
→ Parse thành base64 (~13MB string)
→ Lưu vào database
→ Database file phình to nhanh chóng
→ SQLite có practical limit ~2-4GB
→ Database corrupt khi đạt limit
→ MẤT TOÀN BỘ DỮ LIỆU
```

**Giải pháp:** 
- Lưu file trên disk/cloud storage (S3, Cloudinary)
- Chỉ lưu URL trong database
- Giới hạn file size khi upload

---

### 4. Memory Leak trong Frontend

**File:** `src/components/editor/PageEditor.tsx`

**Vấn đề:** Không có AbortController cho fetch requests
```typescript
useEffect(() => {
  fetch('/api/pages/...')  // Nếu component unmount trước khi response
    .then(res => res.json())  // Response vẫn được xử lý → memory leak
    .then(data => setPages(data));
}, [selectedPageId, pages]);  // Dependency array vấn đề → infinite loop
```

**Tình huống sập:**
```
User mở PageEditor → component mount
→ Fetch request gửi đi
→ User chuyển trang → component unmount
→ Response về → setState trên unmounted component
→ React warning + memory leak
→ Lặp lại nhiều lần → browser crash
```

---

### 5. Canvas Memory không được giải phóng

**File:** `src/components/editor/CanvasEditorPro.tsx`

**Vấn đề:** Fabric.js canvas có thể không dispose đúng khi component unmount

**Tình huống sập:**
```
Giáo viên tạo bài giảng với 10 slides
→ Mỗi slide có canvas với nhiều objects
→ Switch qua lại giữa các slides
→ Canvas cũ không dispose hoàn toàn
→ Memory tăng dần
→ Browser tab crash sau ~20 phút sử dụng
```

---

### 6. Infinite Re-render Loop

**File:** `src/components/editor/PageEditor.tsx`

**Vấn đề:** 
```typescript
useEffect(() => {
  // ... setCurrentPage
}, [selectedPageId, pages]);  // Khi pages thay đổi → setCurrentPage → pages thay đổi → loop
```

**Tình huống sập:**
```
User mở editor
→ useEffect trigger → setPages
→ pages thay đổi → useEffect trigger lại
→ Infinite loop
→ CPU 100%
→ Browser freeze → crash
```

---

### 7. Thiếu Input Validation

**File:** `src/app/api/auth/register/route.ts`

**Vấn đề:** `subjects` parameter không validate là array
```typescript
subjects: role === 'TEACHER' ? JSON.stringify(subjects || []) : null
// Nếu subjects là string hoặc object → JSON.stringify tạo data sai
```

**Tình huống sập:**
```
Attacker gửi request với subjects = "malicious<script>"
→ JSON.stringify tạo string hợp lệ
→ Lưu vào database
→ Khi render → XSS attack
→ Hoặc data corrupt → crash khi parse
```

---

### 8. Large State trong Zustand Store

**File:** `src/stores/slideStore.ts`

**Vấn đề:** Lưu toàn bộ `canvasData` (JSON với base64 images) trong state

**Tình huống sập:**
```
Giáo viên thêm 5 ảnh vào slide (mỗi ảnh ~2MB base64)
→ State = ~10MB JSON string
→ React re-render → serialize/deserialize 10MB
→ Browser memory spike
→ Tab freeze → crash
```

---

## 🟡 Các vấn đề TRUNG BÌNH có thể gây lỗi

### 9. Thiếu Error Boundary

**Vấn đề:** Không có React Error Boundary → một component crash sẽ crash toàn bộ app

### 10. Không có Rate Limiting

**Vấn đề:** API không có rate limiting → attacker có thể DDoS

### 11. Hardcoded Secrets

**Vấn đề:** Có thể có secrets hardcoded trong code (cần kiểm tra thêm)

### 12. Không có Logging System

**Vấn đề:** Khi crash, không có log để debug

---

## 🟢 Các vấn đề NHẸ

### 13. Missing Loading States

**Vấn đề:** Một số API call không có loading state → user click nhiều lần

### 14. Console.log trong Production

**Vấn đề:** Nhiều console.log trong code → performance impact

---

## 📋 Checklist kiểm tra trước khi deploy

- [ ] Chuyển database sang PostgreSQL
- [ ] Thêm `prisma.$disconnect()` trong tất cả API routes
- [ ] Giới hạn file upload size (max 10MB)
- [ ] Lưu file trên cloud storage thay vì database
- [ ] Thêm AbortController cho tất cả fetch requests
- [ ] Fix infinite re-render loops
- [ ] Thêm React Error Boundary
- [ ] Thêm rate limiting cho API
- [ ] Xóa console.log trong production
- [ ] Thêm logging system (Winston/Pino)
- [ ] Validate tất cả input parameters
- [ ] Test với 50+ concurrent users

---

## 🛠️ Khuyến nghị cải thiện

### Ngắn hạn (trước khi deploy)
1. **Chuyển PostgreSQL** - BẮT BUỘC
2. **Thêm error handling** cho tất cả API routes
3. **Giới hạn file size** khi upload
4. **Fix memory leaks** trong frontend

### Trung hạn (sau khi deploy 1 tháng)
1. Thêm monitoring (Sentry, LogRocket)
2. Implement caching (Redis)
3. Add CDN cho static assets
4. Tối ưu database queries

### Dài hạn
1. Microservices architecture
2. Load balancing
3. Database sharding
4. Kubernetes deployment

---

## 📊 Đánh giá độ ổn định hiện tại

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Error Handling | 4/10 | Nhiều endpoint thiếu try-catch |
| Database | 3/10 | SQLite không phù hợp production |
| Memory Management | 5/10 | Có cleanup nhưng không đầy đủ |
| Input Validation | 4/10 | Thiếu validation nhiều nơi |
| Scalability | 2/10 | Không thể scale với SQLite |
| **Tổng** | **3.6/10** | **Cần cải thiện trước khi deploy** |

---

## 🚨 Dự đoán tình huống sập

### Scenario 1: Exam Submission Spike
```
Thời điểm: Cuối kỳ, 200 học sinh nộp bài trong 5 phút
Kết quả: SQLite lock → timeout → 50% submissions fail
```

### Scenario 2: Large File Upload
```
Giáo viên upload PDF 50MB
Kết quả: Server memory spike → OOM kill → crash
```

### Scenario 3: Canvas Editor Heavy Usage
```
Giáo viên tạo 20 slides với nhiều hình ảnh
Kết quả: Browser tab memory > 2GB → crash
```

### Scenario 4: Concurrent Teachers
```
10 giáo viên cùng tạo bài giảng
Kết quả: Database connections exhausted → 503 error