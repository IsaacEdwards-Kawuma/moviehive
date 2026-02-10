import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('home shows MOVI HIVE and sign in or content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('MOVI HIVE')).toBeVisible();
    const signIn = page.getByRole('button', { name: /sign in/i });
    const browse = page.getByRole('link', { name: /browse/i });
    const hasSignIn = await signIn.isVisible();
    const hasBrowse = await browse.isVisible();
    expect(hasSignIn || hasBrowse || (await page.getByRole('heading').first().isVisible())).toBeTruthy();
  });

  test('404 page shows go home link', async ({ page }) => {
    await page.goto('/nonexistent-page-404');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();
  });
});
