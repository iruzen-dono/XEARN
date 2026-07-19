import { execSync } from 'node:child_process';

export const API_BASE = 'http://localhost:4000/api/v1';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  csrfToken: string;
  userId?: string;
  referralCode?: string;
}

/**
 * Crée un utilisateur vérifié pour les tests E2E.
 * Flow: register → verify email in DB (psql in Docker) → login → extract accessToken cookie
 */
export async function createVerifiedUser(prefix: string): Promise<TestUser> {
  const email = `${prefix}-${Date.now().toString(36)}@e2e-test.com`;
  const password = 'Test1234!';

  // 1. Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: prefix, lastName: 'E2E' }),
  });

  if (!regRes.ok) {
    throw new Error(`Register failed (${regRes.status}): ${await regRes.text()}`);
  }

  // 2. Verify email in Docker PostgreSQL
  execSync(
    `docker exec -i xearn-postgres psql -U xearn -d xearn_db -c "UPDATE users SET \\"emailVerifiedAt\\"=NOW() WHERE email='${email}'"`,
    { stdio: 'pipe' },
  );

  // 3. Login and extract tokens from Set-Cookie headers
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed (${loginRes.status}): ${await loginRes.text()}`);
  }

  const cookies = loginRes.headers.getSetCookie();
  const accessToken =
    cookies.find((c) => c.startsWith('accessToken='))?.replace(/^accessToken=([^;]+).*$/, '$1') ??
    '';
  const csrfToken =
    cookies.find((c) => c.startsWith('csrfToken='))?.replace(/^csrfToken=([^;]+).*$/, '$1') ?? '';

  if (!accessToken) {
    throw new Error('accessToken not found in login cookies');
  }

  const body = await loginRes.json();

  return {
    email,
    password,
    firstName: prefix.charAt(0).toUpperCase() + prefix.slice(1),
    lastName: 'E2E',
    accessToken,
    csrfToken,
    userId: body.user?.id,
    referralCode: body.user?.referralCode,
  };
}
