import { test, expect } from '@playwright/test';
import { signInViaEmailLink } from './support/emulatorAuth.js';
import { resetEmulators, createTestUser, seedOpenNeed, seedOffer, seedApprovedMatch } from './support/seed.js';

// Auth-gated scenarios. Need the Firestore/Auth emulator running — see
// "npm run test:bdd" (wraps this whole suite in firebase emulators:exec)
// and test/bdd/README.md for how sign-in and fixture data work without a
// real inbox or a full end-to-end registration flow for every precondition.

const USER_EMAIL = 'bdd-user@example.invalid';
const SUPPORTER_EMAIL = 'bdd-supporter@example.invalid';

test.beforeEach(resetEmulators);

async function signInAsUser(page) {
  await page.goto('/user');
  await signInViaEmailLink(page, USER_EMAIL);
  await page.getByRole('button', { name: '確認しました' }).click();
}

test.describe('Scenario: a returning user with no おねがい yet opens the user page', () => {
  test('signs in, sees an empty home, and starts an empty form — matches golden-2-1 / golden-2-2', async ({
    page,
  }) => {
    // Given a user opens the user page and signs in via their email link
    await signInAsUser(page);

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

test.describe('Scenario: a user with an open (unmatched) おねがい opens the user page', () => {
  test('shows the card and the waiting-for-response status — matches golden-2-3', async ({ page }) => {
    // Given this user already registered an おねがい, still awaiting a match
    const uid = await createTestUser(USER_EMAIL);
    await seedOpenNeed(uid);

    // When they open the user page and sign in
    await signInAsUser(page);

    // Then it shows their おねがいカード and the "awaiting a match" status text
    await expect(page.getByRole('heading', { name: '登録したおねがい' })).toBeVisible();
    await expect(
      page.getByText('おねがいを受け付けました。現在、サポーターからの応募または管理者の確認を待っています。')
    ).toBeVisible();
    await expect(page).toHaveScreenshot('golden-2-3.png');
  });
});

test.describe('Scenario: a user whose おねがい has been matched opens the user page', () => {
  test('shows the card and the matched status — matches golden-2-4', async ({ page }) => {
    // Given this user's おねがい was matched with a supporter by an admin
    const uid = await createTestUser(USER_EMAIL);
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    const needId = await seedOpenNeed(uid);
    const offerId = await seedOffer(supporterUid, needId);
    await seedApprovedMatch('bdd-admin-fixture', needId, offerId);

    // When they open the user page and sign in
    await signInAsUser(page);

    // Then it shows their おねがいカード and the matched status text
    await expect(
      page.getByText('マッチングが成立しました。本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で成立状態のみ表示しています。')
    ).toBeVisible();
    await expect(page).toHaveScreenshot('golden-2-4.png');
  });
});

test.describe('Scenario: a user with multiple おねがい opens the user page', () => {
  test('lists one open and one matched おねがい — matches golden-2-5', async ({ page }) => {
    // Given this user registered two おねがい: one still open, one already matched
    const uid = await createTestUser(USER_EMAIL);
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    await seedOpenNeed(uid);
    const matchedNeedId = await seedOpenNeed(uid);
    const offerId = await seedOffer(supporterUid, matchedNeedId);
    await seedApprovedMatch('bdd-admin-fixture', matchedNeedId, offerId);

    // When they open the user page and sign in
    await signInAsUser(page);

    // Then the list shows both おねがい, each with its own status
    await expect(page.getByRole('heading', { name: '登録したおねがい' })).toBeVisible();
    await expect(
      page.getByText('おねがいを受け付けました。現在、サポーターからの応募または管理者の確認を待っています。')
    ).toBeVisible();
    await expect(
      page.getByText('マッチングが成立しました。本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で成立状態のみ表示しています。')
    ).toBeVisible();
    await expect(page).toHaveScreenshot('golden-2-5.png');
  });
});
