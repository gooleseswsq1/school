# PHÂN TÍCH CHI TIẾT HỆ THỐNG TẠO ĐỀ KIỂM TRA

## Tổng Quan Hệ Thống

Hệ thống tạo đề kiểm tra (Quiz/Test Generation System) là một phần của nền tảng giáo dục LMS (Learning Management System) được xây dựng bằng Next.js với TypeScript. Hệ thống hỗ trợ giáo viên tạo, quản lý và chấm điểm bài kiểm tra, đồng thời cho phép học sinh làm bài và xem kết quả.

---

## 1. CẤU TRÚC DATABASE (Prisma Schema)

### 1.1 Các Models Chính

#### ExamBank (Ngân hàng đề)
```prisma
model ExamBank {
  id          String  @id @default(cuid())
  title       String              // tên ngân hàng (vd: "Vật lý 10 Ch.1–3")
  subject     String              // môn học
  grade       Int?                // khối lớp (10, 11, 12)
  description String?
  fileUrl     String?             // file Word gốc
  isActive    Boolean @default(true)
  
  author      User @relation("BankAuthor")
  questions   BankQuestion[]      // câu hỏi trong bank
  exams       ExamBankRef[]       // đề thi tham chiếu bank này
}
```

#### BankQuestion (Câu hỏi trong ngân hàng)
```prisma
model BankQuestion {
  id           String       @id @default(cuid())
  bank         ExamBank     @relation(fields: [bankId])
  bankId       String
  
  num          Int                // số thứ tự trong file gốc
  text         String             // nội dung câu hỏi (có thể có LaTeX: $...$)
  kind         QuestionKind       // MCQ | TF | ESSAY
  difficulty   Difficulty         // EASY | MEDIUM | HARD
  difficultyNum Int  @default(1)  // 1, 2, 3
  chapter      String?            // chương (vd: "1", "2")
  points       Float  @default(1) // điểm mặc định
  
  options      String?            // JSON array: ["A. ...", "B. ...", "C. ...", "D. ..."]
  answer       String             // "A" hoặc "Đúng/Sai" hoặc gợi ý tự luận
  explanation  String?            // giải thích đáp án
}
```

#### Exam (Đề thi)
```prisma
model Exam {
  id          String     @id @default(cuid())
  title       String
  subject     String
  className   String?    // tên lớp giao đề
  duration    Int        @default(45)   // phút
  status      ExamStatus @default(DRAFT)
  examKind    ExamKind   @default(PERIOD)   // loại kiểm tra
  
  openAt      DateTime?  // thời gian mở
  closeAt     DateTime?  // thời gian đóng
  reviewUnlocksAt DateTime? // mở xem lại sau N ngày
  
  easyCount   Int  @default(5)
  mediumCount Int  @default(5)
  hardCount   Int  @default(3)
  variantCount Int @default(1)  // số mã đề
  shuffleOptions Boolean @default(true)
  
  creator     User @relation("ExamCreator")
  banks       ExamBankRef[]
  items       ExamItem[]     // câu hỏi trong đề (snapshot)
  attempts    StudentExamAttempt[]
}
```

#### ExamItem (Câu hỏi trong đề - Snapshot)
```prisma
model ExamItem {
  id       String @id @default(cuid())
  exam     Exam   @relation(fields: [examId])
  examId   String
  order    Int
  
  question   BankQuestion? @relation(fields: [questionId])
  questionId String?
  
  // Snapshot để đề không thay đổi sau khi xuất bản
  textSnapshot    String?
  optionsSnapshot String?
  answerSnapshot  String?
  kindSnapshot    String?   // "MCQ" | "TF" | "ESSAY"
  pointsSnapshot  Float @default(1)
}
```

#### StudentExamAttempt (Bài làm của học sinh)
```prisma
model StudentExamAttempt {
  id         String @id @default(cuid())
  exam       Exam   @relation(fields: [examId])
  examId     String
  student    User   @relation("StudentAttempts")
  studentId  String
  
  startedAt  DateTime @default(now())
  submittedAt DateTime?
  timeSpent  Int?       // giây
  
  answers    String?    // JSON: { "itemId": "A", ... }
  score      Float?
  maxScore   Float?
  isPassed   Boolean?
  
  teacherFeedback String?
  gradedBy        String?
  gradedAt        DateTime?
}
```

### 1.2 Enums (Kiểu liệt kê)

