# 📋 Setup Guide - Authentication & Activation Code System

## 🗄️ Database Setup

### ✅ Already Set Up!
The project now uses **SQLite** for development, which requires **zero external setup**!

The database file is located at: `prisma/dev.db`

No PostgreSQL installation needed - everything works out of the box.

---

## 👥 User Roles

### 1. **ADMIN** (Giáo viên / Admin)
- Access: `/admin` - Control panel
- Can generate activation codes
- Can view code usage statistics
- Password: `01223715643`
- Email: `admin@school.com`

### 2. **TEACHER** (Giáo viên)
- Access: `/teacher/documents` - Document management
- Can generate activation codes
- Can upload and manage documents

### 3. **STUDENT** (Học sinh)
- Requires activation code to register
- Access: `/student/library` - Document library
- Can view documents
- Account starts as inactive until code is used

---

## 🔑 Activation Code System

### How It Works
1. **Code Generation** (Admin/Teacher)
   - Go to `/admin` dashboard
   - Click "Tạo mã" (Create Code)
   - Share the generated code with students

2. **Code Format**
   - 10 alphanumeric characters (e.g., `ABC123XYZ9`)
   - Expires after 30 days
   - One-time use

3. **Student Registration**
   - Go to `/auth/register`
   - Select role as "Học sinh" (Student)
   - Enter the activation code
   - Upon successful registration, account is activated

---

## 🔐 Authentication Flow

### Registration (`/auth/register`)
- **For Teachers**: No activation code needed
- **For Students**: Must provide valid activation code
- Password hashing: bcryptjs
- User data saved to database

### Login (`/auth/login`)
- Email and password validation
- Account status check
- Automatic role-based redirect:
  - Teachers → `/teacher/documents`
  - Students → `/student/library`
  - Admins → `/teacher/documents`

---

## 📂 Key Files

### Backend APIs
- `/src/app/api/auth/register/route.ts` - Registration endpoint
- `/src/app/api/auth/login/route.ts` - Login endpoint
- `/src/app/api/admin/codes/route.ts` - Code generation & listing

### Frontend Components
- `/src/components/auth/RegisterForm.tsx` - Registration form
- `/src/components/auth/LoginForm.tsx` - Login form
- `/src/components/admin/CodeGenerationPanel.tsx` - Admin code dashboard

### Pages
- `/src/app/auth/register/page.tsx` - Registration page
- `/src/app/auth/login/page.tsx` - Login page
- `/src/app/admin/page.tsx` - Admin dashboard

### Database
- `/prisma/schema.prisma` - Database schema
- `/prisma/seed.ts` - Database seed script

---

## 🚀 Quick Start (Ready to Use!)

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   Server runs at: `http://localhost:3000`

2. **Admin Account (Already Created!)**
   - Email: `admin@school.com`
   - Password: `01223715643`
   - Go to: `http://localhost:3000/auth/login`

3. **Generate First Activation Code**
   - After login, go to `/admin` dashboard
   - Click "Tạo mã" button
   - Share the code with students

4. **Student Registration**
   - Go to `http://localhost:3000/auth/register`
   - Select "Học sinh" (Student) role
   - Enter the activation code you created
   - Account is activated automatically

---

## 🔐 Security Notes

- Passwords are hashed with bcryptjs (10 salt rounds)
- Activation codes are random 10-character alphanumeric strings
- Codes expire after 30 days
- Codes can only be used once
- Student accounts are inactive until code is used

---

## 📊 Admin Dashboard Features

✅ Create activation codes
✅ View all codes and their status
✅ See which codes are used/unused
✅ See code expiration dates
✅ Copy codes with one click
✅ Responsive design matching main site theme

---

## 🛠️ Troubleshooting

### Dev Server Not Starting
```bash
# Kill any lingering node processes
Get-Process node | Stop-Process -Force

# Remove lock file
Remove-Item -Path ".\.next\dev\lock" -Force

# Start fresh
npm run dev
```

### Prisma Client Error
```bash
# Regenerate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate dev
```

### Reset Database
```bash
# Delete the database file to start fresh
Remove-Item -Path ".\prisma\dev.db" -Force

# Recreate database with migrations
npx prisma migrate dev

# Reseed with admin account
node prisma/seed.js
```

---

## 📝 Environment Variables

```env
# SQLite Database (already configured)
DATABASE_URL="file:./prisma/dev.db"

# API Configuration
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

Note: For production, update to use PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/document_storage"
```
Then update `prisma/schema.prisma` provider from `sqlite` to `postgresql`.

---

## ✨ Next Steps

After completing setup:
1. Create teacher accounts
2. Generate activation codes for students
3. Share codes with students
4. Students register with codes
5. Students access library
6. Teachers upload documents
