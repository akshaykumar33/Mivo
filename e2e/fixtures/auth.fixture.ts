import { test as base, Page } from '@playwright/test';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  token: string;
}

export const DEMO_USERS = {
  devAdmin: {
    email: 'dev@mivo.app',
    password: 'Password123!',
    displayName: 'Dev Admin',
    role: 'OWNER',
  },
  alex: {
    email: 'alex@mivo.app',
    password: 'Password123!',
    displayName: 'Alex Rivera',
    role: 'ADMIN',
  },
  sarah: {
    email: 'sarah@mivo.app',
    password: 'Password123!',
    displayName: 'Sarah Chen',
    role: 'MEMBER',
  },
};

/**
 * Log into Mivo via API and inject token into localStorage for zero-latency authentication.
 */
export async function injectAuth(page: Page, email = DEMO_USERS.devAdmin.email, password = DEMO_USERS.devAdmin.password): Promise<AuthUser> {
  let data: any;
  let lastError: any;
  let loginRes: any;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      loginRes = await page.request.post('http://localhost:4000/api/v1/auth/login', {
        data: { email, password },
      });
      data = await loginRes.json();
      if (data.success) break;
      lastError = data;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (!data?.success) {
    throw new Error(`Failed to authenticate ${email}: ${JSON.stringify(lastError || data)}`);
  }

  const token = data.data.accessToken;
  const user = data.data.user;

  // Transfer cookies to browser context
  const setCookies = loginRes.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
  for (const cookieHeader of setCookies) {
    const parts = cookieHeader.value.split(';')[0].split('=');
    if (parts.length >= 2) {
      await page.context().addCookies([{
        name: parts[0].trim(),
        value: parts.slice(1).join('=').trim(),
        domain: 'localhost',
        path: '/',
      }]);
    }
  }

  // Pre-seed localStorage before any scripts/hydration execute
  await page.context().addInitScript(({ token, user }) => {
    try {
      window.localStorage.setItem('mivo_access_token', token);
      window.localStorage.setItem('mivo_user', JSON.stringify(user));
    } catch {}
  }, { token, user });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.username,
    username: user.username,
    token,
  };
}
