import { expect } from '@playwright/test';

const AUTH_EMULATOR_ORIGIN = 'http://127.0.0.1:9099';
// Matches src/firebaseConfig.js projectId. Duplicated as a literal (not
// imported) so this test helper has no dependency on the app's module graph.
const PROJECT_ID = 'musubi-6fff3';

// Completes the app's real email-link sign-in flow without a real inbox.
// The Auth Emulator never sends mail — it records every "sent" link as a
// retrievable oobCode instead, so a test can fetch the exact link a user
// would have clicked and navigate to it, the same way the real
// src/auth/AuthContext.jsx code path handles it. See test/bdd/README.md.
export async function signInViaEmailLink(page, email) {
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByRole('button', { name: 'ログインリンクを送信' }).click();
  await expect(page.getByRole('heading', { name: 'メールを送信しました' })).toBeVisible();

  const res = await page.request.get(
    `${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/oobCodes`
  );
  const { oobCodes } = await res.json();
  const code = oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN').pop();
  if (!code) throw new Error(`Auth emulator has no sign-in link recorded for ${email}`);

  // Same request a real user's browser makes by clicking the link in their email.
  await page.goto(code.oobLink);
}
