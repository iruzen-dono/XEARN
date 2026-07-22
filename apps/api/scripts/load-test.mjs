#!/usr/bin/env node
/**
 * XEARN — Load Test Script
 *
 * Usage: node scripts/load-test.mjs [options]
 * Options:
 *   --url BASE_URL     Base URL (default: http://localhost:4000)
 *   --connections N     Concurrent connections (default: 100)
 *   --duration N        Test duration in seconds (default: 30)
 *   --email EMAIL       Test user email (default: loadtest@test.com)
 *   --password PASSWORD Test user password (default: LoadTest123!)
 *
 * Tests: register → login → verify email → dashboard → wallet → tasks
 */

import autocannon from 'autocannon';
import { argv } from 'node:process';

const BASE_URL = argv.includes('--url')
  ? argv[argv.indexOf('--url') + 1]
  : 'http://localhost:4000';
const CONNECTIONS = argv.includes('--connections')
  ? parseInt(argv[argv.indexOf('--connections') + 1], 10)
  : 100;
const DURATION = argv.includes('--duration')
  ? parseInt(argv[argv.indexOf('--duration') + 1], 10)
  : 30;
const EMAIL = argv.includes('--email')
  ? argv[argv.indexOf('--email') + 1]
  : `loadtest-${Date.now()}@test.com`;
const PASSWORD = argv.includes('--password')
  ? argv[argv.indexOf('--password') + 1]
  : 'LoadTest123!';

async function getToken() {
  // Register user
  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, firstName: 'Load', lastName: 'Test' }),
  });
  if (!regRes.ok) console.warn('Register:', regRes.status);

  // Verify email in DB
  const { execSync } = await import('node:child_process');
  try {
    execSync(
      `docker exec -i xearn-postgres psql -U xearn -d xearn_db -c "UPDATE users SET \"emailVerifiedAt\"=NOW() WHERE email='${EMAIL}'"`,
      { stdio: 'pipe' },
    );
  } catch {
    // DB may not be accessible in CI
  }

  // Login
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

  const cookies = loginRes.headers.getSetCookie();
  const token = cookies.find((c) => c.startsWith('accessToken='))?.split(';')[0]?.split('=')[1];
  return token;
}

async function run() {
  console.log(`\n🚀 XEARN Load Test — ${CONNECTIONS} connections × ${DURATION}s`);
  console.log(`📡 Target: ${BASE_URL}/api/v1`);
  console.log(`👤 User: ${EMAIL}\n`);

  let token;
  try {
    token = await getToken();
    console.log('✅ Token obtained\n');
  } catch (err) {
    console.warn('⚠️  Could not get token, running unauthenticated tests only:', err.message);
  }

  const endpoints = [
    { name: 'GET /health', method: 'GET', path: '/api/health' },
    { name: 'POST /auth/login', method: 'POST', path: '/api/v1/auth/login', body: { email: EMAIL, password: PASSWORD } },
    { name: 'GET /auth/me', method: 'GET', path: '/api/v1/auth/me' },
    { name: 'GET /wallet/overview', method: 'GET', path: '/api/v1/wallet/overview' },
    { name: 'GET /wallet/transactions', method: 'GET', path: '/api/v1/wallet/transactions?limit=10' },
    { name: 'GET /tasks', method: 'GET', path: '/api/v1/tasks' },
    { name: 'GET /referrals/stats', method: 'GET', path: '/api/v1/referrals/stats' },
    { name: 'GET /referrals/tree', method: 'GET', path: '/api/v1/referrals/tree' },
    { name: 'GET /notifications', method: 'GET', path: '/api/v1/notifications' },
    { name: 'GET /gamification/streaks', method: 'GET', path: '/api/v1/gamification/streaks' },
    { name: 'GET /gamification/badges', method: 'GET', path: '/api/v1/gamification/badges' },
    { name: 'GET /gamification/leaderboard', method: 'GET', path: '/api/v1/gamification/leaderboard' },
    { name: 'GET /ads', method: 'GET', path: '/api/v1/ads' },
  ];

  for (const ep of endpoints) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && ep.path !== '/api/health' && ep.path !== '/api/v1/auth/login') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const result = await autocannon({
      url: BASE_URL,
      connections: CONNECTIONS,
      duration: DURATION,
      headers,
      requests: [
        {
          method: ep.method as any,
          path: ep.path,
          headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        },
      ],
    });

    console.log(`\n📊 ${ep.name}`);
    console.log(`   ├─ Latency avg: ${result.latency.average}ms (p99: ${result.latency.p99}ms)`);
    console.log(`   ├─ Requests/sec: ${result.requests.average}`);
    console.log(`   ├─ Throughput: ${(result.throughput.average / 1024).toFixed(1)} KB/s`);
    console.log(`   ├─ 2xx: ${result['2xx']} | 4xx: ${result['4xx']} | 5xx: ${result['5xx']}`);
    console.log(`   └─ Errors: ${result.errors}`);
  }

  console.log('\n✅ Load test complete!');
}

run().catch(console.error);
