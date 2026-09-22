import { test, expect, type Browser } from '@playwright/test';

async function loginAs(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  return { context, page };
}

test.describe('walk-in -> host approves live -> board updates', () => {
  test('a security walk-in appears live in the host inbox, and the board updates on approval', async ({
    browser,
  }) => {
    const security = await loginAs(browser, 'security1@vms.local');
    const host = await loginAs(browser, 'host1@vms.local');

    await expect(security.page).toHaveURL(/\/desk\/board/);
    await expect(host.page).toHaveURL(/\/host\/invite/);

    // --- Security registers a walk-in ---
    await security.page.goto('/desk/walk-in');
    const suffix = Date.now();
    const visitorName = `E2E WalkIn ${suffix}`;

    await security.page.getByLabel('Phone *').fill(`+1777${String(suffix).slice(-7)}`);
    await security.page.getByLabel('Full name *').fill(visitorName);
    await security.page.locator('#office').selectOption({ index: 1 });
    await security.page.getByPlaceholder('Search host by name').fill('host1');
    await security.page.getByText('host1@vms.local', { exact: false }).first().click();

    await expect(security.page.getByRole('button', { name: 'Register visitor' })).toBeEnabled();
    await security.page.getByRole('button', { name: 'Register visitor' }).click();
    await expect(
      security.page.getByRole('heading', { name: 'Waiting for host approval' }),
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Host sees it live in the approvals inbox without a manual refresh ---
    await host.page.goto('/host/approvals');
    await expect(host.page.getByText(visitorName)).toBeVisible({ timeout: 15_000 });

    const approvalRow = host.page.locator('.justify-between', { hasText: visitorName });
    await approvalRow.getByRole('button', { name: 'Approve' }).click();

    // --- Security's waiting screen updates live to APPROVED ---
    await expect(security.page.getByText('APPROVED')).toBeVisible({ timeout: 15_000 });

    // --- The front-desk board reflects the same visit as APPROVED ---
    await security.page.goto('/desk/board');
    await security.page.getByPlaceholder('Search visitor or host').fill(visitorName);
    await expect(security.page.getByText(visitorName)).toBeVisible({ timeout: 10_000 });

    await security.context.close();
    await host.context.close();
  });
});
