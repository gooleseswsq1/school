# 🚀 Hướng Dẫn Triển Khai PentaSchool

**Ngày tạo**: March 31, 2026  
**Trạng thái**: Production Ready  
**Phương pháp**: Vercel + Neon (PostgreSQL)

---

## 📋 Tóm Tắt Nhanh (Quick Checklist)

- [ ] Database: Tạo Neon PostgreSQL instance
- [ ] Vercel: Connect GitHub repo
- [ ] Environment Variables: Cấu hình production secrets
- [ ] Build Test: Chạy `npm run build` locally
- [ ] Deploy: Push lên GitHub → Vercel auto-deploy
- [ ] SSL/HTTPS: Tự động từ Vercel
- [ ] Monitoring: Setup error tracking

---

## 🗄️ PHẦN 1: CHUẨN BỊ DATABASE (Neon PostgreSQL)

### Bước 1.1: Tạo Neon Account
1. Truy cập [neon.tech](https://neon.tech)
2. Đăng ký → Verify email
3. Tạo Project mới (VD: "pentaschool-prod")

### Bước 1.2: Tạo Database Instance
```
Database Name: pentaschool
Region: Nearest to users (Singapore/Tokyo)
Compute: Shared (free tier) or Dedicated (paid)
```

### Bước 1.3: Lấy Connection String
Sau khi tạo, Neon sẽ cấp connection string dạng:
```
postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/pentaschool
```

**⚠️ Lưu ý QUAN TRỌNG**:
- ✅ Thêm `?sslmode=require` để bảo mật
- ❌ KHÔNG chia sẻ string này lên GitHub
- 🔐 Lưu trong Vercel secrets, không trong .env

---

## 🌐 PHẦN 2: SETUP VERCEL DEPLOYMENT

### Bước 2.1: Kết Nối GitHub
1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub account: `gooleseswsq1`
3. Click **"Import Project"**
4. Chọn repository: `pentaschool` (hoặc tên repo của bạn)

### Bước 2.2: Cấu Hình Build Settings
```yaml
Framework: Next.js (auto-detected)
Build Command: npm run vercel-build
Output Directory: .next
Node.js Version: 20.x (recommended)
```

**Giải thích `npm run vercel-build`**:
```bash
"vercel-build": "prisma migrate deploy && npm run build"
```
- `prisma migrate deploy`: Apply database migrations trên server
- `npm run build`: Build Next.js application

### Bước 2.3: Thêm Environment Variables
Trong Vercel dashboard → Project settings → Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/pentaschool?sslmode=require

# API Configuration
NEXT_PUBLIC_API_URL=https://YOUR_VERCEL_DOMAIN.vercel.app

# JWT Secret (tạo mới, KHÔNG dùng dev key)
JWT_SECRET=your_super_secret_key_generated_with_openssl

# UploadThing for File Upload
NEXT_PUBLIC_UPLOADTHING_API_KEY=your_uploadthing_api_key
UPLOADTHING_SECRET=your_uploadthing_secret

# Node Environment
NODE_ENV=production
```

### Bước 2.4: Deploy Pertama
Sau khi cấu hình, click **Deploy**. Vercel sẽ:
1. Clone repository
2. Install dependencies
3. Chạy `npm run vercel-build`
4. Build Next.js
5. Deploy lên edge network

**Thời gian**: ~2-5 phút

---

## 🔐 PHẦN 3: BẢNG MO PRODUCTION SECRETS CHECKLIST

| Variable | Giá Trị | Độ Ưu Tiên | Ghi Chú |
|----------|--------|-----------|--------|
| `DATABASE_URL` | Neon connection string | 🔴 CRITICAL | Không hard-code! |
| `JWT_SECRET` | Tạo mới 32+ ký tự | 🔴 CRITICAL | `openssl rand -hex 16` |
| `UPLOADTHING_API_KEY` | Từ uploadthing.com | 🟡 HIGH | Cho file uploads |
| `UPLOADTHING_SECRET` | Từ uploadthing.com | 🟡 HIGH | Cho file uploads |
| `NEXT_PUBLIC_API_URL` | Vercel domain | 🟢 MEDIUM | Public-facing URL |
| `NODE_ENV` | production | 🟢 MEDIUM | Vercel auto-set |

### ⚠️ Cách Tạo JWT_SECRET Mạnh:
```bash
# Trên Windows PowerShell:
$bytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Hoặc dùng OpenSSL (nếu cài):
openssl rand -hex 32
```

---

## 📊 PHẦN 4: DATABASE MIGRATION STRATEGY

### Hiện Trạng:
- **Dev**: SQLite (`dev.db` file)
- **Prod**: PostgreSQL (via DATABASE_URL)

### Quy Trình An Toàn:

#### ✅ Bước 1: Test locally với PostgreSQL (tuỳ chọn)
```bash
# Cài Docker Desktop, rồi:
docker run --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres

# Cập nhật .env.local:
DATABASE_URL="postgresql://postgres:test@localhost:5432/pentaschool"

# Test migration:
npm run prisma:migrate
npm run dev
```

#### ✅ Bước 2: Deploy to Vercel
Vercel sẽ tự động chạy:
```bash
prisma migrate deploy
```

#### ✅ Bước 3: Verify Data
```bash
# SSH vào Neon console và check:
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Course";
```

### 🔄 Rollback Plan (nếu có lỗi):
```bash
# Quay lại migration trước:
prisma migrate resolve --rolled-back <migration_name>
```

---

## 🛡️ PHẦN 5: BẢOMINUSECURITY & BEST PRACTICES

### 1. HTTPS/SSL Configuration
✅ **Vercel**: Cấp SSL miễn phí mặc định
✅ **Database**: Neon bắt buộc SSL

Xác nhận trong DATABASE_URL:
```
?sslmode=require
```

### 2. Rate Limiting
```javascript
// api/middleware/rate-limit.ts (recommended thêm)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 h"),
});
```

### 3. CORS Configuration
```javascript
// next.config.ts
const nextConfig = {
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_API_URL },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};
```

### 4. Environment Variable Protection
❌ **KHÔNG làm**:
```bash
DATABASE_URL="postgresql://..." # ❌ Commit .env vào GitHub
console.log(DATABASE_URL)         # ❌ Log secrets
```

✅ **LÀM**:
```bash
# .env.local (git-ignored)
DATABASE_URL="..." # Only local

