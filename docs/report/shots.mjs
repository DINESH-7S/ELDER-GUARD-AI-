// Captures portal screenshots for the project report (needs dev servers + demo seed).
import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'figures');
const PASSWORD = 'DemoPass123!';
const browser = await chromium.launch();

async function session(role, pages) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.getByRole('radio', { name: new RegExp(`^${role}$`, 'i') }).click();
  await page.getByLabel(/email address or mobile number/i).fill(`${role}.demo@elderguard.ai`);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole('button', { name: new RegExp(`sign in as ${role}`, 'i') }).click();
  await page.locator('#main-content').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1800);
  for (const [name, idx] of pages) {
    await page.evaluate(() => document.querySelectorAll('[role=dialog],[aria-modal=true]').forEach((d) => { (d.closest('.fixed') || d).remove(); }));
    if (idx !== null) {
      await page.locator('aside nav button').filter({ hasText: idx }).first().evaluate((el) => el.click());
      await page.evaluate(() => document.querySelectorAll('[role=dialog],[aria-modal=true]').forEach((d) => { (d.closest('.fixed') || d).remove(); }));
      await page.waitForTimeout(1800);
    }
    await page.waitForTimeout(600);
    await page.evaluate(() => { for (const el of [...document.querySelectorAll('h1,h2,h3,p,div')].filter((e) => e.children.length === 0 && /Time for your medicine/.test(e.textContent))) { let n = el; while (n && !(getComputedStyle(n).position === 'fixed')) n = n.parentElement; if (n) n.remove(); } document.body.style.overflow = ''; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    console.log(name);
  }
  await ctx.close();
}

// public pages
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, 'landing.png') });
  await page.getByRole('button', { name: 'Sign In', exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'login.png') });
  await ctx.close();
}
await session('elder', [['elder-home', null], ['elder-medicines', 'Medicines'], ['elder-vitals', 'Vitals'], ['elder-assistant', 'AI']]);
await session('caregiver', [['caregiver-home', null], ['caregiver-2', 'Vitals']]);
await session('doctor', [['doctor-home', null], ['doctor-patients', 'Patients'], ['doctor-appointments', 'Appointments']]);
await session('hospital', [['hospital-home', null], ['hospital-dispatch', 'Emergency']]);
await session('pharmacy', [['pharmacy-home', null], ['pharmacy-orders', 'Orders']]);
await browser.close();
