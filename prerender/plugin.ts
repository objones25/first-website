import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { SITE_URL } from '../src/data/pageMeta.ts'
import { htmlFileFor, renderPageHtml, type PageHead } from './pageHtml.ts'
import { indexedHeads, shellHeads } from './pages.ts'

// After the bundle is written, give every route its own HTML file.
//
// The site is a single-page app on GitHub Pages. Without this, only "/" exists
// as a file: any other address is answered by 404.html with HTTP status 404 and
// a script redirect, so crawlers see an error and link previews show the home
// page's title for every page. Each file written here is the built index.html
// with that route's title, description, canonical URL and share image; the app
// then starts as usual. 404.html stays for addresses that are not listed.
export function prerenderRoutes(): Plugin {
  let outDir = ''

  return {
    name: 'prerender-routes',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf8')
      const indexed = indexedHeads()
      const heads: PageHead[] = [...indexed, ...shellHeads()]

      const rendered = heads.map(page => {
        if (!existsSync(join(outDir, page.image))) {
          throw new Error(
            `prerender: share image ${page.image} for ${page.path} is missing. ` +
              'Run "npm run og" and commit the files it writes to public/og/.',
          )
        }
        return { page, html: renderPageHtml(template, page, SITE_URL) }
      })

      for (const { page, html } of rendered) {
        const file = join(outDir, htmlFileFor(page.path))
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, html)
      }

      // Second pass, once every folder exists: where a route is also a folder
      // (/projects holds each project's images), the folder gets the same page
      // as its index.html, so the address answers whichever of the two the host
      // looks for first.
      for (const { page, html } of rendered) {
        if (page.path === '/') continue
        const dir = join(outDir, page.path)
        if (existsSync(dir) && statSync(dir).isDirectory()) writeFileSync(join(dir, 'index.html'), html)
      }

      const urls = indexed.map(page => `  <url><loc>${SITE_URL}${page.path}</loc></url>`)
      writeFileSync(
        join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      )
    },
  }
}
