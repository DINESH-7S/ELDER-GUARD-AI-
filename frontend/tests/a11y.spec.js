import { test } from '@playwright/test';
import { ROLES, login, navLabels, openNav, expectAccessible } from './helpers';

// Scan the settled UI: reduced motion disables the entrance animations so axe never
// measures contrast on a card that is still fading in.
test.use({ reducedMotion: 'reduce' });

test.describe('accessibility (axe, WCAG 2.1 A/AA)', () => {
  test('landing page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expectAccessible(page, testInfo);
  });

  test('login page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
    await page.getByLabel(/email address or mobile number/i).waitFor();
    await expectAccessible(page, testInfo);
  });

  test('register page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
    await page.getByRole('button', { name: /register here/i }).click();
    await page.getByRole('heading', { name: /create your account/i }).waitFor();
    await expectAccessible(page, testInfo);
  });

  for (const role of ROLES) {
    test(`${role} portal pages`, async ({ page }, testInfo) => {
      await login(page, role);
      const labels = await navLabels(page);
      for (let i = 0; i < labels.length; i++) {
        await openNav(page, i);
        await test.step(`${role} > ${labels[i]}`, async () => {
          await expectAccessible(page, testInfo);
        });
      }
    });
  }
});
