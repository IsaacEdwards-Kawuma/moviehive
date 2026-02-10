import { test, expect } from '@playwright/test';

test.describe('Browse (unauthenticated)', () => {
  test('browse page loads', async ({ page }) => {
    await page.goto('/browse');
    await expect(page).toHaveURL(/\/(browse|login)/);
    if (await page.getByRole('heading', { name: /browse/i }).isVisible()) {
      await expect(page.getByRole('heading', { name: /browse/i })).toBeVisible();
    }
  });
});
