import { test, expect } from '@playwright/test';

test.describe('Admin Role E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can login and view admin dashboard', async ({ page }) => {
    // 1. Login as seeded admin
    await page.fill('input[type="tel"]', '+251900000000');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.locator('h2', { hasText: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });

    // 2. Check withdrawals tab
    await page.click('button.tab:has-text("Withdrawals")');
    await expect(page.locator('.action-bar-left:has-text("Withdrawals")')).toBeVisible();

    // 3. Check payouts tab
    await page.click('button.tab:has-text("Seller Payouts")');
    await expect(page.locator('.action-bar-left:has-text("Seller Payouts")')).toBeVisible();

    // Logout
    await page.click('button:has-text("Sign Out")');
  });
});
