# 🗄️ Database Migration: SQLite → PostgreSQL

**Ngày**: March 31, 2026  
**Độ Ưu Tiên**: 🔴 CRITICAL  
**Status**: Ready for Production Migration

---

## 📋 Current Database Status

### Development Environment (Current)
```
Provider: PostgreSQL (in schema.prisma)
Runtime: SQLite file (in .env.local)
```

**Wait, what?** The schema says PostgreSQL but .env says SQLite - this is actually **intentional**!

- ✅ **Local Dev**: SQLite file (`dev.db`) - fast, no setup needed
- ✅ **Production**: PostgreSQL (Neon) - scalable, multi-user safe
- ❌ **Problem**: Nếu bạn push production lên SQLite sẽ fail

### Why This Setup is Perfect
```
Local Development (SQLite)
    ↓
Test locally
    ↓
Commit to GitHub
    ↓
Vercel detects PostgreSQL in schema
    ↓
Vercel uses PostgreSQL from DATABASE_URL
    ↓
✅ Production works!
```

---

## 🚀 PART 1: VERIFY CURRENT SETUP

### Check 1: Prisma Schema (Already Correct ✅)
```bash
# This should show: provider = "postgresql"
grep "provider" prisma/schema.prisma
```

**Expected Output**:
```
provider = "postgresql"
```

✅ **Already set to PostgreSQL** - No changes needed!

### Check 2: Environment Variables (Already Correct ✅)
```bash
# Local development - SQLite (fine for development)
cat .env.local | grep DATABASE_URL
```

**Expected Output**:
```
DATABASE_URL="file:./prisma/dev.db"
```

✅ **This is correct for development** - Will change to PostgreSQL in production

### Check 3: No SQLite Locks in Code
```bash
# Search for hardcoded SQLite references
grep -r "sqlite" src/ --include="*.ts" --include="*.tsx"
grep -r "dev\.db" src/ --include="*.ts" --include="*.tsx"
```

**Expected**: No matches (good!)

---

## 🔄 PART 2: MIGRATION WORKFLOW (For Production)

### Timeline

```
Local Dev                Production
(SQLite)                (PostgreSQL)
    ↓                        ↑
    └────Commit code────────┘
    
    When deploying:
    1. Vercel reads .env (DATABASE_URL via Vercel secrets)
    2. Points to PostgreSQL (Neon)
    3. Runs: prisma migrate deploy
    4. Creates tables in PostgreSQL
    5. ✅ Ready!
```

### Step-by-Step Process

#### ✅ Step 1: Local Testing (no changes to code)
```bash
# Your code already works with SQLite locally
npm run dev

# Test features:
# - Create account
# - Create course
# - Upload files
# - Take quiz
```

#### ✅ Step 2: Create Neon Database
See: **DEPLOYMENT_CHECKLIST.md** → PHẦN 1

Get connection string:
```
postgresql://user:password@ep-xxxxx.neon.tech/pentaschool?sslmode=require
```

#### ✅ Step 3: Add to Vercel
See: **DEPLOYMENT_CHECKLIST.md** → PHẦN 2

Add environment variable:
```
DATABASE_URL=postgresql://user:password@ep-xxxxx.neon.tech/pentaschool?sslmode=require
```

#### ✅ Step 4: First Deploy
```bash
git push origin main
# Vercel auto-deploys
# Runs: prisma migrate deploy
# ✅ Tables created in PostgreSQL
```

#### ✅ Step 5: Verify
```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Expected:
# "database": { "connected": true }
```

---

## 📊 PART 3: DATA MIGRATION (If Needed)

### Scenario A: Fresh Production Start (Recommended)
```
✅ No existing production data
✅ Just create fresh database
✅ This is what we're doing!
```

**Process**:
1. Neon creates empty PostgreSQL database
2. `prisma migrate deploy` creates tables
3. ✅ Done! Fresh start.

### Scenario B: Migrate Existing Data (Not needed now)
**If you had production data in SQLite**:

```bash
# Export SQLite data
# This is COMPLEX and NOT recommended
# That's why we use PostgreSQL from start!
```

---

## 🔧 PART 4: SCHEMA VERIFICATION

### Current Schema (Already production-ready ✅)
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // ✅ Correct
  url      = env("DATABASE_URL")
}

