import { test, expect } from '@playwright/test';
import { signInViaEmailLink } from './support/emulatorAuth.js';
import { resetEmulators, createTestUser, seedOpenNeed, seedOffer, seedApprovedMatch } from './support/seed.js';

// Hardcoded placeholder admin address from firestore.rules (isAdmin()).
// See firestore.rules and README.md for how the emulator lets any address
// sign in as this without owning the inbox.
const ADMIN_EMAIL = 'admin@example.com';
const OWNER_EMAIL = 'bdd-owner@example.invalid';
const SUPPORTER_EMAIL = 'bdd-supporter@example.invalid';

test.beforeEach(resetEmulators);

async function signInAsAdmin(page) {
  await page.goto('/admin');
  await signInViaEmailLink(page, ADMIN_EMAIL);
}

test.describe('Scenario: an admin opens the page before anyone has registered an おねがい', () => {
  test('shows the empty state — matches golden-4-1', async ({ page }) => {
    await signInAsAdmin(page);

    await expect(page.getByRole('heading', { name: 'おねがい一覧' })).toBeVisible();
    await expect(page.getByText('まだ登録がありません。')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-4-1.png');
  });
});

test.describe('Scenario: an admin reviews a mix of open and already-matched おねがい', () => {
  test('shows both statuses in the list — matches golden-4-2', async ({ page }) => {
    // Given one おねがい is still open, and one has already been matched
    const openOwnerUid = await createTestUser(`open-${OWNER_EMAIL}`);
    await seedOpenNeed(openOwnerUid);

    const matchedOwnerUid = await createTestUser(`matched-${OWNER_EMAIL}`);
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    const needId = await seedOpenNeed(matchedOwnerUid);
    const offerId = await seedOffer(supporterUid, needId);
    await seedApprovedMatch('bdd-admin-fixture', needId, offerId);

    // When an admin opens the page
    await signInAsAdmin(page);

    // Then it shows one of each status badge
    await expect(page.getByText('募集中')).toBeVisible();
    await expect(page.getByText('成立済み')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-4-2.png');
  });
});

test.describe('Scenario: an admin opens the offers for an おねがい with multiple applicants', () => {
  test('shows every offer awaiting review — matches golden-4-3', async ({ page }) => {
    // Given an open おねがい with two pending offers
    const ownerUid = await createTestUser(OWNER_EMAIL);
    const needId = await seedOpenNeed(ownerUid);
    const supporterAUid = await createTestUser(`a-${SUPPORTER_EMAIL}`);
    const supporterBUid = await createTestUser(`b-${SUPPORTER_EMAIL}`);
    // Fixed ids: fetchAllOffersForAdmin() has no orderBy, so without a
    // stable sort key the two offers would render in a different order
    // (and produce a different screenshot) from run to run.
    await seedOffer(supporterAUid, needId, { id: 'bdd-offer-a', supporterName: 'サポーターA' });
    await seedOffer(supporterBUid, needId, { id: 'bdd-offer-b', supporterName: 'サポーターB' });

    // When an admin opens it to review applicants
    await signInAsAdmin(page);
    await page.getByRole('button', { name: '応募を確認する' }).click();

    // Then it shows both, awaiting review
    await expect(page.getByRole('heading', { name: '応募一覧' })).toBeVisible();
    await expect(page.getByText('確認待ち')).toHaveCount(2);
    await expect(page).toHaveScreenshot('golden-4-3.png');
  });
});

test.describe('Scenario: an admin approves a match', () => {
  test('confirms the details and shows the success screen — matches golden-4-4', async ({ page }) => {
    // Given an open おねがい with one pending offer
    const ownerUid = await createTestUser(OWNER_EMAIL);
    const needId = await seedOpenNeed(ownerUid);
    const supporterUid = await createTestUser(SUPPORTER_EMAIL);
    await seedOffer(supporterUid, needId);

    // When an admin selects the need, selects the offer, and approves the match
    await signInAsAdmin(page);
    await page.getByRole('button', { name: '応募を確認する' }).click();
    await page.getByRole('button', { name: 'この応募でマッチングする' }).click();

    // Then it shows the confirmation details before committing
    await expect(page.getByRole('heading', { name: '内容をご確認ください' })).toBeVisible();
    await page.getByLabel('サポーターへ伝える補足(任意)').fill('当日は正面玄関でお待ちください。');
    await page.getByRole('button', { name: 'マッチング成立' }).click();

    // Then it shows the success screen, and the list now reflects the match
    await expect(page.getByRole('heading', { name: 'マッチングが成立しました' })).toBeVisible();
    await expect(page.getByText('成立済み')).toBeVisible();
    await expect(page).toHaveScreenshot('golden-4-4.png');
  });
});
