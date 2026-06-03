import { test, expect } from '@playwright/test';

test.describe('Seller Role E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can login and view seller dashboard', async ({ page }) => {
    // 1. Login as seeded seller
    await page.fill('input[type="tel"]', '+251966789012');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 });

    // 2. Open Add Animal modal
    await page.click('button:has-text("Add New Listing")');
    await expect(page.locator('h3:has-text("➕ Add New Livestock Listing")')).toBeVisible();
    await page.click('button:has-text("✕")'); // Close button

    // Logout
    await page.click('button:has-text("Sign Out")');
  });
});
