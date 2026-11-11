import assert from 'node:assert/strict'
import test from 'node:test'
import { getArticles } from '../services/news.js'

function rss(items) {
  return `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
    <title>Test news</title><link>https://example.com</link><description>Test feed</description>
    ${items.map(({ title, date, link, media = '' }) => `<item>
      <title>${title}</title><link>${link || `https://example.com/${title}`}</link>
      ${date ? `<pubDate>${date}</pubDate>` : ''}
      ${media}
    </item>`).join('')}
  </channel></rss>`
}

test('sorts across feeds by publication time and keeps missing or invalid dates last', async (t) => {
  // Replace network requests with fixed RSS so this check works offline.
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/world/')) {
      return new Response(rss([
        { title: 'undated' },
        { title: 'middle', date: 'Wed, 11 Nov 2026 12:00:00 GMT' },
        { title: 'invalid', date: 'not a date' },
      ]))
    }
    if (url.includes('/business/')) {
      return new Response(rss([
        { title: 'oldest', date: 'Fri, 01 Jan 1965 00:00:00 GMT' },
      ]))
    }
    return new Response(rss([
      // 08:00 at UTC-5 is 13:00 UTC, later than the World article.
      { title: 'newest', date: 'Wed, 11 Nov 2026 08:00:00 -0500' },
    ]))
  })

  const articles = await getArticles()

  assert.deepEqual(articles.map((article) => article.title), [
    'newest', 'middle', 'oldest', 'undated', 'invalid',
  ])
  assert.equal(articles[0].publishedAt, '2026-11-11T13:00:00.000Z')
  assert.equal(articles[1].publishedAt, '2026-11-11T12:00:00.000Z')
  assert.equal(articles[3].publishedAt, null)
  assert.equal(articles[4].publishedAt, null)
})

test('removes repeated URLs within and across feeds while keeping distinct articles', async (t) => {
  const sharedUrl = 'https://example.com/shared'
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/world/')) {
      return new Response(rss([
        { title: 'Original headline', link: sharedUrl, date: 'Mon, 09 Nov 2026 12:00:00 GMT' },
        { title: 'Repeated in World', link: sharedUrl, date: 'Tue, 10 Nov 2026 12:00:00 GMT' },
      ]))
    }
    if (url.includes('/business/')) {
      return new Response(rss([
        { title: 'Repeated in Business', link: sharedUrl, date: 'Wed, 11 Nov 2026 12:00:00 GMT' },
        { title: 'Original headline', link: 'https://example.com/other', date: 'Tue, 10 Nov 2026 12:00:00 GMT' },
      ]))
    }
    return new Response(rss([
      { title: 'Technology story', link: 'https://example.com/technology', date: 'Wed, 11 Nov 2026 13:00:00 GMT' },
    ]))
  })

  const articles = await getArticles()

  assert.deepEqual(articles.map((article) => article.url), [
    'https://example.com/technology', 'https://example.com/other', sharedUrl,
  ])
  const sharedArticle = articles.find((article) => article.url === sharedUrl)
  assert.equal(sharedArticle.title, 'Original headline')
  assert.equal(sharedArticle.category, 'World')
  assert.equal(sharedArticle.publishedAt, '2026-11-09T12:00:00.000Z')
  assert.equal(sharedArticle.id, sharedUrl)
  assert.equal(new Set(articles.map((article) => article.id)).size, articles.length)
})

test('extracts publisher images and ignores missing, invalid, or non-image media', async (t) => {
  const items = [
    { title: 'thumbnail', media: '<media:thumbnail url="https://example.com/thumb.jpg" />' },
    { title: 'content', media: '<media:content medium="image" url="https://example.com/photo.jpg" />' },
    { title: 'typed-content', media: '<media:content type="image/jpeg" url="https://example.com/typed.jpg" />' },
    { title: 'guardian-format', media: '<media:content width="140" url="https://example.com/photo.jpg?width=140" /><media:content width="700" url="https://example.com/photo.jpg?width=700" />' },
    { title: 'enclosure', media: '<enclosure type="image/jpeg" url="https://example.com/enclosed.jpg" length="100" />' },
    { title: 'missing' },
    { title: 'video', media: '<media:content medium="video" url="https://example.com/video.mp4" />' },
    { title: 'untyped-video', media: '<media:content url="https://example.com/video.mp4" />' },
    { title: 'unsafe', media: '<media:thumbnail url="javascript:alert(1)" />' },
    { title: 'invalid', media: '<media:thumbnail url="not-a-url" />' },
    { title: 'fallback', media: '<media:thumbnail url="not-a-url" /><media:thumbnail url="https://example.com/fallback.jpg" />' },
  ]
  t.mock.method(globalThis, 'fetch', async () => new Response(rss(items)))

  const articles = await getArticles()
  const images = Object.fromEntries(articles.map((article) => [article.title, article.imageUrl]))

  assert.deepEqual(images, {
    thumbnail: 'https://example.com/thumb.jpg',
    content: 'https://example.com/photo.jpg',
    'typed-content': 'https://example.com/typed.jpg',
    'guardian-format': 'https://example.com/photo.jpg?width=700',
    enclosure: 'https://example.com/enclosed.jpg',
    missing: null,
    video: null,
    'untyped-video': null,
    unsafe: null,
    invalid: null,
    fallback: 'https://example.com/fallback.jpg',
  })
})
