import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

export const PASSWORD = 'DemoPass123!';

// Seeded by backend/seed_connected_demo.py
export const ROLES = ['elder', 'caregiver', 'doctor', 'hospital', 'pharmacy'];
export const emailFor = (role) => `${role}.demo@elderguard.ai`;

const ERROR_BOUNDARY_TEXT = 'Display Refresh Recovery';

/** Collects uncaught page errors so a test can assert none happened. */
export function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Signs in through the real login form. */
export async function login(page, role) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.getByRole('radio', { name: new RegExp(`^${role}$`, 'i') }).click();
  await page.getByLabel(/email address or mobile number/i).fill(emailFor(role));
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole('button', { name: new RegExp(`sign in as ${role}`, 'i') }).click();
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
}

/** Visible labels of the sidebar navigation, in order. */
export async function navLabels(page) {
  const buttons = page.locator('aside nav button');
  const n = await buttons.count();
  const labels = [];
  for (let i = 0; i < n; i++) labels.push((await buttons.nth(i).innerText()).replace(/\s+/g, ' ').trim());
  return labels;
}

/**
 * Opens a nav item by index. Uses a DOM click so an open medicine-alarm
 * overlay (shown to the elder demo account) cannot intercept the click.
 */
export async function openNav(page, index) {
  await page.locator('aside nav button').nth(index).evaluate((el) => el.click());
  await page.waitForTimeout(700);
}

export async function expectNoErrorScreen(page) {
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
}

/**
 * Runs axe (WCAG 2.0/2.1 A and AA). Fails on violations at or above `failOn`
 * (default "serious"; set A11Y_FAIL_ON=moderate to be stricter) and attaches
 * the full list to the test report either way.
 */
export async function expectAccessible(page, testInfo, { exclude = [] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(
      violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target })),
      null,
      2
    ),
    contentType: 'application/json',
  });

  const levels = ['minor', 'moderate', 'serious', 'critical'];
  const threshold = levels.indexOf(process.env.A11Y_FAIL_ON || 'serious');
  const blocking = violations.filter((v) => levels.indexOf(v.impact) >= threshold);
  expect(
    blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.help}`),
    'accessibility violations at or above the failure threshold'
  ).toEqual([]);
}