# Vercel Secrets (không visible)
DATABASE_URL=[hidden]
```

### 5. Backup Strategy
**Neon tự động**:
- Daily backups (default)
- Point-in-time recovery (14 ngày)
- Multi-region redundancy

**Manual backup** (nếu cần):
```bash
pg_dump postgresql://user:pass@host/db > backup.sql
```

---

## ⚡ PHẦN 6: PERFORMANCE OPTIMIZATION

### 1. Build Optimization
```json
// package.json (đã có)
"vercel-build": "prisma migrate deploy && npm run build",
```

### 2. Database Query Optimization
```typescript
// ✅ Tốt: Chỉ lấy fields cần thiết
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
});

// ❌ Xấu: Lấy tất cả fields
const user = await prisma.user.findUnique({ where: { id } });
```

### 3. Image Optimization
```typescript
// next/image component (Next.js tự optimize)
import Image from 'next/image';

<Image
  src="/icon.png"
  alt="Icon"
  width={200}
  height={200}
  priority // Cho LCP images
/>
```

### 4. Caching Strategy
```javascript
// API Route Caching
export async function GET(req: Request) {
  return Response.json({ data }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

---

## 📈 PHẦN 7: MONITORING & ERROR TRACKING

### 1. Vercel Analytics
```bash
npm install @vercel/analytics @vercel/web-vitals
```

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Error Tracking (Optional)
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 3. Database Query Monitoring
```typescript
// Enable Prisma logging
// .env.local
DATABASE_URL="..."
DEBUG="prisma:*" # Log queries (dev only)
```

---

## 🚨 PHẦN 8: COMMON ERRORS & FIXES

### Error 1: "Build failed: psycopg2 not found"
❌ **Nguyên nhân**: Python dependency issue  
✅ **Fix**: Xóa `node_modules`, `package-lock.json`, deploy lại

### Error 2: "DATABASE_URL not set"
❌ **Nguyên nhân**: Quên add environment variable  
✅ **Fix**: Vercel → Environment Variables → ADD DATABASE_URL

### Error 3: "Migration failed: relation does not exist"
❌ **Nguyên nhân**: Database chưa được initialized  
✅ **Fix**: 
```bash
# Vercel CLI local test
vercel env pull .env.local
npx prisma migrate deploy
```

### Error 4: "SSL error: server does not support SSL"
❌ **Nguyên nhân**: DATABASE_URL quên `?sslmode=require`  
✅ **Fix**: 
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Error 5: "Connection timeout"
❌ **Nguyên nhân**: Network/IP whitelist issue  
✅ **Fix**: 
- Neon: IP whitelist → Allow all (hoặc Vercel IP range)
- Check connection string
- Restart Vercel deployment

---

## 🎯 PHẦN 9: PRE-DEPLOYMENT CHECKLIST

### Code Quality
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → All pass
- [ ] `npm run build` → Success locally
- [ ] Không có `console.log(secrets)`

### Database
- [ ] Prisma schema validated
- [ ] Migrations reviewed
- [ ] Backup strategy enabled
- [ ] Connection string tested

### Security
- [ ] JWT_SECRET changed (32+ chars)
- [ ] UploadThing keys added
- [ ] CORS configured
- [ ] Rate limiting active

### Deployment Config
- [ ] Vercel project created
- [ ] GitHub connected
- [ ] Environment variables set
- [ ] Build command correct

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking setup
- [ ] Log aggregation ready

---

## 📖 PHẦN 10: POST-DEPLOYMENT STEPS

### 1. Verify Deployment
```bash
# Test API endpoint
curl https://YOUR_DOMAIN.vercel.app/api/health

# Check database connection
curl https://YOUR_DOMAIN.vercel.app/api/test-db
```

### 2. Set Custom Domain (tùy chọn)
Vercel → Project settings → Domains → Add custom domain

### 3. Configure CI/CD
```yaml
# .github/workflows/deploy.yml (auto by Vercel)
on: [push, pull_request]
# Vercel handles this automatically
```

### 4. Setup Alerts
Vercel → Project settings → Notifications:
- [ ] Build failures
- [ ] Error tracking
- [ ] Performance degradation

---

## 🔗 PHẦN 11: QUICK REFERENCE LINKS

| Resource | Link | Mục Đích |
|----------|------|---------|
| Neon Docs | [neon.tech/docs](https://neon.tech/docs) | PostgreSQL hosting |
| Vercel Docs | [vercel.com/docs](https://vercel.com/docs) | Deployment platform |
| Prisma Schema | [prisma.io/docs/concepts/components/prisma-schema](https://www.prisma.io/docs/concepts/components/prisma-schema) | Schema reference |
| Next.js Deploy | [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment) | Deploy guide |
| SSL/TLS Info | [ssl.com/article/what-is-ssl-tls](https://www.ssl.com/article/what-is-ssl-tls) | Security education |

---

## 📞 SUPPORT & TROUBLESHOOTING

### Neon Support
- Dashboard: https://console.neon.tech
- Email: support@neon.tech
- Community: https://discord.neon.tech

### Vercel Support
- Dashboard: https://vercel.com/dashboard
- Help: https://vercel.com/support
- Docs: https://vercel.com/docs

### Project-Specific Issues
```bash
# Kiểm tra logs:
vercel logs

# Test locally:
vercel env pull .env.local
npm run dev

# Reset database:
npx prisma migrate reset (dev only!)
```

---

## 🎓 TIMELINE DEPLOYMENT

| Bước | Thời Gian | Trạng Thái |
|------|-----------|-----------|
| Tạo Neon account | 5 phút | ⏳ TODO |
| Setup Vercel | 5 phút | ⏳ TODO |
| Add environment vars | 5 phút | ⏳ TODO |
| First deployment | 5 phút | ⏳ TODO |
| Test production | 10 phút | ⏳ TODO |
| **Total** | **30 phút** | ⏳ TODO |

---

✅ **Hướng dẫn này đã sẵn sàng cho production!**  
Hãy bắt đầu từ **PHẦN 1** và theo từng bước.

---

**Ghi chú cuối**:
- ✅ Database: PostgreSQL (scalable, production-ready)
- ✅ Hosting: Vercel (Global edge network, 99.95% uptime)
- ✅ Security: HTTPS/SSL, environment variables, rate limiting
- ✅ Monitoring: Built-in analytics, error tracking
- ✅ Reliability: Automatic rollback, version control

**Bạn đã sẵn sàng deploy!** 🚀
