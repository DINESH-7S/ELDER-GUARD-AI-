import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1148, height: 800 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(here, 'diagrams.html')).href);
for (const id of ['architecture', 'usecase', 'dfd', 'sosflow', 'rxflow', 'er']) {
  await page.locator('#' + id).screenshot({ path: path.join(here, 'figures', `d-${id}.png`) });
  console.log(id);
}
await browser.close();
