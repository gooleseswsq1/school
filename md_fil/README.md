# Hệ thống lưu trữ tài liệu học tập

Một ứng dụng web hiện đại cho phép giáo viên tải lên và học sinh truy cập tài liệu học tập (Video, PowerPoint, Word).

## Công nghệ sử dụng

- **Frontend Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **Authentication**: JWT (để triển khai)
- **File Storage**: UploadThing (cấu hình)

## Cấu trúc dự án

```
src/
├── app/
│   ├── (auth)/              # Nhóm route xác thực
│   │   ├── login/           # Trang đăng nhập
│   │   └── register/        # Trang đăng ký
│   ├── dashboard/           # Bảng điều khiển chính
│   ├── teacher/             # Tính năng giáo viên
│   │   ├── upload/          # Tải tài liệu lên
│   │   └── documents/       # Quản lý tài liệu
│   ├── student/             # Tính năng học sinh
│   │   └── library/         # Thư viện tài liệu
│   └── api/                 # API endpoints
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── shared/              # Header, Footer, Sidebar chia sẻ
│   ├── upload/              # Components xử lý upload
│   └── cards/               # Card hiển thị tài liệu
├── lib/
│   ├── prisma.ts           # Cấu hình Prisma client
│   ├── utils.ts            # Hàm tiện ích
│   ├── db.ts               # Cấu hình database
│   └── uploadthing.ts      # Cấu hình UploadThing
├── types/
│   └── index.ts            # TypeScript type definitions
├── hooks/                   # Custom React hooks
├── services/
│   ├── userService.ts      # Logic xác thực & quản lý người dùng
│   └── documentService.ts  # Logic quản lý tài liệu
└── prisma/
    └── schema.prisma       # Database schema
```

## Bắt đầu

### Điều kiện tiên quyết

- Node.js 18+ và npm
- PostgreSQL database
- UploadThing account (tùy chọn)

### Cài đặt

1. **Clone dự án và cài đặt dependencies**:
```bash
npm install
```

2. **Cấu hình biến môi trường**:
```bash
cp .env.example .env.local
# Chỉnh sửa .env.local với cấu hình của bạn
```

3. **Thiết lập database**:
```bash
npx prisma migrate dev --name init
```

4. **Tạo file schema Prisma client**:
```bash
npx prisma generate
```

5. **Chạy ứng dụng**:
```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) trong trình duyệt.

## Database Schema

### Bảng User
- `id`: Mã định danh duy nhất
- `email`: Email (duy nhất)
- `name`: Tên người dùng
- `password`: Mật khẩu (hashed)
- `role`: Vai trò (TEACHER, STUDENT)
- `createdAt`: Thời gian tạo
- `updatedAt`: Thời gian cập nhật

### Bảng Document
- `id`: Mã định danh duy nhất
- `title`: Tiêu đề tài liệu
- `description`: Mô tả
- `fileUrl`: URL file được lưu trữ
- `fileType`: Loại file (VIDEO, POWERPOINT, WORD, PDF, OTHER)
- `fileSize`: Kích thước file (bytes)
- `authorId`: ID giáo viên (khóa ngoài)
- `createdAt`: Thời gian tạo
- `updatedAt`: Thời gian cập nhật

## API Endpoints (sẽ triển khai)

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Documents
- `GET /api/documents` - Lấy tất cả tài liệu
- `GET /api/documents/:id` - Lấy chi tiết tài liệu
- `POST /api/documents` - Tạo tài liệu (giáo viên)
- `PUT /api/documents/:id` - Cập nhật tài liệu (giáo viên)
- `DELETE /api/documents/:id` - Xóa tài liệu (giáo viên)

### Users
- `GET /api/users` - Lấy danh sách người dùng (admin)
- `GET /api/users/:id` - Lấy thông tin người dùng

## Scripts

```bash
# Phát triển
npm run dev

# Build
npm run build

# Production
npm start

# Prisma
npx prisma studio      # Mở Prisma Studio
npx prisma migrate dev # Tạo migration
npx prisma generate   # Tạo Prisma client
```

## Tính năng sẽ triển khai

- [x] Cấu trúc project & folder
- [x] Database schema
- [ ] Authentication system (Login/Register)
- [ ] File upload functionality
- [ ] Document listing & filtering
- [ ] User profile management
- [ ] Search functionality
- [ ] Responsive UI with shadcn/ui
- [ ] Download documents
- [ ] Document sharing

## Contribute

Các đóng góp được chào đón! Vui lòng tạo pull request với các cải tiến của bạn.

## License

MIT License

## Contact

Liên hệ với chúng tôi tại: support@example.com
