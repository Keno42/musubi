import { test, expect } from '@playwright/test';
import { signInViaEmailLink } from './support/emulatorAuth.js';
import { resetEmulators, createTestUser, seedOpenNeed, seedOffer, seedApprovedMatch } from './support/seed.js';

const OWNER_EMAIL = 'bdd-owner@example.invalid';
const SUPPORTER_EMAIL = 'bdd-supporter@example.invalid';

test.beforeEach(resetEmulators);

async function signInAsSupporter(page) {
  await page.goto('/supporter');
  await signInViaEmailLink(page, SUPPORTER_EMAIL);
  await page.getByRole('button', { name: '確認しました' }).click();
}

// A need with two self-check items (one safety, one scene-specific), so the
// application scenario has a real checklist to interact with instead of an
// empty one.
async function seedNeedWithSelfCheck(overrides = {}) {
  const ownerUid = await createTestUser(OWNER_EMAIL);
  return seedOpenNeed(ownerUid, {
    public: {
      supportCategory: '通院などの外出',
      supportPoints: ['C3', 'H1'],
      ...overrides.public,
    },
    ...overrides,
  });
}

test.describe('Scenario: a supporter opens the page with nothing currently open', () => {
  test('shows the empty state — matches golden-3-1', async ({ page }) => {
    // Given there is no open おねがい to browse
    // When a supporter signs in
    await signInAsSupporter(page);

    // Then it shows the empty-list message
    await expect(page.getByText('現在募集中のおねがいはありません。')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-3-1.png');
  });
});

test.describe('Scenario: a supporter browses an open おねがい', () => {
  test('shows the card with an apply button — matches golden-3-2', async ({ page }) => {
    // Given someone else registered an open おねがい
    await seedNeedWithSelfCheck();

    // When a supporter signs in
    await signInAsSupporter(page);

    // Then it shows the card, not yet applied to
    await expect(page.getByRole('heading', { name: '募集中のおねがい' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'このおねがいを手伝う' })).toBeVisible();
    await expect(page).toHaveScreenshot('golden-3-2.png');
  });
});

test.describe('Scenario: a supporter starts applying but has not confirmed every self-check item', () => {
  test('keeps the submit button disabled — matches golden-3-3', async ({ page }) => {
    // Given an open おねがい with self-check items
    await seedNeedWithSelfCheck();
    await signInAsSupporter(page);

    // When the supporter starts applying but confirms nothing yet
    await page.getByRole('button', { name: 'このおねがいを手伝う' }).click();

    // Then the submit button stays disabled and says why
    await expect(page.getByRole('button', { name: 'すべて確認すると応募できます' })).toBeDisabled();
    await expect(page).toHaveScreenshot('golden-3-3.png');
  });
});

test.describe('Scenario: a supporter already applied and is awaiting admin review', () => {
  test('shows 応募済み on the card and 確認待ち in their status — matches golden-3-4', async ({ page }) => {
    // Given this supporter already applied to an open おねがい
    const needId = await seedNeedWithSelfCheck();
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    await seedOffer(supporterUid, needId);

    // When they open the supporter page again
    await signInAsSupporter(page);

    // Then the card shows they've already applied, and their status is pending review
    await expect(page.getByRole('button', { name: '応募済み' })).toBeDisabled();
    await expect(page.getByText('確認待ち')).toBeVisible();
    await expect(page.getByText('応募を受け付けました。管理者が内容を確認しています。')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-3-4.png');
  });
});

test.describe('Scenario: a supporter’s application has been matched by an admin', () => {
  test('drops off the open list and shows confirmed details — matches golden-3-5', async ({ page }) => {
    // Given this supporter's application was matched
    const needId = await seedNeedWithSelfCheck();
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    const offerId = await seedOffer(supporterUid, needId);
    await seedApprovedMatch('bdd-admin-fixture', needId, offerId);

    // When they open the supporter page
    await signInAsSupporter(page);

    // Then the need is no longer in the open list (it's matched now)...
    await expect(page.getByText('現在募集中のおねがいはありません。')).toBeVisible();
    // ...and their own status shows the match with confirmed details
    await expect(page.getByText('マッチング成立')).toBeVisible();
    await expect(page.getByText('待ち合わせ場所: テスト市テスト町1-1')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-3-5.png');
  });
});
