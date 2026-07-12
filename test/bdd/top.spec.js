import { test, expect } from '@playwright/test';

// BDD scenarios for the public top page (no auth required).
// Each scenario matches a golden image in test/bdd/goldens/ AND asserts the
// specific content/behavior in words, so a failure tells you *what* changed
// (a label, a missing button) rather than just "pixels differ". See
// test/bdd/README.md for why goldens alone aren't the pass/fail signal here.

test.describe('Scenario 1: a first-time visitor opens 結び', () => {
  test('shows the intro, the data-handling notice, and both entry points — matches golden-1-1', async ({
    page,
  }) => {
    // Given a visitor opens the top page
    await page.goto('/');

    // Then it shows the app name as the page heading, in Japanese only
    await expect(page.getByRole('heading', { name: '結び' })).toBeVisible();

    // And it shows the prototype data-handling notice (wording fixed by handoff §5)
    await expect(
      page.getByText('お試しで登録するときは、実在しない名前・住所をお使いください。')
    ).toBeVisible();

    // And it shows entry points for both roles
    await expect(page.getByRole('link', { name: '利用者の方はこちら' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'サポーターの方はこちら' })).toBeVisible();

    // And it does not show an admin entry point (owner decision 2026-07-11:
    // admins arrive via a direct URL, never a link on this page)
    await expect(page.getByRole('link', { name: /管理者/ })).toHaveCount(0);

    // And the page matches the golden image
    await expect(page).toHaveScreenshot('golden-1-1.png');
  });
});

test.describe('Scenario 2: the same visitor is on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12-class

  test('entry-point buttons are large enough to tap — matches golden-1-2', async ({ page }) => {
    // Given a visitor opens the top page on a phone-sized screen
    await page.goto('/');

    // Then the primary buttons are tall enough for a nervous first-time user
    // to tap accurately (handoff §8: buttons ≥16px tall touch targets)
    const userLink = page.getByRole('link', { name: '利用者の方はこちら' });
    const box = await userLink.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);

    // And the page matches the golden image
    await expect(page).toHaveScreenshot('golden-1-2.png');
  });
});