```prisma
enum Difficulty {
  EASY    // Độ khó 1 — Dễ
  MEDIUM  // Độ khó 2 — Trung bình
  HARD    // Độ khó 3 — Khó
}

enum QuestionKind {
  MCQ   // Trắc nghiệm 4 lựa chọn
  TF    // Đúng / Sai
  ESSAY // Tự luận
}

enum ExamKind {
  ORAL      // Kiểm tra miệng — hệ số 1
  QUIZ15    // Kiểm tra 15 phút — hệ số 1
  PERIOD    // Kiểm tra 1 tiết — hệ số 2
}

enum ExamStatus {
  DRAFT     // Chưa mở
  OPEN      // Đang mở cho học sinh làm
  CLOSED    // Đã đóng
  ARCHIVED  // Lưu trữ
}
```

---

## 2. QUIZ SERVICE (src/services/quizService.ts)

### 2.1 Interface Định nghĩa

```typescript
export interface QuizQuestion {
  id: string;
  questionText: string;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
  }>;
  order: number;
}

export interface Quiz {
  id: string;
  title?: string;
  questions: QuizQuestion[];
  blockId?: string;
  order?: number;
}
```

### 2.2 Các Functions

| Function | Mô tả | HTTP Method |
|----------|--------|-------------|
| `getAllQuizzes()` | Lấy tất cả quizzes | GET /api/quiz |
| `getQuizById(quizId)` | Lấy quiz theo ID | GET /api/quiz/{id} |
| `createQuiz(data)` | Tạo quiz mới | POST /api/quiz |
| `updateQuiz(quizId, data)` | Cập nhật quiz | PUT /api/quiz/{id} |
| `deleteQuiz(quizId)` | Xóa quiz | DELETE /api/quiz/{id} |

---

## 3. MAGIC QUIZ BUILDER (src/components/editor/MagicQuizBuilder.tsx)

### 3.1 Tính năng chính

Component này cho phép giáo viên tạo bộ câu hỏi với giao diện trực quan:

#### Các loại câu hỏi hỗ trợ:

| Loại | Mô tả | Icon | Màu sắc |
|------|--------|------|----------|
| **SINGLE** | Trắc nghiệm 1 đáp án | ✓ | Blue |
| **MULTIPLE** | Trắc nghiệm nhiều đáp án | ☐ | Indigo |
| **TRUE_FALSE** | Đúng / Sai | ↔ | Emerald |
| **ESSAY** | Tự luận | ≡ | Amber |

### 3.2 Quy trình tạo Quiz

1. **Nhập tiêu đề** - Tên bộ câu hỏi (tùy chọn)
2. **Thêm câu hỏi** - Chọn loại câu hỏi
3. **Nhập nội dung** - Text câu hỏi + các đáp án
4. **Đánh dấu đáp án đúng** - Click vào đáp án đúng
5. **Thêm giải thích** - Giải thích đáp án (hiển thị sau khi nộp)
6. **Lưu bộ câu hỏi** - Gọi API POST /api/quiz

### 3.3 Validation Rules

```typescript
const validate = (): string | null => {
  if (!questions.length) return "Vui lòng thêm ít nhất một câu hỏi";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.questionText.trim()) return `Câu ${i + 1}: Chưa nhập nội dung câu hỏi`;
    if (q.questionType !== "ESSAY") {
      const filled = q.options.filter((o) => o.optionText.trim());
      if (filled.length < 2) return `Câu ${i + 1}: Cần ít nhất 2 đáp án`;
      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect) return `Câu ${i + 1}: Chưa chọn đáp án đúng`;
    }
  }
  return null;
};
```

### 3.4 Tính năng nhập hàng loạt (Bulk Import)

Định dạng: `Câu hỏi | Đáp án 1 | Đáp án 2 ...` (mỗi câu 1 dòng)

Ví dụ:
```
Thủ đô Việt Nam là gì? | Hà Nội | TP.HCM | Đà Nẵng
Trái đất quay quanh mặt trời | Đúng | Sai
```

---

## 4. QUIZ VIEWER (src/components/editor/QuizViewer.tsx)

### 4.1 Props

```typescript
interface QuizViewerProps {
  quiz: Quiz;
  readOnly?: boolean;        // Chỉ xem, không cho làm bài
  isTeacher?: boolean;       // Chế độ giáo viên
  isOverlay?: boolean;       // Hiển thị overlay
  overlayOpacity?: number;   // Độ mờ overlay
  onSubmitted?: (allCorrect: boolean) => void;  // Callback khi nộp bài
  onReset?: () => void;      // Callback khi làm lại
}
```

### 4.2 Logic chấm điểm

```typescript
const isQuestionCorrect = (q: Question) => {
  const type = getQuizType(q);
  if (type === "ESSAY") return true;  // Tự luận luôn đúng cho gating
  const sel = selectedAnswers[q.id] || [];
  const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
  return sel.length === correct.length && sel.every((id) => correct.includes(id));
};

const totalGradable = quiz.questions.filter((q) => getQuizType(q) !== "ESSAY").length;
const score = quiz.questions.filter((q) => isQuestionCorrect(q)).length;
const scorePercent = totalGradable > 0 ? Math.round((score / totalGradable) * 100) : 0;
```