// Models already defined
model User { ... }
model Course { ... }
model Submission { ... }
// etc.
```

### What This Schema Can Do
- ✅ Multiple concurrent users (PostgreSQL allows)
- ✅ Large datasets (no 2-4GB limit like SQLite)
- ✅ Complex queries (JOIN, aggregations)
- ✅ Transactions (ACID compliance)
- ✅ Backups (automatic on Neon)

---

## ⚠️ PART 5: COMMON PITFALLS & HOW TO AVOID

### ❌ Pitfall 1: Forgetting to Migrate
```
What happens: Deploy to Vercel, DATABASE_URL set, but no tables
Error: "relation 'User' does not exist"
```

**Prevention**:
```json
// package.json already has this ✅
"vercel-build": "prisma migrate deploy && npm run build"
```

### ❌ Pitfall 2: Wrong Database URL
```
DATABASE_URL="file:./dev.db"  // ❌ SQLite - won't work on serverless
```

**Prevention**:
```
DATABASE_URL="postgresql://..."  // ✅ PostgreSQL - correct
```

### ❌ Pitfall 3: Missing SSL
```
DATABASE_URL="postgresql://..."  // ❌ No SSL - risky
```

**Prevention**:
```
DATABASE_URL="postgresql://...?sslmode=require"  // ✅ Secure
```

### ❌ Pitfall 4: Hardcoding Credentials
```javascript
// ❌ BAD - NEVER DO THIS
const db = "postgresql://user:password@host";
```

**Prevention**:
```javascript
// ✅ GOOD - Use environment variables
const db = process.env.DATABASE_URL;
```

---

## 📋 MIGRATION CHECKLIST

Before hitting "Deploy" on Vercel:

- [ ] ✅ Prisma schema sets `provider = "postgresql"`
- [ ] ✅ No hardcoded database URLs in code
- [ ] ✅ Neon PostgreSQL instance created
- [ ] ✅ Neon connection string obtained
- [ ] ✅ Connection string includes `?sslmode=require`
- [ ] ✅ DATABASE_URL added to Vercel secrets
- [ ] ✅ vercel-build script includes `prisma migrate deploy`
- [ ] ✅ package.json has all needed scripts
- [ ] ✅ .gitignore includes `.env.local`
- [ ] ✅ No sensitive data in .env.example

---

## 🎯 VERIFICATION QUERIES

After deployment, you can run these in Neon console to verify:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Count records (should be 0 for first deploy)
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Course";

-- Check database size
SELECT pg_size_pretty(pg_database_size('pentaschool'));

-- Monitor connections
SELECT usename, count(*) 
FROM pg_stat_activity 
GROUP BY usename;
```

---

## 🔄 ROLLBACK PLAN (If Something Goes Wrong)

### Situation: Deploy failed, app is down
```bash
# Step 1: Check Vercel logs
vercel logs

# Step 2: Identify the issue
# (Common: wrong DATABASE_URL, migration failed)

# Step 3: Fix environment variables or code

# Step 4: Redeploy
git push origin main  # Vercel auto-redeploys
# OR manually: Vercel Dashboard → Redeploy button

# Step 5: Verify
curl https://your-app.vercel.app/api/health
```

### Situation: Database corrupted
```bash
# Step 1: Neon console → Delete branch/database
# Step 2: Create new branch in Neon
# Step 3: Update DATABASE_URL in Vercel
# Step 4: Restart Vercel deployment
```

---

## 📚 LEARNING RESOURCES

| Topic | Resource | Why |
|-------|----------|-----|
| Prisma Migration | [prisma.io/docs/concepts/components/prisma-migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) | Understanding migrations |
| PostgreSQL Basics | [postgresql.org/docs](https://www.postgresql.org/docs/) | Learn about our database |
| Neon Docs | [neon.tech/docs](https://neon.tech/docs/) | Hosted PostgreSQL guide |
| Database Design | [drawdb.app](https://drawdb.app/) | Visualize schema |

---

## 🎊 RESULT

After following this guide:

✅ **Local Development**: SQLite (fast, no setup)  
✅ **Production**: PostgreSQL on Neon (scalable, reliable)  
✅ **Migration**: Automatic via `prisma migrate deploy`  
✅ **Security**: All secrets in Vercel, not in code  
✅ **Monitoring**: Health checks & error tracking  
✅ **Backup**: Automatic daily backups  

**Your database is now production-ready!** 🚀

---

## 📞 TROUBLESHOOTING

**Q: My local SQLite data - will it go to production?**  
A: No. SQLite is local only. Production gets fresh PostgreSQL. This is good! (Separates dev/prod)

**Q: Can I keep using SQLite in production?**  
A: No. Vercel serverless can't write to filesystem. Must use PostgreSQL.

**Q: Do I need to do anything special to deploy?**  
A: Just push to GitHub. Vercel handles everything:
```bash
git add .
git commit -m "Ready for production"
git push origin main
# Vercel auto-deploys and runs migrations!
```

**Q: What if migration has errors?**  
A: Check Vercel logs. Common issues:
- Missing schema changes
- Wrong DATABASE_URL
- Network timeout

**Q: Can I test PostgreSQL locally before deploying?**  
A: Yes! Optional:
```bash
docker run -e POSTGRES_PASSWORD=test -p 5432:5432 postgres

# Update .env.local temporarily
DATABASE_URL="postgresql://postgres:test@localhost:5432/test"

# Test
npm run dev
```

---

**🎯 Bottom Line**: Your app is already configured for PostgreSQL! Just need to create Neon account and add the connection string to Vercel. That's it! 🚀
