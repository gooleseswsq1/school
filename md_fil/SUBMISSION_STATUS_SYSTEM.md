# Hệ thống Trạng thái Bài nộp (Submission Status System)

## Tổng quan

Hệ thống quản lý bài nộp của học sinh có ba trạng thái chính:

| Trạng thái | Giá trị | Mô tả | Màu sắc |
|-----------|--------|-------|---------|
| **Đã nộp** | `submitted` | Bài đã được nộp nhưng chưa có điểm từ giáo viên | 🔵 Xanh dương |
| **Đã chấm** | `graded` | Giáo viên đã chấm điểm nhưng chưa xác nhận đạt/không đạt | 🟡 Vàng |
| **Đạt** | `achieved` | Giáo viên đã chấm và xác nhận học sinh đạt yêu cầu | 🟢 Xanh lá |

## Luồng trạng thái (State Flow)

```
[Tạo bài nộp] 
    ↓
[submitted] (Đã nộp)
    ↓
[graded] (Đã chấm - nếu isAchieved = false)
    ↓
[achieved] (Đạt - nếu isAchieved = true)
```

## Cơ chế chuyển trạng thái

### 1. Khi tạo bài nộp mới
- Status mặc định: `submitted`
- Không có điểm số hay xác nhận đạt/không đạt

**API Endpoint:** `POST /api/submissions`
**API Endpoint:** `POST /api/student-submissions`

```typescript
// Tất cả bài nộp được tạo với status = "submitted"
data: {
    title,
    description,
    fileUrl,
    fileType,
    fileSize,
    authorId,
    status: "submitted" // ← Mặc định
}
```

### 2. Khi giáo viên chấm bài
- Gửi `score` (0-100) và/hoặc `isAchieved` (true/false)
- Status sẽ được cập nhật dựa trên giá trị của `isAchieved`

**API Endpoint:** `PUT /api/submissions/{id}`

#### Trường hợp 1: Chấm điểm nhưng chưa đạt
```json
{
    "score": 65,
    "isAchieved": false,
    "gradedBy": "teacher-id"
}
// → Status: "graded"
// → gradedAt: (ngày giờ hiện tại)
```

#### Trường hợp 2: Chấm điểm và đạt yêu cầu
```json
{
    "score": 85,
    "isAchieved": true,
    "gradedBy": "teacher-id"
}
// → Status: "achieved"
// → gradedAt: (ngày giờ hiện tại)
```

#### Trường hợp 3: Chỉ cập nhật điểm mà không xác nhận đạt/không đạt
```json
{
    "score": 75
    // isAchieved không được gửi
}
// → Status: "graded"
// → gradedAt: (ngày giờ hiện tại)
```

## Logic chuyển trạng thái chi tiết (Code)

```typescript
// File: src/app/api/submissions/[id]/route.ts
let newStatus: string | undefined = undefined;
let shouldSetGradedAt = false;

if (isAchieved !== undefined || score !== undefined) {
    shouldSetGradedAt = true;
    
    // Nếu xác nhận đạt → status = "achieved"
    if (isAchieved === true) {
        newStatus = "achieved";
    } 
    // Nếu xác nhận không đạt → status = "graded"
    else if (isAchieved === false) {
        newStatus = "graded";
    }
    // Nếu chỉ có điểm mà không xác nhận → status = "graded"
    else if (score !== undefined && isAchieved === undefined) {
        newStatus = "graded";
    }
}
```

## Dữ liệu được lưu trữ

### Document Model
```prisma
model Document {
    id        String      // ID duy nhất
    title     String      // Tên bài nộp
    description String?   // Mô tả
    fileUrl   String      // Đường dẫn file
    
    // Trạng thái bài nộp
    status    String      // "submitted" | "graded" | "achieved"
    
    // Thông tin chấm điểm
    score     Int?        // Điểm số (0-100)
    isAchieved Boolean?   // Đạt (true) / Không đạt (false)
    gradedBy  String?     // ID giáo viên chấm
    gradedAt  DateTime?   // Thời gian chấm
    
    // Thông tin cơ bản
    authorId  String      // ID học sinh
    createdAt DateTime    // Thời gian nộp
    updatedAt DateTime    // Lần cập nhật cuối
}
```

## Giao diện học sinh (Student Interface)

### Bộ lọc trạng thái
- **Tất cả** - Hiển thị tất cả bài nộp
- **Đã nộp** - Chỉ bài chưa được chấm
- **Đã chấm** - Bài đã có điểm nhưng chưa xác nhận đạt
- **Đạt** - Bài được xác nhận đạt yêu cầu

### Hiển thị thông tin
- **Status Badge**: Màu sắc khác nhau dễ nhận biết
- **Điểm số**: Hiển thị khi có (được chấm)
- **Xác nhận đạt/Không đạt**: Hiển thị khi được xác nhận
- **Thời gian chấm**: Hiển thị ngày giờ giáo viên chấm điểm

## Giao diện giáo viên (Teacher Interface)

### Giao diện chấm điểm
1. Nhập **Điểm số** (0-100)
2. Chọn **"Học sinh đạt yêu cầu"** (checkbox)
3. Lưu → Status tự động cập nhật

### Bộ lọc trạng thái
- **Tất cả** - Mọi bài nộp
- **Đã nộp** - Chưa chấm
- **Đã chấm** - Đã có điểm nhưng chưa đạt
- **Đạt** - Đã xác nhận đạt

## API Routes

### Tạo bài nộp
```
POST /api/submissions
POST /api/student-submissions
```

### Lấy danh sách bài nộp
```
GET /api/submissions?studentId={studentId} → Bài của học sinh
GET /api/teacher/submissions → Mọi bài (dành cho giáo viên)
```

### Chấm điểm
```
PUT /api/submissions/{id}
Body: {
    score: number,
    isAchieved: boolean,
    gradedBy: string
}
```

### Xóa bài nộp
```
DELETE /api/submissions/{id}
```

## Testing

Để test hệ thống, chạy:
```powershell
./test-submission-status.ps1
```

Lệnh này sẽ:
1. ✓ Tạo bài nộp mới (status: "submitted")
2. ✓ Chấm điểm không đạt (status: "graded")
3. ✓ Cập nhật thành đạt (status: "achieved")
4. ✓ Xác nhận dữ liệu được lưu đúng

## Thường gặp

### Câu hỏi: Tại sao bài chỉ có điểm mà không có xác nhận đạt?
**Trả lời:** Status sẽ là "graded". Giáo viên cần check box "Học sinh đạt yêu cầu" để status chuyển thành "achieved".

### Câu hỏi: Có thể chấm chỉ xác nhận đạt mà không có điểm?
**Trả lời:** Không hiệu quả. Nên luôn nhập điểm số kèm theo xác nhận.

### Câu hỏi: Làm sao rollback từ "achieved" thành "graded"?
**Trả lời:** Gọi API PUT với `isAchieved: false` để cập nhật.

## Schema Thay đổi

Migration file: `20260217_fix_submission_status`
- Đảm bảo tất cả Document có status mặc định là "submitted"
- Thêm index trên status field để query nhanh hơn
