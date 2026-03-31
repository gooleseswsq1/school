# 🎯 QUICK START: 30-Minute Deployment

**Cho những ai muốn deploy NGAY VÀ LIỀN!**

---

## ⚡ 3 Bước Chính (30 phút)

### 1️⃣ Create Neon Database (5 phút)
```bash
1. https://neon.tech → Sign up with GitHub
2. Create project → "pentaschool"
3. Copy connection string
4. Example: postgresql://user:pass@ep-xxxxx.neon.tech/pentaschool?sslmode=require
```

### 2️⃣ Setup Vercel (10 phút)
```bash
1. https://vercel.com → Sign up with GitHub
2. Add project → Select your repo
3. Settings → Environment Variables
4. Add: DATABASE_URL=[string từ bước 1]
5. Add: JWT_SECRET=[generate bằng PowerShell dưới]
6. Click Deploy
```

**Generate JWT_SECRET** (Windows PowerShell):
```powershell
$bytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
# Copy output!
```

### 3️⃣ Test & Verify (5 phút)
```bash
# Wait for green deployment ✅
# Test: curl https://your-app.vercel.app/api/health
# Expected: "status": "healthy"
```

---

## 📚 Full Documentation

Các hướng dẫn chi tiết ở các file này:

| File | Mục Đích | Đọc khi |
|------|---------|--------|
| **DEPLOYMENT_GUIDE.md** | Chi tiết mọi bước | Cần thông tin đầy đủ |
| **DEPLOYMENT_CHECKLIST.md** | Checklist từng bước | Đang triển khai |
| **DATABASE_MIGRATION_GUIDE.md** | Hiểu về DB setup | Muốn hiểu tại sao setup như vậy |
| **This file** | Nhanh & gọn | Chỉ muốn deploy |

---

## 🔗 Important Links

- Neon: https://neon.tech
- Vercel: https://vercel.com
- GitHub: https://github.com
- UploadThing: https://uploadthing.com (cho file uploads)

---

## ✅ Success Criteria

Bạn thành công khi:
```
✅ Vercel deployment status = Green
✅ curl https://your-app.vercel.app/api/health → "status": "healthy"
✅ Website loads
✅ Can login
```

---

## 🆘 If Something Goes Wrong

| Error | Fix |
|-------|-----|
| "Build failed" | Check Vercel logs, ensure all env vars set |
| "Database error" | Check DATABASE_URL in Vercel |
| "ssl error" | Add `?sslmode=require` to DATABASE_URL |
| "API not found" | Wait 2 minutes, refresh, or redeploy |

---

**Ready? Follow DEPLOYMENT_CHECKLIST.md step by step!** 🚀
