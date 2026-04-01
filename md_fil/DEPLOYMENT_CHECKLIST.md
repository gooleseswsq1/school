# ✅ Deployment Checklist - Step by Step

**Ngày**: March 31, 2026  
**Ứng Dụng**: PentaSchool  
**Platform**: Vercel + Neon PostgreSQL

---

## PHẦN 1️⃣: CÀI ĐẶT NEON DATABASE (20 phút)

### Bước 1: Tạo Neon Account
- [ ] Truy cập https://neon.tech
- [ ] Click "Sign Up" → Đăng ký bằng GitHub
- [ ] Verify email
- [ ] Tạo project: "pentaschool-prod"

### Bước 2: Tạo Database
- [ ] Project name: `pentaschool`
- [ ] Region: `Singapore` (gần nhất)
- [ ] Compute type: `Shared (free)` cho lần đầu
- [ ] Click "Create Database"

### Bước 3: Lấy Connection String
- [ ] Neon sẽ hiển thị: `postgresql://user:password@ep-xxxxx.neon.tech/pentaschool`
- [ ] **LƯU NGAY** vào notepad tạm
- [ ] Thêm `?sslmode=require` vào cuối
- [ ] Final: `postgresql://user:password@ep-xxxxx.neon.tech/pentaschool?sslmode=require`

### Bước 4: Test Connection (Optional nhưng nên làm)
Mở Terminal PowerShell:
```powershell
# Cài psql (PostgreSQL client)
choco install postgresql

# Test kết nối
psql "postgresql://user:password@ep-xxxxx.neon.tech/pentaschool?sslmode=require"
```

✅ **Neon Setup Complete!**

---

## PHẦN 2️⃣: SETUP VERCEL PROJECT (15 phút)

### Bước 1: Tạo Vercel Account
- [ ] Truy cập https://vercel.com
- [ ] Click "Sign Up"
- [ ] **Chọn: "Continue with GitHub"**
- [ ] Ủy quyền GitHub
- [ ] Verify email

### Bước 2: Import GitHub Repository
- [ ] Dashboard → "Add New..." → "Project"
- [ ] Chọn repository: `school` (hoặc tên repo của bạn)
- [ ] Click "Import"

### Bước 3: Configure Build & Dev Settings
- [ ] **Framework Preset**: `Next.js` (auto-detected)
- [ ] **Build Command**: `npm run vercel-build`
- [ ] **Output Directory**: `.next`
- [ ] **Install Command**: `npm install`
- [ ] Click "Deploy"

⏳ **Vercel sẽ deploy lần đầu** (~2-3 phút)  
❌ **Nó sẽ fail vì thiếu environment variables** - đó là normal!

### Bước 4: Add Environment Variables
Trong Vercel Dashboard:
1. Project → **Settings** → **Environment Variables**
2. Thêm các biến sau:

| Variable | Giá Trị | Scope |
|----------|--------|-------|
| `DATABASE_URL` | `postgresql://user:pass@ep-xxxxx.neon.tech/pentaschool?sslmode=require` | Production |
| `JWT_SECRET` | *[Tạo mới bên dưới]* | Production |
| `NEXT_PUBLIC_UPLOADTHING_API_KEY` | *[Từ uploadthing.com]* | Production |
| `UPLOADTHING_SECRET` | *[Từ uploadthing.com]* | Production |
| `NEXT_PUBLIC_API_URL` | `https://your-app.vercel.app` | Production |
| `NODE_ENV` | `production` | Production |

### Bước 5: Generate JWT_SECRET
Mở Windows PowerShell và chạy:
```powershell
# Cách 1: Dùng .NET
$bytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Copy output → Paste vào Vercel dashboard
```

### Bước 6: Redeploy
- [ ] Vercel → Deployments → "Redeploy"
- [ ] Chọn latest commit → "Redeploy"
- [ ] ⏳ Chờ ~2-3 phút

✅ **Deployment Should Now Succeed!**

---

## PHẦN 3️⃣: VERIFY DEPLOYMENT (10 phút)

### Bước 1: Check Vercel Deployment Status
- [ ] Dashboard → Deployments
- [ ] Status = **Green ✓** (not orange or red)
- [ ] Click vào deployment → "Domains"
- [ ] Ghi nhớ domain (VD: `pentaschool.vercel.app`)

### Bước 2: Test Health Endpoint
Mở browser hoặc Terminal:
```bash
curl https://pentaschool.vercel.app/api/health
```

