import { test, expect } from '@playwright/test';
import { login, navLabels, openNav } from './helpers';

// The demo story, end to end. Needs the demo seed: python backend/seed_connected_demo.py
// Everything here is read from the real API, nothing is mocked.

async function openPage(page, label) {
  const labels = await navLabels(page);
  const index = labels.findIndex((l) => l.toLowerCase().includes(label.toLowerCase()));
  expect(index, `nav item "${label}" exists`).toBeGreaterThanOrEqual(0);
  await openNav(page, index);
  await page.waitForTimeout(500);
}

test.describe('demo story', () => {
  test('doctor has Anaya on the roster and credentials are not over-claimed', async ({ page }) => {
    await login(page, 'doctor');
    await openPage(page, 'Appointments');
    await expect(page.getByText('Anaya Rao').first()).toBeVisible();

    await openPage(page, 'Settings');
    await expect(page.getByText('Audit Certified')).toHaveCount(0);
    await expect(page.getByText('HIPAA Telehealth Security')).toHaveCount(0);
    await expect(page.getByText('VERIFIED CLINICIAN')).toHaveCount(0);
    await expect(page.getByText('LICENSE ON FILE')).toBeVisible();
  });

  test('prescriptions written by the doctor reach the pharmacy queue', async ({ page }) => {
    await login(page, 'pharmacy');
    await openPage(page, 'Orders');
    await expect(page.getByText('Metformin 500 mg').first()).toBeVisible();
    await expect(page.getByText('Atorvastatin 10 mg').first()).toBeVisible();
    await expect(page.getByText('Anaya Rao').first()).toBeVisible();
  });

  test('pharmacy screens show real data or honest empty states, not invented figures', async ({ page }) => {
    await login(page, 'pharmacy');

    await openPage(page, 'Delivery');
    for (const invented of ['22 Mins', '98.2%', '3 Couriers', 'Rider Unit 1', '33 / 34']) {
      await expect(page.getByText(invented), `Delivery shows "${invented}"`).toHaveCount(0);
    }

    await openPage(page, 'Subscriptions');
    for (const invented of ['142 Active', '97.8%', 'Harold Finch', 'Beatrice Lawson']) {
      await expect(page.getByText(invented), `Subscriptions shows "${invented}"`).toHaveCount(0);
    }
    // Subscriptions are built from the seeded prescriptions that still have refills
    await expect(page.getByText('Metformin 500 mg').first()).toBeVisible();

    await openPage(page, 'Inventory');
    await expect(page.getByText('96% catalog in stock')).toHaveCount(0);
    await expect(page.getByText('Restock PO sent')).toHaveCount(0);

    await openPage(page, 'Settings');
    await expect(page.getByText('GreenLeaf Pharmacy').first()).toBeVisible();
    for (const invented of ['Marcus Brody', 'Elena Rostova', 'PHARM-CA-88192-X']) {
      await expect(page.getByText(invented), `Settings shows "${invented}"`).toHaveCount(0);
    }
  });

  test('landing page describes escalation the way the system really behaves', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('After 5 minutes', { exact: true })).toBeVisible();
    await expect(page.getByText(/push, an SMS and a call/i)).toHaveCount(0);
    await expect(page.getByText(/ambulance are called automatically/i)).toHaveCount(0);
  });
});
