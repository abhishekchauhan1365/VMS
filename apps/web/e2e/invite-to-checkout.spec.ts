import { test, expect, type Browser } from '@playwright/test';

const API_URL = 'http://localhost:4000/api/v1';

async function loginAs(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  return { context, page };
}

test.describe('invite -> e-pass -> QR check-in -> check-out', () => {
  test('a pre-approved guest can be checked in via QR and checked out from the board', async ({
    browser,
    request,
  }) => {
    // --- Host creates an invite through the real UI ---
    const host = await loginAs(browser, 'host2@vms.local');
    await expect(host.page).toHaveURL(/\/host\/invite/);

    const suffix = Date.now();
    await host.page.getByLabel('Event Title *').fill(`E2E Invite ${suffix}`);
    await host.page.locator('#office').selectOption({ index: 1 });
    await host.page.locator('#date').fill(new Date().toISOString().slice(0, 10));

    await host.page.getByPlaceholder('Full name').fill(`E2E Guest ${suffix}`);
    await host.page
      .getByPlaceholder('Phone', { exact: true })
      .fill(`+1555${String(suffix).slice(-7)}`);
    await host.page.getByLabel('Add guest').click();

    await expect(host.page.getByText('Added Guests (1)')).toBeVisible();

    const confirmButton = host.page.getByRole('button', { name: 'Confirm Invite' });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();
    await expect(host.page.getByText('Invite sent')).toBeVisible({ timeout: 10_000 });

    // --- Pull a QR token straight from the API (deterministic, no email inbox to parse) ---
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'host2@vms.local', password: 'Passw0rd!' },
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
        title: `E2E Direct Invite ${suffix}`,
        visitType: 'VENDOR',
        officeId: officesBody.offices[0].id,
        windowStart: new Date().toISOString(),
        windowEnd: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
        guests: [{ fullName: `E2E QR Guest ${suffix}`, phone: `+1666${String(suffix).slice(-7)}` }],
      },
    });
    const inviteBody = await invitesRes.json();
    const qrToken = inviteBody.visits[0].qrToken;
    const visitId = inviteBody.visits[0].visit.id;
    await host.context.close();

    // --- Visitor e-pass page renders the pass (no login needed — public route) ---
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/pass/${qrToken}`);
    await expect(visitorPage.getByText(`E2E QR Guest ${suffix}`)).toBeVisible();
    await expect(visitorPage.getByText('APPROVED')).toBeVisible();
    await visitorContext.close();

    // --- "Scan" the QR (kiosk check-in is camera-driven; call the same endpoint the
    //     kiosk's scan handler calls, which is the behavior under test) ---
    const verifyRes = await request.post(`${API_URL}/passes/verify`, { data: { token: qrToken } });
    expect(verifyRes.ok()).toBe(true);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.visit.status).toBe('CHECKED_IN');

    // --- Security logs in, opens the board, checks the guest out from the drawer ---
    const security = await loginAs(browser, 'security1@vms.local');
    await expect(security.page).toHaveURL(/\/desk\/board/);

    await security.page.getByPlaceholder('Search visitor or host').fill(`E2E QR Guest ${suffix}`);
    await expect(security.page.getByText(`E2E QR Guest ${suffix}`)).toBeVisible({
      timeout: 10_000,
    });
    await security.page.getByText(`E2E QR Guest ${suffix}`).click();

    await expect(security.page.getByRole('button', { name: 'Check Out' })).toBeVisible();
    await security.page.getByRole('button', { name: 'Check Out' }).click();
    await expect(security.page.getByText('Checked out', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await security.context.close();

    const finalRes = await request.get(`${API_URL}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const finalBody = await finalRes.json();
    expect(finalBody.visit.status).toBe('CHECKED_OUT');
  });
});
