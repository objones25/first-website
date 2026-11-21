// Draws the 1200x630 share image for every page into public/og/.
//
//   npm run og
//
// Run it by hand after adding a project or changing a title or tagline, and
// commit the PNGs. It is not part of the build: it needs a local Chrome, which
// it drives headless to screenshot one small HTML card per page. The build
// fails if a page's image is missing, so a forgotten run is caught there.
//
// Needs Node 22.18 or later (it runs TypeScript directly). Chrome is found at
// the macOS default path; set CHROME_PATH to use another.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { shareImageFor, sitePages, type SitePage } from '../prerender/pages.ts'
import { profile } from '../src/data/profile.ts'
import { SITE_URL } from '../src/data/pageMeta.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const WIDTH = 1200
const HEIGHT = 630
const CHROME_TIMEOUT_MS = 30_000
// A PNG starts with these eight bytes, then an IHDR chunk holding width and height.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }

// Everything the card uses is inlined, so Chrome needs no file or network access.
function dataUrl(file: string): string {
  const mime = MIME[extname(file)]
  if (!mime) throw new Error(`og-images: no MIME type known for ${file}`)
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const FONTS = `
  @font-face { font-family: Inter; font-weight: 100 900;
    src: url(${dataUrl(join(ROOT, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'))}); }
  @font-face { font-family: Mono; font-weight: 100 800;
    src: url(${dataUrl(join(ROOT, 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'))}); }
`

// Colours are the site's tokens from src/index.css.
function cardHtml(page: SitePage): string {
  const picture = page.picture ? `<img src="${dataUrl(join(ROOT, 'public', page.picture))}" alt="" />` : ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${FONTS}
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; background: #0A0A0A; color: #E8E8E4; }
  body { font-family: Inter, sans-serif; padding: 64px 72px; display: flex; flex-direction: column; }
  .kicker, footer { font-family: Mono, monospace; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; color: #A8A8A4; }
  main { flex: 1; display: flex; align-items: center; gap: 56px; min-height: 0; }
  .text { flex: 1; min-width: 0; }
  h1 { font-size: ${page.heading.length > 22 ? 64 : 84}px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.05; }
  p { margin-top: 28px; font-size: 30px; line-height: 1.4; color: #A8A8A4;
      display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  img { height: 360px; border: 1px solid #333; image-rendering: pixelated; }
  footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #333; padding-top: 28px; text-transform: none; }
  .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #FFB200; margin-right: 16px; }
</style></head><body>
  <div class="kicker">// ${escapeHtml(page.kicker)}</div>
  <main>
    <div class="text">
      <h1>${escapeHtml(page.heading)}</h1>
      <p>${escapeHtml(page.description)}</p>
    </div>
    ${picture}
  </main>
  <footer>
    <span><span class="dot"></span>${escapeHtml(profile.name)}</span>
    <span>${escapeHtml(SITE_URL.replace('https://', ''))}</span>
  </footer>
</body></html>`
}

function assertPngSize(file: string): void {
  const bytes = readFileSync(file)
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`og-images: ${file} is not a PNG`)
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (width !== WIDTH || height !== HEIGHT) {
    throw new Error(`og-images: ${file} is ${width}x${height}, expected ${WIDTH}x${HEIGHT}`)
  }
}

if (!existsSync(CHROME)) {
  throw new Error(`og-images: Chrome not found at "${CHROME}". Set CHROME_PATH to a Chrome or Chromium binary.`)
}

const outDir = join(ROOT, 'public/og')
mkdirSync(outDir, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'og-images-'))

try {
  for (const page of sitePages()) {
    const htmlFile = join(work, 'card.html')
    const pngFile = join(ROOT, 'public', shareImageFor(page.path))
    writeFileSync(htmlFile, cardHtml(page))
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${WIDTH},${HEIGHT}`,
        `--user-data-dir=${join(work, 'profile')}`,
        `--screenshot=${pngFile}`,
        pathToFileURL(htmlFile).href,
      ],
      { stdio: 'ignore', timeout: CHROME_TIMEOUT_MS },
    )
    assertPngSize(pngFile)
    console.log(`wrote ${shareImageFor(page.path)}`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}
