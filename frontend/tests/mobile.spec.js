import { test, expect } from '@playwright/test';
import { login, expectNoErrorScreen, trackPageErrors } from './helpers';

// Run with: npm run test:mobile
test('@mobile landing page fits a phone screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, 'horizontal overflow').toBe(false);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('@mobile elder portal opens from the menu', async ({ page }) => {
  const errors = trackPageErrors(page);
  await login(page, 'elder');
  await expectNoErrorScreen(page);
  // The seeded medicine alarm is a full-screen overlay, so click through the DOM as the portal tests do
  await page.getByRole('button', { name: /open menu/i }).evaluate((el) => el.click());
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  expect(errors).toEqual([]);
});
