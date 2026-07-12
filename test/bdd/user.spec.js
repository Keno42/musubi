import { test, expect } from '@playwright/test';
import { signInViaEmailLink } from './support/emulatorAuth.js';

// Auth-gated scenario. Needs the Firestore/Auth emulator running — see
// "npm run test:bdd" (wraps this whole suite in firebase emulators:exec)
// and test/bdd/README.md for how sign-in is done without a real inbox.

const TEST_EMAIL = 'bdd-user@example.invalid';

test.describe('Scenario: a returning user with no おねがい yet opens the user page', () => {
  test('signs in, sees an empty home, and starts an empty form — matches golden-2-1 / golden-2-2', async ({
    page,
  }) => {
    // Given a user opens the user page and signs in via their email link
    await page.goto('/user');
    await signInViaEmailLink(page, TEST_EMAIL);

    // And confirms the usage notice (first visit this browser session)
    await page.getByRole('button', { name: '確認しました' }).click();

    // Then it shows a home screen with no registered おねがい and one call to action
    await expect(page.getByRole('button', { name: 'おねがいを登録する' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '登録したおねがい' })).toHaveCount(0);
    await expect(page).toHaveScreenshot('golden-2-1.png');

    // When the user starts registering an おねがい
    await page.getByRole('button', { name: 'おねがいを登録する' }).click();

    // Then it shows step 1 of 5, entirely empty, so "次へ" is disabled
    await expect(page.getByText('ステップ 1 / 5')).toBeVisible();
    await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled();
    await expect(page).toHaveScreenshot('golden-2-2.png');
  });
});
