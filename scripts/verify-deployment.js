/**
 * 🚀 Deployment Verification Script
 * Run after deployment to verify everything is working
 * 
 * Usage:
 * node scripts/verify-deployment.js https://your-app.vercel.app
 */

const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const deployementUrl = args[0];

if (!deployementUrl) {
  console.error(
    '❌ Usage: node scripts/verify-deployment.js <DEPLOYMENT_URL>\n'
    + 'Example: node scripts/verify-deployment.js https://pentaschool.vercel.app'
  );
  process.exit(1);
}

// Color codes
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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.includes('https') ? https : http;
    
    const request = protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function verify() {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('🚀 Deployment Verification', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  log(`Target: ${deployementUrl}\n`, 'yellow');

  // Check 1: Homepage accessibility
  log('[1/5] Checking homepage...', 'yellow');
  try {
    const homeResponse = await makeRequest(deployementUrl);
    if (homeResponse.statusCode === 200) {
      log('✅ Homepage accessible (200)', 'green');
    } else {
      log(`⚠️ Homepage returned ${homeResponse.statusCode}`, 'yellow');
    }
  } catch (error) {
    log(`❌ Homepage check failed: ${error.message}`, 'red');
  }

  // Check 2: Health check endpoint
  log('[2/5] Checking health endpoint...', 'yellow');
  try {
    const healthResponse = await makeRequest(`${deployementUrl}/api/health`);
    if (healthResponse.statusCode === 200) {
      try {
        const healthData = JSON.parse(healthResponse.body);
        log(`✅ Health check passed: ${healthData.status}`, 'green');
        
        if (healthData.database) {
          log(
            `   Database: ${healthData.database.connected ? 'Connected' : 'Disconnected'}`,
            healthData.database.connected ? 'green' : 'red'
          );
          if (healthData.database.responseTime) {
            log(`   Response time: ${healthData.database.responseTime}ms`, 'green');
          }
        }
      } catch (parseError) {
        log('⚠️ Could not parse health response', 'yellow');
      }
    } else {
      log(`⚠️ Health check returned ${healthResponse.statusCode}`, 'yellow');
    }
  } catch (error) {
    log(`⚠️ Health check endpoint not available: ${error.message}`, 'yellow');
  }

  // Check 3: Response headers security
  log('[3/5] Checking security headers...', 'yellow');
  try {
    const homeResponse = await makeRequest(deployementUrl);
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];
    
    let headerCount = 0;
    securityHeaders.forEach((header) => {
      if (homeResponse.headers[header]) {
        log(`✅ ${header}: ${homeResponse.headers[header]}`, 'green');
        headerCount++;
      }
    });
    
    if (headerCount < securityHeaders.length) {
      log(`⚠️ Missing ${securityHeaders.length - headerCount} security headers`, 'yellow');
    }
  } catch (error) {
    log(`⚠️ Could not check security headers: ${error.message}`, 'yellow');
  }

  // Check 4: SSL/TLS
  log('[4/5] Checking SSL/TLS...', 'yellow');
  if (deployementUrl.includes('https')) {
    log('✅ Using HTTPS (Secure)', 'green');
  } else {
    log('❌ Not using HTTPS (Insecure!)', 'red');
  }

  // Check 5: Summary
  log('\n[5/5] Deployment Summary', 'yellow');
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('✅ Deployment verification complete!', 'green');
  log('\nNext steps:', 'green');
  log('1. Test application features manually', 'green');
  log('2. Monitor error logs in Vercel dashboard', 'green');
  log('3. Setup monitoring alerts (optional)', 'green');
  log('4. Schedule regular health checks', 'green');
  log('\nHealth check endpoint:', 'blue');
  log(`${deployementUrl}/api/health\n`, 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');
}

verify().catch((error) => {
  log(`\n❌ Verification failed: ${error.message}\n`, 'red');
  process.exit(1);
});
