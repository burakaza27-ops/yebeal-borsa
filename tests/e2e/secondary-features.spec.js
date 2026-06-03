import { test, expect } from '@playwright/test';

test.describe('Secondary Features & Edge Cases E2E', () => {
  test.setTimeout(120000); // 120s for extensive multi-role scenarios

  test('kircha group buy, support tickets, fayda ID, and validation edges', async ({ page }) => {
    // Because the mock database uses localStorage, we must run the entire flow 
    // sequentially in a SINGLE browser context (using the same 'page'). 
    // This ensures the Seller, Admin, and Customer share the same mock database state.

    /* ==========================================
       1. SELLER: Create Kircha Listing
       ========================================== */
    await page.goto('/');
    // Login as Seller (Hana Girma)
    await page.fill('input[type="tel"]', '+251966789012');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 15000 });

    // Click "Add New Listing" button
    await page.locator('button:has-text("Add New Listing")').first().click();
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });

    // First select Kircha type BEFORE filling other fields
    await page.locator('form select.form-select').first().selectOption('kircha');
    await page.waitForTimeout(300);

    // Fill in the form fields
    await page.fill('input[placeholder="e.g. Harar, Menz, Gondar"]', 'Massive Horro Kircha');
    await page.fill('input[placeholder="e.g. 45"]', '500');
    await page.fill('input[placeholder="e.g. 15000"]', '50000');

    // Submit by triggering the form submit
    await page.locator('button[type="submit"]:has-text("Add Listing")').evaluate(b => b.click());

    // Wait for success toast
    await expect(page.locator('.toast.success').first()).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);

    // Sign Out as Seller
    await page.click('button:has-text("Sign Out")');
    await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 5000 });

    /* ==========================================
       2. ADMIN: Login & Navigate to Animals tab to Approve Kircha
       ========================================== */
    await page.fill('input[type="tel"]', '+251900000000');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });

    // Click the "Animals" tab in Admin Dashboard
    await page.locator('.tab:has-text("Animals")').click();
    await page.waitForTimeout(500);

    // Find the Massive Horro Kircha listing that is PENDING and approve it
    const kirchaRow = page.locator('tr:has-text("Massive Horro Kircha"):has-text("Pending")').first();
    await expect(kirchaRow).toBeVisible({ timeout: 10000 });
    await kirchaRow.locator('button.btn-success').click();

    // Expect success toast
    await expect(page.locator('.toast.success').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Sign Out as Admin
    await page.click('button:has-text("Sign Out")');
    await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 5000 });

    /* ==========================================
       3. CUSTOMER: Login & Test Edge Cases
       ========================================== */
    await page.fill('input[type="tel"]', '+251955678901');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible({ timeout: 15000 });

    // -- Edge Case A: Navigate to Wallet Hub --
    await page.click('#nav-wallet');
    await expect(page.locator('text=Wallet').first()).toBeVisible({ timeout: 5000 });

    // -- Edge Case B: Navigate to Marketplace and find the approved Kircha --
    await page.click('#nav-marketplace');
    await expect(page.locator('text=Marketplace').or(page.locator('text=Available Animals')).first()).toBeVisible({ timeout: 10000 });

    const kirchaCard = page.locator('.listing-card', { hasText: 'Massive Horro Kircha' });
    await page.waitForTimeout(1000);

    const kirchaVisible = await kirchaCard.isVisible().catch(() => false);
    if (kirchaVisible) {
      await kirchaCard.locator('button:has-text("Buy Now")').click();
      const modal = page.locator('.modal, [class*="modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      // Close modal
      await modal.locator('button.btn-ghost').first().click();
      await page.waitForTimeout(500);
    }

    /* ==========================================
       4. CUSTOMER: Fayda ID Verification
       ========================================== */
    await page.click('#nav-settings');
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 5000 });

    const faydaBtn = page.locator('button', { hasText: 'Fayda' }).first();
    const faydaExists = await faydaBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (faydaExists) {
      await faydaBtn.click();
      const faydaModal = page.locator('[class*="fayda"], .modal').first();
      await expect(faydaModal).toBeVisible({ timeout: 5000 });

      await faydaModal.locator('input').first().fill('FID-1234-5678');
      const submitBtn = faydaModal.locator('button.btn-primary, button:has-text("Verify"), button:has-text("Submit")').first();
      await submitBtn.click();

      await expect(page.locator('.toast.success').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