Kỳ vọng output:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "responseTime": 45
  },
  "environment": "production"
}
```

### Bước 3: Chạy Verification Script
```bash
node scripts/verify-deployment.js https://pentaschool.vercel.app
```

### Bước 4: Manual Testing
- [ ] Truy cập homepage: https://pentaschool.vercel.app
- [ ] Tạo tài khoản (đăng ký)
- [ ] Đăng nhập
- [ ] Tạo / chỉnh sửa course
- [ ] Upload file / ảnh
- [ ] Test tất cả features chính

✅ **All Tests Passed!**

---

## PHẦN 4️⃣: SETUP MONITORING & ALERTS (10 phút) - TUỲ CHỌN

### Option A: Vercel Built-in Monitoring
- [ ] Vercel Dashboard → Analytics
- [ ] Xem realtime performance metrics
- [ ] Check error rates

### Option B: Setup Cron Job for Health Checks
Tạo file `scripts/health-monitor.js`:
```javascript
// Runs every 5 minutes to check /api/health
// If fails 3x consecutive → Send alert
```

### Option C: Setup Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
```

---

## PHẦN 5️⃣: PRODUCTION MAINTENANCE (Ongoing)

### Daily
- [ ] Check Vercel dashboard for errors
- [ ] Review /api/health status

### Weekly
- [ ] Check database size (Neon console)
- [ ] Review error logs
- [ ] Verify page load times

### Monthly
- [ ] Backup database manually:
```bash
pg_dump postgresql://... > backup_$(date +%Y%m%d).sql
```
- [ ] Review & rotate secrets if needed
- [ ] Check performance metrics

### Quarterly
- [ ] Update dependencies
- [ ] Security audit
- [ ] Database optimization

---

## ❌ COMMON ISSUES & FIXES

### Issue 1: "Build failed: Migration error"
```
Error: P3006 Migration file is too old...
```

**Fix**:
```bash
# Locally:
prisma migrate reset (dev only)
npm run vercel-build
git push
# Vercel redeploy
```

### Issue 2: "DATABASE_URL is not set"
```
Error: DATABASE_URL environment variable not set
```

**Fix**:
- Vercel Dashboard → Environment Variables
- Make sure scope is "Production"
- Redeploy

### Issue 3: "SSL connection error"
```
Error: server does not support SSL
```

**Fix**:
- Check DATABASE_URL has `?sslmode=require`
- Test connection: `psql "connection-string-here"`

### Issue 4: "Connection timeout"
```
Error: connect ETIMEDOUT
```

**Fix**:
- Neon → IP Whitelist → Allow all
- Or add Vercel IP: `76.75.27.0/24`

### Issue 5: "File upload fails"
```
Error: UploadThing API key invalid
```

**Fix**:
- Create account: https://uploadthing.com
- Get API key
- Add to Vercel Environment Variables

---

## 🎉 SUCCESS CHECKLIST

Bạn đã thành công nếu:
- [ ] ✅ Vercel deployment status = Green
- [ ] ✅ `/api/health` returns `"status": "healthy"`
- [ ] ✅ Homepage loads in < 3 seconds
- [ ] ✅ Can login/create account
- [ ] ✅ Database queries work (~50ms response time)
- [ ] ✅ File uploads work
- [ ] ✅ No errors in console/logs
- [ ] ✅ HTTPS certificate valid (lock icon in browser)

---

## 📞 SUPPORT

**Neon Issues**: support@neon.tech  
**Vercel Issues**: Help → support@vercel.com  
**UploadThing**: support@uploadthing.com  

---

## 📊 BEFORE & AFTER COMPARISON

| Aspect | Before (Dev) | After (Production) |
|--------|-------------|-------------------|
| Database | SQLite file | PostgreSQL (Neon) |
| Hosting | Local machine | Vercel (Global CDN) |
| HTTPS | ❌ No | ✅ Yes |
| Uptime | ~60% | 99.95% |
| Scalability | Limited | Unlimited |
| SSL Certificate | ❌ No | ✅ Auto-managed |
| Monitoring | ❌ None | ✅ Vercel built-in |
| Backups | Manual | Automatic daily |
| Response Time | 500-1000ms | 100-200ms |

---

**🎊 Congratulations! Your app is now production-ready! 🎊**

Next phase: Collect user feedback & iterate! 🚀
