import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = path.join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots');

async function shoot(page: Page, name: string) {
  await page.waitForTimeout(400); // let toasts/animations settle
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe.serial('screenshots', () => {
  test('login', async ({ page }) => {
    await page.goto('/login');
    await shoot(page, '01-login');
  });

  test('host screens', async ({ page }) => {
    await login(page, 'host3@vms.local');
    await expect(page).toHaveURL(/\/host\/invite/);
    await shoot(page, '02-host-invite');

    await page.goto('/host/approvals');
    await shoot(page, '03-host-approvals');

    await page.goto('/host/history');
    await shoot(page, '04-host-history');
  });

  test('front desk screens', async ({ page }) => {
    await login(page, 'security1@vms.local');
    await expect(page).toHaveURL(/\/desk\/board/);
    await shoot(page, '05-desk-board');

    // Open the Guest Details drawer on the first row, if any.
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(500);
      await shoot(page, '06-desk-guest-details');
      await page.keyboard.press('Escape');
    }

    await page.goto('/desk/walk-in');
    await shoot(page, '07-desk-walkin');
  });

  test('kiosk', async ({ page }) => {
    await page.goto('/kiosk');
    await page.waitForTimeout(1000);
    await shoot(page, '08-kiosk');
  });

  test('visitor e-pass', async ({ page, request }) => {
    const API_URL = 'http://localhost:4000/api/v1';
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'host4@vms.local', password: 'Passw0rd!' },
    });
    const { accessToken } = await loginRes.json();
    const officesBody = await (
      await request.get(`${API_URL}/offices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ).json();
    const invitesRes = await request.post(`${API_URL}/invites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        title: 'Screenshot Demo Invite',
        visitType: 'INTERVIEW',
        officeId: officesBody.offices[0].id,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
        guests: [{ fullName: 'Priya Sharma', phone: `+1${String(Date.now()).slice(-9)}` }],
      },
    });
    const inviteBody = await invitesRes.json();
    const qrToken = inviteBody.visits[0].qrToken;

    await page.goto(`/pass/${qrToken}`);
    await shoot(page, '09-visitor-epass');
  });

  test('admin screens', async ({ page }) => {
    await login(page, 'admin@vms.local');
    await expect(page).toHaveURL(/\/admin\/analytics/);
    await page.waitForTimeout(1200); // let Recharts finish its entry animation
    await shoot(page, '10-admin-analytics');

    await page.goto('/admin/policies');
    await shoot(page, '11-admin-policies');

    await page.goto('/admin/watchlist');
    await shoot(page, '12-admin-watchlist');

    await page.goto('/admin/audit');
    await shoot(page, '13-admin-audit');
  });
});