### 4.3 Hiển thị kết quả

- **Điểm phần trăm** - Hiển thị badge với màu sắc theo điểm
- **Xuất sắc** (≥70%): Green
- **Khá tốt** (≥40%): Yellow  
- **Cần cố gắng** (<40%): Red
- **Giải thích đáp án** - Hiển thị nếu có
- **Đáp án gợi ý** - Cho câu hỏi tự luận

---

## 5. STUDENT EXAMS PAGE (src/components/student/StudentExamsPage.tsx)

### 5.1 Tính năng

Trang tổng hợp bài kiểm tra cho học sinh:

1. **Điểm trung bình có hệ số**
   - Công thức: `(Σ điểm × hệ số) / (Σ hệ số)`
   - Hệ số: ORAL=1, QUIZ15=1, PERIOD=2

2. **Danh sách bài kiểm tra**
   - Trạng thái: Đang mở / Đã nộp / Sắp tới
   - Loại: Miệng / 15 phút / 1 tiết
   - Điểm số (nếu đã làm)
   - Nút "Làm bài" hoặc "Xem lại"

3. **Mở khóa xem lại**
   - `reviewUnlocksAt` - Thời điểm mở khóa
   - Nếu chưa mở → Hiển thị "🔒 Xem lại"

### 5.2 Logic tính điểm

```typescript
const KIND_COEF: Record<ExamKind, number> = { ORAL: 1, QUIZ15: 1, PERIOD: 2 };

const scoreMap = doneExams.map(e => {
  const coef = KIND_COEF[e.examKind] ?? 1;
  const score10 = ((e.score ?? 0) / (e.maxScore ?? 1)) * 10;
  return { ...e, score10: Math.round(score10 * 100) / 100, coef };
});

const totalCoef = scoreMap.reduce((s, e) => s + e.coef, 0);
const weightedSum = scoreMap.reduce((s, e) => s + e.score10 * e.coef, 0);
const weightedAvg = totalCoef > 0 ? Math.round((weightedSum / totalCoef) * 100) / 100 : null;
```

---

## 6. QUESTION BANK PAGE (src/components/teacher/QuestionBankPage.tsx)

### 6.1 Tính năng chính

Trang quản lý ngân hàng câu hỏi cho giáo viên:

1. **Thống kê theo độ khó**
   - Dễ (EASY): Green
   - Trung bình (MEDIUM): Yellow
   - Khó (HARD): Red

2. **Bộ lọc**
   - Ngân hàng đề
   - Loại câu hỏi (MCQ / TF / ESSAY)
   - Độ khó
   - Tìm kiếm text

3. **Chọn câu hỏi tạo đề**
   - Click checkbox để chọn
   - Hiển thị số lượng đã chọn
   - Nút "Tạo đề từ đây"

4. **Import đề Word**
   - Upload file Word
   - Hệ thống parse → tạo ExamBank + BankQuestion

### 6.2 Giao diện

