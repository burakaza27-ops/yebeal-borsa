import { test, expect } from '@playwright/test';

test.describe('Customer Deep E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('full customer lifecycle', async ({ page }) => {
    test.setTimeout(60000); // 60s for full lifecycle

    // 1. Login
    await page.fill('input[type="tel"]', '+251911234567');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible({ timeout: 10000 });

    // 2. Add Family Wallet
    await page.click('#nav-wallet');
    // Ensure we are on the Wallets tab (not a previously-remembered tab)
    await page.locator('.tab', { hasText: 'Wallets' }).or(page.locator('.tab', { hasText: '💳' })).first().click();
    await page.click('button:has-text("Add Family")');
    await page.fill('#family-name', 'Spouse');
    await page.fill('input[type="number"]', '2000');
    await page.click('button.btn-success:has-text("Add Member")');
    await expect(page.locator('.toast:has-text("created successfully")')).toBeVisible({ timeout: 5000 });
    // Ensure previous toast is hidden to prevent strict mode violation on next check
    await expect(page.locator('.toast:has-text("created successfully")')).toBeHidden({ timeout: 5000 });

    // 3. Wallet Transfer (Primary -> Family)
    await page.click('button:has-text("Transfer")');
    await expect(page.locator('.modal h3')).toBeVisible({ timeout: 5000 });
    await page.fill('#transfer-amount', '500');
    // Select the To wallet (second select in the modal)
    const selects = page.locator('.modal select');
    await selects.nth(0).selectOption({ index: 1 }); // From Primary Wallet
    await selects.nth(1).selectOption({ index: 3 }); // To Family Wallet (Spouse)
    await page.click('.modal-footer button.btn-primary');
    await expect(page.locator('.toast:has-text("Transfer completed successfully")').or(page.locator('.toast:has-text("completed successfully")'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.modal-overlay')).toBeHidden({ timeout: 5000 });

    // 4. Holiday Planner — Join a goal
    await page.click('#nav-holidays');
    await expect(page.locator('h2', { hasText: 'Holiday Planner' }).or(page.locator('h2', { hasText: 'የበዓል ዕቅድ' }))).toBeVisible({ timeout: 10000 });
    // Click "Set Goal" (the only btn-success on unjoined cards)
    await page.locator('.holiday-card button.btn-success').first().click();
    // Modal: Set savings goal
    await expect(page.locator('#join-target')).toBeVisible({ timeout: 5000 });
    await page.fill('#join-target', '10000');
    await page.click('#join-confirm');
    await expect(page.locator('.toast:has-text("started successfully")').or(page.locator('.toast:has-text("started")'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast:has-text("started successfully")').or(page.locator('.toast:has-text("started")'))).toBeHidden({ timeout: 5000 });

    // 5. Holiday Deposit
    // Click the "Deposit" button on the first joined holiday card (btn-primary on the card)
    await page.locator('.holiday-card button.btn-primary').first().click();
    await expect(page.locator('#holiday-deposit-amount')).toBeVisible({ timeout: 5000 });
    await page.fill('#holiday-deposit-amount', '1500');
    
    const holidayDepositBtn = page.locator('.modal-footer button.btn-success');
    await expect(holidayDepositBtn).toBeEnabled({ timeout: 10000 });
    await holidayDepositBtn.click();
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 5000 });

    // 6. Withdrawal Request
    await page.click('#nav-wallet');
    // Must click the Wallets tab — the page remembers the last active tab
    await page.locator('.tab', { hasText: 'Wallets' }).or(page.locator('.tab', { hasText: '💳' })).first().click();
    // Use the action-bar button specifically (not the tab which also contains "Withdraw")
    const withdrawBtn = page.locator('.action-bar button:has-text("Withdraw")');
    await expect(withdrawBtn).toBeVisible({ timeout: 5000 });
    await withdrawBtn.click();
    await expect(page.locator('.modal h3')).toBeVisible({ timeout: 5000 });
    // Select CBE Birr method
    await page.click('button:has-text("CBE Birr")');
    // Fill phone number
    await page.locator('.modal input[type="text"]').first().fill('0911234567');
    // Fill amount
    await page.locator('.modal input[type="number"]').fill('1000');
    // Submit
    await page.click('.modal-footer button.btn-primary');
    await expect(page.locator('.toast:has-text("Withdrawal request submitted")').or(page.locator('.toast:has-text("Withdrawal")'))).toBeVisible({ timeout: 5000 });

    // 7. Marketplace Order
    await page.click('#nav-marketplace');
    await expect(page.locator('.search-input, input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });
    await page.fill('.search-input, input[placeholder*="Search"]', 'Menz');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Buy Now")').first().click();

    // Order Modal
    await expect(page.locator('label', { hasText: 'Delivery Address' }).or(page.locator('label', { hasText: 'የማድረሻ አድራሻ' }))).toBeVisible();

    // Fill delivery details
    await page.fill('input[placeholder*="Bole"]', 'Bole Woreda 03');
    await page.fill('input[type="date"]', new Date(Date.now() + 86400000).toISOString().slice(0, 10));

    // Checkout
    await page.click('button:has-text("Confirm"):visible', { force: true });

    // Success Toast
    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 10000 });
  });
});
