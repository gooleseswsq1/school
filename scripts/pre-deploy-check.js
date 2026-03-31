#!/usr/bin/env node

/**
 * 🚀 PentaSchool Pre-Deployment Checklist
 * Run: node scripts/pre-deploy-check.js
 * Verifies all requirements before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(condition, successMsg, failMsg) {
  if (condition) {
    log(`✅ ${successMsg}`, 'green');
    return true;
  } else {
    log(`❌ ${failMsg}`, 'red');
    return false;
  }
}

let passedChecks = 0;
let failedChecks = 0;

log('\n═══════════════════════════════════════════════════════', 'blue');
log('🚀 PentaSchool Pre-Deployment Checklist', 'blue');
log('═══════════════════════════════════════════════════════\n', 'blue');

// ─── Project Structure ─────────────────────────────────
log('📁 Checking Project Structure...', 'yellow');

if (check(
  fs.existsSync('package.json'),
  'package.json found',
  'package.json not found! Create it first.'
)) passedChecks++; else failedChecks++;

if (check(
  fs.existsSync('prisma/schema.prisma'),
  'Prisma schema found',
  'prisma/schema.prisma not found!'
)) passedChecks++; else failedChecks++;

if (check(
  fs.existsSync('next.config.ts'),
  'next.config.ts found',
  'next.config.ts not found!'
)) passedChecks++; else failedChecks++;

if (check(
  fs.existsSync('.env.local') || fs.existsSync('.env.example'),
  'Environment config found',
  'No environment configuration found!'
)) passedChecks++; else failedChecks++;

// ─── Dependencies ───────────────────────────────────────
log('\n📦 Checking Dependencies...', 'yellow');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (check(
  packageJson.dependencies['next'],
  `Next.js ${packageJson.dependencies['next']} installed`,
  'Next.js not found in dependencies!'
)) passedChecks++; else failedChecks++;

if (check(
  packageJson.dependencies['@prisma/client'],
  `Prisma ${packageJson.dependencies['@prisma/client']} installed`,
  'Prisma not found!'
)) passedChecks++; else failedChecks++;

if (check(
  packageJson.scripts['build'],
  'Build script defined',
  'Build script missing in package.json!'
)) passedChecks++; else failedChecks++;

if (check(
  packageJson.scripts['vercel-build'],
  'Vercel build script defined',
  'Vercel build script missing (need: vercel-build: prisma migrate deploy && npm run build)'
)) passedChecks++; else failedChecks++;

// ─── Prisma Schema ──────────────────────────────────────
log('\n🗄️ Checking Prisma Configuration...', 'yellow');

const schemaPrisma = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (check(
  schemaPrisma.includes('provider = "postgresql"'),
  'PostgreSQL provider configured (correct for production)',
  'Wrong database provider! Change to postgresql (not sqlite)'
)) passedChecks++; else failedChecks++;

if (check(
  schemaPrisma.includes('env("DATABASE_URL")'),
  'DATABASE_URL configured as environment variable',
  'DATABASE_URL not configured properly!'
)) passedChecks++; else failedChecks++;

// ─── Build Test ─────────────────────────────────────────
log('\n🔨 Checking Build Configuration...', 'yellow');

if (check(
  fs.existsSync('next.config.ts') || fs.existsSync('next.config.js'),
  'Next.js config found',
  'Next.js config not found!'
)) passedChecks++; else failedChecks++;

if (check(
  fs.existsSync('tsconfig.json'),
  'TypeScript configuration found',
  'tsconfig.json not found!'
)) passedChecks++; else failedChecks++;

// ─── Security Checks ────────────────────────────────────
log('\n🔐 Checking Security...', 'yellow');

const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';

if (check(
  !envLocal.includes('DATABASE_URL="file:'),
  'Using proper database URL (not SQLite file path)',
  'Still using SQLite file path in DATABASE_URL - use PostgreSQL for production!'
)) passedChecks++; else failedChecks++;

// ─── Git Configuration ──────────────────────────────────
log('\n🔄 Checking Git Configuration...', 'yellow');

const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';

if (check(
  gitignore.includes('.env.local') || gitignore.includes('.env'),
  '.env files in .gitignore',
  '.env files NOT in .gitignore - secrets may leak!'
)) passedChecks++; else failedChecks++;

if (check(
  gitignore.includes('node_modules'),
  'node_modules in .gitignore',
  'node_modules NOT in .gitignore!'
)) passedChecks++; else failedChecks++;

// ─── Vercel Configuration ───────────────────────────────
log('\n⚡ Checking Vercel Configuration...', 'yellow');

if (check(
  fs.existsSync('vercel.json'),
  'vercel.json configuration found',
  'vercel.json not found (optional but recommended)'
)) passedChecks++; else failedChecks++;

// ─── Summary ────────────────────────────────────────────
log('\n═══════════════════════════════════════════════════════', 'blue');
log('📊 Summary', 'blue');
log('═══════════════════════════════════════════════════════\n', 'blue');

log(`✅ Passed: ${passedChecks}`, 'green');
log(`❌ Failed: ${failedChecks}`, failedChecks > 0 ? 'red' : 'green');

// ─── Deployment Ready? ───────────────────────────────────
log('\n═══════════════════════════════════════════════════════', 'blue');

if (failedChecks === 0) {
  log('🚀 READY FOR DEPLOYMENT!', 'green');
  log('\nNext steps:', 'green');
  log('1. Create Neon PostgreSQL database: https://neon.tech', 'green');
  log('2. Setup Vercel project: https://vercel.com/new', 'green');
  log('3. Add environment variables to Vercel', 'green');
  log('4. Connect GitHub repository to Vercel', 'green');
  log('5. Push to main branch to trigger deployment', 'green');
} else {
  log(`⚠️ ${failedChecks} issues need fixing before deployment!`, 'yellow');
  log('\nPlease fix the failed checks above.', 'yellow');
  process.exit(1);
}

log('\n═══════════════════════════════════════════════════════\n', 'blue');
