import { test } from 'node:test'
import assert from 'node:assert/strict'
import { htmlFileFor, renderPageHtml } from './pageHtml.ts'

const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Site title</title>
    <meta name="description" content="Site description" />
    <meta property="og:title" content="Site title" />
    <meta property="og:description" content="Site description" />
    <meta property="og:url" content="https://example.com/" />
    <meta property="og:image" content="https://example.com/old.png" />
  </head>
  <body><div id="root"></div></body>
</html>`

const PAGE = {
  path: '/about',
  title: 'About · Owen Jones',
  description: 'A page about me.',
  image: '/og/about.png',
}

test('writes the page title, description, url and image into the head', () => {
  const html = renderPageHtml(TEMPLATE, PAGE, 'https://example.com')
  assert.match(html, /<title>About · Owen Jones<\/title>/)
  assert.match(html, /<meta name="description" content="A page about me." \/>/)
  assert.match(html, /<meta property="og:title" content="About · Owen Jones" \/>/)
  assert.match(html, /<meta property="og:description" content="A page about me." \/>/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example.com\/about" \/>/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example.com\/og\/about.png" \/>/)
  assert.match(html, /<link rel="canonical" href="https:\/\/example.com\/about" \/>/)
})

test('leaves the body untouched', () => {
  const html = renderPageHtml(TEMPLATE, PAGE, 'https://example.com')
  assert.ok(html.includes('<body><div id="root"></div></body>'))
})

test('the home page url keeps its trailing slash', () => {
  const html = renderPageHtml(TEMPLATE, { ...PAGE, path: '/' }, 'https://example.com')
  assert.match(html, /<link rel="canonical" href="https:\/\/example.com\/" \/>/)
})

test('escapes text that would break out of an attribute or the title', () => {
  const html = renderPageHtml(
    TEMPLATE,
    { ...PAGE, title: 'A <b> & "c"', description: 'x "y" <z> & w' },
    'https://example.com',
  )
  assert.match(html, /<title>A &lt;b&gt; &amp; &quot;c&quot;<\/title>/)
  assert.match(html, /<meta name="description" content="x &quot;y&quot; &lt;z&gt; &amp; w" \/>/)
})

test('a replacement containing $ is written literally', () => {
  const html = renderPageHtml(TEMPLATE, { ...PAGE, description: 'costs $1 and $& more' }, 'https://example.com')
  assert.ok(html.includes('content="costs $1 and $&amp; more"'))
})

test('a page marked noindex gets a robots tag and no canonical link', () => {
  const html = renderPageHtml(TEMPLATE, { ...PAGE, noindex: true }, 'https://example.com')
  assert.match(html, /<meta name="robots" content="noindex" \/>/)
  assert.ok(!html.includes('rel="canonical"'))
})

test('throws when the template is missing a tag it must replace', () => {
  const broken = TEMPLATE.replace('<meta property="og:image" content="https://example.com/old.png" />', '')
  assert.throws(() => renderPageHtml(broken, PAGE, 'https://example.com'), /og:image/)
})

test('throws when the template has a tag twice', () => {
  const doubled = TEMPLATE.replace('<title>Site title</title>', '<title>a</title><title>b</title>')
  assert.throws(() => renderPageHtml(doubled, PAGE, 'https://example.com'), /title/)
})

test('rejects a path that is not a clean absolute path', () => {
  for (const path of ['about', '/a/../b', '/a//b', '/about/', '/a?b', '/a b']) {
    assert.throws(() => htmlFileFor(path), /path/, path)
  }
})

test('maps a route to the file GitHub Pages serves for it', () => {
  assert.equal(htmlFileFor('/'), 'index.html')
  assert.equal(htmlFileFor('/about'), 'about.html')
  assert.equal(htmlFileFor('/projects/pokemon-red-ppo'), 'projects/pokemon-red-ppo.html')
})
