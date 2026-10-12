import { test, expect } from '@playwright/test';
import { ROLES, login, navLabels, openNav, expectNoErrorScreen, trackPageErrors } from './helpers';

test.describe('portals load without errors', () => {
  for (const role of ROLES) {
    test(`${role}: every sidebar page renders`, async ({ page }) => {
      const errors = trackPageErrors(page);
      await login(page, role);
      await expectNoErrorScreen(page);

      const labels = await navLabels(page);
      expect(labels.length, 'sidebar has navigation items').toBeGreaterThan(2);

      for (let i = 0; i < labels.length; i++) {
        await openNav(page, i);
        await expectNoErrorScreen(page);
        await expect(page.locator('#main-content'), `${role} > ${labels[i]}`).toBeVisible();
      }

      expect(errors, 'uncaught page errors').toEqual([]);
    });
  }
});

test('elder portal does not scroll sideways', async ({ page }) => {
  await login(page, 'elder');
  const labels = await navLabels(page);
  for (let i = 0; i < labels.length; i++) {
    await openNav(page, i);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `horizontal overflow on elder > ${labels[i]}`).toBe(false);
  }
});

test('login rejects a wrong password with a visible alert', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.getByLabel(/email address or mobile number/i).fill('elder.demo@elderguard.ai');
  await page.getByLabel(/^password$/i).fill('definitely-wrong');
  await page.getByRole('button', { name: /sign in as/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('sign out returns to the landing page', async ({ page }) => {
  await login(page, 'caregiver');
  await page.getByRole('button', { name: /sign out/i }).first().evaluate((el) => el.click());
  await expect(page.getByRole('button', { name: 'Sign In', exact: true }).first()).toBeVisible();
});
