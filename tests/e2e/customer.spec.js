import { test, expect } from '@playwright/test';

test.describe('Customer Role E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto('/');
  });

  test('can login, view dashboard, and request withdrawal', async ({ page }) => {
    // 1. Login as seeded customer
    await page.fill('input[type="tel"]', '+251911234567');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 });

    // 2. Open deposit modal and close it (just testing UI flow)
    // Button text is "💰 {t.deposit}" = "💰 Deposit"
    await page.click('button.btn-primary:has-text("Deposit")');
    // Modal h3 is "💰 {t.deposit}" = "💰 Deposit"
    await expect(page.locator('.modal-header h3')).toBeVisible();
    await page.click('button:has-text("Cancel")'); // Close button

    // 3. Open withdraw modal from dashboard and submit
    // Button text is "💸 {t.withdraw}" = "💸 Withdraw"
    await page.click('button.btn-secondary:has-text("Withdraw")');
    // Modal h3 is "💸 {t.withdraw}" = "💸 Withdraw"
    await expect(page.locator('.modal-header h3')).toBeVisible();

    // Fill withdrawal form
    await page.fill('#withdraw-amount', '100');
    await page.fill('input[placeholder*="account or phone number"]', '0911223344');
    await page.click('button#withdraw-confirm');

    // Wait for success
    await expect(page.locator('h3', { hasText: 'Withdrawal Request Submitted' })).toBeVisible({ timeout: 10000 });

    // Close the success modal by clicking overlay
    await page.click('.modal-overlay', { force: true, position: { x: 5, y: 5 } });

    // Logout
    await page.click('button:has-text("Sign Out")');
  });
});