- Dark theme (#070F1D background)
- Card-based UI
- Responsive design
- Animations (fadeUp, spin)

---

## 7. EXAM ANSWER INFERENCE (src/utils/exam-answer-inference.ts)

### 7.1 Các hàm hỗ trợ

```typescript
// Kiểm tra token gạch chân
export function hasUnderlinedToken(text: string): boolean {
  return /\[\[UL\]\].*?\[\[\/UL\]\]/i.test(text);
}

// Xóa parser tokens
export function stripParserTokens(text: string): string {
  return text
    .replace(/\{\{IMG:\d+\}\}/g, '')
    .replace(/\[\[UL\]\]|\[\[\/UL\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Suy luận đáp án MCQ từ gạch chân
export function inferMcqAnswerFromUnderline(options: string[]): string {
  const indexes = options
    .map((opt, idx) => ({ idx, underlined: hasUnderlinedToken(opt) }))
    .filter((x) => x.underlined)
    .map((x) => x.idx);
  
  if (indexes.length === 1) return String.fromCharCode(65 + indexes[0]);
  return '';
}

// Suy luận đáp án Đúng/Sai từ gạch chân
export function inferTF4AnswersFromUnderline(subItems: TF4SubItem[]): TF4SubItem[] {
  return subItems.map((s) => ({
    ...s,
    answer: s.answer || (s.isUnderlined ? 'Đúng' : 'Sai'),
  }));
}

// Format chuỗi đáp án Đúng/Sai
export function formatTF4AnswerString(subItems: TF4SubItem[]): string {
  return subItems
    .map((s) => `${s.label}-${s.answer === 'Đúng' ? 'Đ' : 'S'}`)
    .join(' ');
}
```

### 7.2 Ứng dụng

Các hàm này được sử dụng khi parse file Word:
1. Phát hiện đáp án được gạch chân trong file
2. Tự động suy luận đáp án đúng
3. Format lại đáp án để lưu vào database

---

## 8. API ROUTES

### 8.1 Quiz Questions API (src/app/api/quiz/questions/route.ts)

#### POST - Tạo câu hỏi mới
```typescript
// Request body
{
  quizId: string;
  questionText: string;
  questionType: string;  // "multiple" | "true_false" | "essay"
  order: number;
  options: Array<{
    optionText: string;
    isCorrect: boolean;
  }>;
}

// Response
{
  id: string;
  quizId: string;
  questionText: string;
  questionType: string;
  order: number;
  options: QuestionOption[];
}
```

#### PUT - Cập nhật câu hỏi
```typescript
// Query param: ?id={questionId}
// Request body: Same as POST but all fields optional
```

#### DELETE - Xóa câu hỏi
```typescript
// Query param: ?id={questionId}
// Response: { success: true }
```

---

## 9. LUỒNG HOẠT ĐỘNG HỆ THỐNG

### 9.1 Giáo viên tạo đề

```
1. Upload file Word → Parse → Tạo ExamBank + BankQuestion
2. Hoặc: Tạo thủ công trong QuestionBankPage
3. Chọn câu hỏi từ ngân hàng
4. Nhập thông tin đề (tiêu đề, môn học, thời gian)
5. Hệ thống tạo Exam + ExamItem (snapshot câu hỏi)
6. Mở đề (status: OPEN) → Học sinh có thể làm bài
```

### 9.2 Học sinh làm bài

```
1. Vào StudentExamsPage → Xem danh sách đề đang mở
2. Click "Làm bài" → Vào trang làm bài
3. Trả lời câu hỏi (trắc nghiệm / tự luận)
4. Click "Kiểm tra đáp án"
5. Hệ thống chấm điểm tự động (trắc nghiệm)
6. Hiển thị kết quả + giải thích
7. Giáo viên chấm điểm tự luận (nếu có)
```

### 9.3 Chấm điểm tự động

```typescript
// Cho mỗi câu hỏi trắc nghiệm:
const isCorrect = 
  selectedOptions.length === correctOptions.length &&
  selectedOptions.every(id => correctOptions.includes(id));

// Tính điểm:
const score = questions.filter(q => isCorrect(q)).length;
const maxScore = questions.length;
const percentage = (score / maxScore) * 100;
```

---

## 10. TÍNH NĂNG NỔI BẬT

### 10.1 Hỗ trợ LaTeX
- Câu hỏi có thể chứa công thức toán học: `$...$`
- Sử dụng component `LaTeXRenderer` để render

### 10.2 Trộn câu hỏi
- `shuffleOptions: Boolean` - Trộn thứ tự đáp án
- `variantCount: Int` - Tạo nhiều mã đề

### 10.3 Hệ số điểm
- Kiểm tra miệng (ORAL): hệ số 1
- Kiểm tra 15 phút (QUIZ15): hệ số 1
- Kiểm tra 1 tiết (PERIOD): hệ số 2

### 10.4 Mở khóa xem lại
- `reviewUnlocksAt` - Thời điểm mở khóa
- Học sinh chỉ xem lại được sau khi mở khóa

### 10.5 Phản hồi giáo viên
- `teacherFeedback` - Nhận xét của giáo viên
- `gradedBy` - Người chấm
- `gradedAt` - Thời điểm chấm

---

## 11. CÔNG NGHỆ SỬ DỤNG

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Next.js | 14+ | Framework React |
| TypeScript | 5+ | Type safety |
| Prisma | 5+ | ORM Database |
| SQLite | - | Database (development) |
| Tailwind CSS | 3+ | Styling |
| Lucide React | - | Icons |
| React Hot Toast | - | Notifications |
| Zod | - | Validation |

---

## 12. KẾT LUẬN

Hệ thống tạo đề kiểm tra được thiết kế với kiến trúc module hóa, dễ mở rộng:

1. **Database Schema** - Thiết kế linh hoạt, hỗ trợ nhiều loại câu hỏi
2. **API Layer** - RESTful API với validation chặt chẽ
3. **UI Components** - Giao diện thân thiện, responsive
4. **Business Logic** - Xử lý chấm điểm tự động, tính điểm có hệ số

Hệ thống đáp ứng đầy đủ nhu cầu của giáo viên và học sinh trong việc tạo và làm bài kiểm tra trực tuyến.