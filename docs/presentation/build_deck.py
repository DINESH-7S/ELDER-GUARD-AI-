"""Build the ElderGuard mini-project deck.

  python docs/presentation/build_deck.py

Fills the {{i:IconName}} tokens in deck.template.html with inline SVG icons (assets/icons.json),
writes deck.html, then renders deck.html to ElderGuard_Mini_Project_Presentation.pdf with Chromium.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
icons = json.loads((here / "assets" / "icons.json").read_text(encoding="utf8"))
html = (here / "deck.template.html").read_text(encoding="utf8")

missing = set()


def fill(match):
    name = match.group(1)
    if name not in icons:
        missing.add(name)
        return ""
    return icons[name]


html = re.sub(r"\{\{i:(\w+)\}\}", fill, html)
if missing:
    sys.exit(f"Missing icons: {sorted(missing)}")
(here / "deck.html").write_text(html, encoding="utf8")
print("deck.html written")

node = r"""
import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(pathToFileURL(path.join(here, 'deck.html')).href, { waitUntil: 'load' });
await page.waitForTimeout(500);
await page.pdf({ path: path.join(here, 'ElderGuard_Mini_Project_Presentation.pdf'), width: '1440px', height: '810px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('pdf written');
"""
(here / "_render.mjs").write_text(node, encoding="utf8")
subprocess.run(["node", str(here / "_render.mjs")], check=True, cwd=here)
(here / "_render.mjs").unlink()
