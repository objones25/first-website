// Turns the built index.html into the HTML file for one route. Pure string
// work with no file access, so it can be tested directly (pageHtml.test.ts).

export interface PageHead {
  // Absolute route path with no trailing slash, e.g. '/projects/pokemon-red-ppo'. Home is '/'.
  path: string
  // The full <title> text.
  title: string
  description: string
  // Site-absolute path of the share image, e.g. '/og/about.png'.
  image: string
  // Pages that should not be indexed (sign-in, demos behind sign-in).
  noindex?: boolean
}

const ROUTE_PATH = /^\/(?:[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*)?$/

function assertRoutePath(path: string): void {
  if (!ROUTE_PATH.test(path)) {
    throw new Error(`prerender: route path must look like "/a/b" with no trailing slash, got "${path}"`)
  }
}

// GitHub Pages serves /about from about.html with a 200 and no redirect.
export function htmlFileFor(path: string): string {
  assertRoutePath(path)
  return path === '/' ? 'index.html' : `${path.slice(1)}.html`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// Replaces exactly one match. Zero or two matches mean index.html changed
// shape, and writing a page with the wrong head would go unnoticed.
function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  const matches = html.match(new RegExp(pattern.source, 'g'))
  if (!matches || matches.length !== 1) {
    throw new Error(`prerender: expected exactly one ${what} in index.html, found ${matches?.length ?? 0}`)
  }
  // A function replacement, so "$1" or "$&" in the text is written as is.
  return html.replace(pattern, () => replacement)
}

function metaTag(html: string, attr: 'name' | 'property', key: string, content: string): string {
  return replaceOnce(
    html,
    new RegExp(`<meta ${attr}="${key}" content="[^"]*" />`),
    `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`,
    `<meta ${attr}="${key}">`,
  )
}

export function renderPageHtml(template: string, page: PageHead, siteUrl: string): string {
  assertRoutePath(page.path)
  const url = `${siteUrl}${page.path}`

  let html = replaceOnce(template, /<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`, '<title>')
  html = metaTag(html, 'name', 'description', page.description)
  html = metaTag(html, 'property', 'og:title', page.title)
  html = metaTag(html, 'property', 'og:description', page.description)
  html = metaTag(html, 'property', 'og:url', url)
  html = metaTag(html, 'property', 'og:image', `${siteUrl}${page.image}`)

  const extra = page.noindex
    ? '<meta name="robots" content="noindex" />'
    : `<link rel="canonical" href="${escapeHtml(url)}" />`
  return replaceOnce(html, /<\/head>/, `  ${extra}\n  </head>`, '</head>')
}
