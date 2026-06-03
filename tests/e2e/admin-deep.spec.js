import { test, expect } from '@playwright/test';

test.describe('Admin Deep E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('full admin lifecycle', async ({ page }) => {
    // 1. Login
    await page.fill('input[type="tel"]', '+251900000000');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.locator('h2', { hasText: 'Admin Dashboard' }).or(page.locator('h2', { hasText: 'አስተዳደር ዳሽቦርድ' }))).toBeVisible({ timeout: 10000 });

    // 2. Go to withdrawals tab
    await page.click('button.tab:has-text("Withdrawals")');
    
    // Check if there are any pending withdrawals, and approve the first one
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await expect(page.locator('.toast.success')).toBeVisible({ timeout: 5000 });
    }

    // 3. Approve Specific Animal Listing
    // Navigate to Animals section
    await page.click('button.tab:has-text("Animals"), button.tab:has-text("እንስሳት")');
    // Find Wollo listing (created in seller test) and approve it
    const wolloRow = page.locator('tr').filter({ hasText: 'Wollo' });
    if (await wolloRow.isVisible()) {
      await wolloRow.locator('button:has-text("Approve")').click();
      await expect(page.locator('.toast.success')).toBeVisible({ timeout: 5000 });
    }

    // 4. Go to Payouts tab
    await page.click('button.tab:has-text("Seller Payouts")');
    const processBtn = page.locator('button:has-text("Process Payout"), button:has-text("Disburse Escrow")').first();
    if (await processBtn.isVisible()) {
      await processBtn.click();
      // Handle confirm modal
      await page.fill('input[placeholder*="reference number"]', 'TXN-9999');
      await page.click('button:has-text("Confirm"), button:has-text("Transfer")');
      await expect(page.locator('.toast.success')).toBeVisible({ timeout: 5000 });
    }

    // 5. Broadcast System Notification
    // Navigate back to overview to access the quick action card
    await page.click('button.tab:has-text("Overview"), button.tab:has-text("አጠቃላይ እይታ")');
    await page.click('.card:has-text("Broadcast Notification"), .card:has-text("ማሳወቂያ ማሰራጫ")');
    await page.fill('#broadcast-title', 'Marketplace Update');
    await page.fill('#broadcast-message', 'Platform maintenance scheduled for tonight.');
    await page.click('.modal-footer button.btn-primary');
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 5000 });
  });
});
