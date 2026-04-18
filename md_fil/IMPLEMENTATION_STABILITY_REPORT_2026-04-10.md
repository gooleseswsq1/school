# Bao Cao Trien Khai Day Du Va On Dinh

Ngay cap nhat: 2026-04-10

## 1) Muc tieu da trien khai

Theo yeu cau, da trien khai tron goi cac hang muc:

1. On dinh he thong dang nhap va ket noi Prisma.
2. Hoan thien luong giao vien nhan loi moi hoc sinh theo lop (giam loi pool va loi engine).
3. Sua du lieu dashboard chinh cua giao vien de hien thi dung so bai giang.
4. Xay dung thu vien 2 che do:
   - Cong khai: moi hoc sinh co tai khoan deu xem duoc.
   - Rieng theo lop: chi hoc sinh lien ket dung lop moi xem duoc.
5. Viet va ap migration de DB khop voi code moi.

---

## 2) Cac thay doi ky thuat da ap dung

### 2.1 Auth va Refresh Token

- Da tao bang `RefreshToken` bang migration va da deploy len Postgres.
- Da bo sung fallback trong login de neu thieu bang thi khong lam sap login request.

Tac dong:
- Khong con loi `P2021` do thieu bang `public.RefreshToken`.

### 2.2 On dinh Prisma connection

Da chuyen cac route nhay cam tu `new PrismaClient()` + `$disconnect()` moi request sang singleton `prisma`:

- `src/app/api/teacher/student-requests/route.ts`
- `src/app/api/student/progress/route.ts`
- `src/app/api/teacher/submissions/stats/route.ts`

Tac dong:
- Giam xac suat timeout pool, giam loi engine empty response.
- Tang do on dinh khi tai dong thoi cao.

### 2.3 Sua du lieu dashboard chinh cua giao vien

Da sua route stats chinh de dashboard giao vien hien thi dung so lieu:

- So bai giang khong con bi gioi han sai theo dieu kien `isPublished = true`.
- Gia tri `0` khong con bi render thanh `--` do su dung toan tu fallback sai.
- Da go bo khoi thong ke bai giang theo mon khoi giao dien dashboard chinh de tranh gay roi va tranh lam sai nhan thuc du lieu.

Tac dong:
- So bai giang o dashboard chinh khop hon voi du lieu thuc te cua giao vien.
- Khong con truong hop co du lieu nhung giao dien hien `--`.

### 2.4 Thu vien cong khai va thu vien rieng theo lop

Da bo sung cac truong moi cho `LibraryFile`:

- `visibility` (`PUBLIC` | `CLASS`)
- `classId` (nullable)

Da cap nhat API thu vien:

- `src/app/api/teacher/library/route.ts`
  - Teacher co the upload theo che do `PUBLIC` hoac `CLASS`.
  - Student doc thu vien theo quy tac:
    - Luon thay tai lieu `PUBLIC`.
    - Tai lieu `CLASS` chi thay khi co lien ket accepted hop le voi giao vien/lop.

Da cap nhat API comment thu vien:

- `src/app/api/teacher/library/comments/route.ts`
  - Them check quyen truy cap truoc khi xem/ghi comment (dac biet voi role STUDENT).

Da cap nhat UI:

- `src/components/teacher/TeacherMainDashboard.tsx`
  - Form upload thu vien co chon che do chia se.
  - Neu chon rieng lop thi co chon lop muc tieu.
- `src/components/student/StudentLibraryViewer.tsx`
  - Hien thi thong tin phan loai cong khai/rieng lop.
  - Goi comments kem `viewerId` de backend xac thuc quyen.

---

## 3) Migration da tao va da deploy thanh cong

Da tao va deploy thanh cong cac migration sau:

1. `20260410101000_add_refresh_token_table`
2. `20260410103500_library_visibility_modes`
3. `20260410105000_add_page_subject`

Lenh da chay:

- `npx prisma migrate deploy`
- `npx prisma generate`

Trang thai:
- Thanh cong 100% (khong loi).

---

## 4) Kiem tra on dinh da thuc hien

Da kiem tra compile errors cac file chinh sau khi sua:

- `src/app/api/teacher/library/route.ts`
- `src/app/api/teacher/library/comments/route.ts`
- `src/components/student/StudentLibraryViewer.tsx`
- `src/components/teacher/TeacherMainDashboard.tsx`
- `src/app/api/pages/route.ts`
- `src/app/api/pages/[id]/route.ts`
- `src/app/api/teacher/submissions/stats/route.ts`

Ket qua:
- Khong con compile error o cac file da cap nhat.

---

## 5) Checklist van hanh de dam bao on dinh

### Bat buoc truoc khi chay production

1. Dam bao `DATABASE_URL` dang tro den Postgres hop le.
2. Chay migration deploy tren moi moi truong (staging/prod).
3. Chay `prisma generate` sau khi cap nhat schema.
4. Khoi dong lai app worker/server de nap Prisma Client moi.

### Smoke test de xac nhan tinh nang

1. Dang nhap teacher/student khong con loi refresh token.
2. Teacher upload 1 tai lieu cong khai -> student bat ky xem duoc.
3. Teacher upload 1 tai lieu rieng lop A -> chi hoc sinh lop A xem duoc.
4. Student khong thuoc lop khong comment duoc tai lieu rieng lop.
5. Dashboard giao vien hien dung so bai giang va khong hien `--` khi gia tri bang 0.
6. Trang quan ly loi moi hoc sinh khong loi 500 ngat quang do pool.

---

## 6) Ghi chu bao tri

1. Field `visibility` hien dung dang string (`PUBLIC` | `CLASS`) de de migration va rollout.
2. Neu can mo rong quy tac (vd `SCHOOL`) co the nang cap thanh enum rieng cho Library.
3. Neu can bo sung bao mat manh hon, co the thay co che truyen `authorId/viewerId` bang token auth server-side tuyet doi.

---

## 7) Ket luan

Da trien khai day du cac hang muc da de xuat va da dua he thong ve trang thai on dinh hon:

- Het loi bang `RefreshToken`.
- Giam ro ret nguy co loi ket noi Prisma do tao client theo request.
- Da sua dashboard giao vien de hien thi dung so bai giang chinh.
- Thu vien da ho tro 2 che do cong khai va rieng theo lop dung nhu yeu cau.

He thong san sang cho giai doan test nghiem thu UAT.
