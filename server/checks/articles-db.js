import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabasePool } from '../db/pool.js'
import { once } from 'node:events'
import { saveArticles, getStoredArticles, getArticlePage } from '../repositories/articles.js'
import { createApp } from '../app.js'

test('date ranges include full UTC days and combine with other filters before pagination', async () => {
  const pool = createDatabasePool()
  let client
  try {
    client = await pool.connect()
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    await client.query("SET TIME ZONE 'America/Vancouver'")
    const base = { source: 'BBC News', category: 'World', title: 'Range story' }
    const dates = {
      before: '2026-11-19T23:59:59.999Z', start: '2026-11-20T00:00:00Z',
      end: '2026-11-20T23:59:59.999Z', after: '2026-11-21T00:00:00Z',
      offset: '2026-11-19T16:00:00-08:00', undated: null,
    }
    await saveArticles(client, [
      ...Object.entries(dates).map(([name, publishedAt]) => ({ ...base, url: `https://example.com/date-${name}`, publishedAt })),
      { ...base, url: 'https://example.com/other-source', source: 'The Guardian', publishedAt: dates.start },
      { ...base, url: 'https://example.com/other-category', category: 'Business', publishedAt: dates.start },
      { ...base, url: 'https://example.com/other-search', title: 'Unrelated', publishedAt: dates.start },
    ])
    const filters = { category: 'World', publisher: 'BBC News', search: 'Range' }
    const range = { ...filters, dateFrom: '2026-11-20', dateTo: '2026-11-20' }
    const matched = await getStoredArticles(client, range)
    assert.deepEqual(matched.map(article => article.url).sort(), [
      'https://example.com/date-end', 'https://example.com/date-offset', 'https://example.com/date-start',
    ])
    assert.equal((await getStoredArticles(client, { ...filters, dateFrom: '2026-11-20' })).length, 4)
    assert.equal((await getStoredArticles(client, { ...filters, dateTo: '2026-11-20' })).length, 4)
    assert.equal((await getStoredArticles(client, filters)).length, 6)
    assert.equal((await getStoredArticles(client, { ...filters, dateFrom: '2027-01-01' })).length, 0)

    await saveArticles(client, Array.from({ length: 21 }, (_, index) => ({
      ...base, url: `https://example.com/date-page-${index}`, publishedAt: dates.start,
    })))
    const first = await getArticlePage(client, { ...range, page: 1 })
    const second = await getArticlePage(client, { ...range, page: 2 })
    assert.equal(first.articles.length, 20)
    assert.equal(first.pagination.hasNext, true)
    assert.equal(second.articles.length, 4)
    assert.equal(second.pagination.hasNext, false)
    assert.equal(new Set([...first.articles, ...second.articles].map(article => article.id)).size, 24)
  } finally {
    if (client) client.release(true)
    await pool.end()
  }
})

test('publisher filtering combines with category and search before pagination', async () => {
  const pool = createDatabasePool()
  let client
  try {
    client = await pool.connect()
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    const base = { title: 'Space discovery', category: 'Technology', publishedAt: '2026-11-20T12:00:00Z' }
    await saveArticles(client, [
      ...Array.from({ length: 42 }, (_, index) => ({
        ...base, url: `https://example.com/publisher-${index}`,
        source: index % 2 === 0 ? 'BBC News' : 'The Guardian',
      })),
      { ...base, source: 'BBC News', category: 'World', url: 'https://example.com/other-category' },
      { ...base, source: 'BBC News', title: 'Unrelated headline', url: 'https://example.com/other-topic' },
    ])
    const options = { publisher: 'BBC News', category: 'Technology', search: 'space' }
    const first = await getArticlePage(client, { ...options, page: 1 })
    const second = await getArticlePage(client, { ...options, page: 2 })
    assert.equal(first.articles.length, 20)
    assert.equal(first.pagination.hasNext, true)
    assert.equal(second.articles.length, 1)
    assert.equal(second.pagination.hasNext, false)
    const combined = [...first.articles, ...second.articles]
    assert.ok(combined.every(article => article.source === 'BBC News' && article.category === 'Technology'))
    assert.equal(new Set(combined.map(article => article.id)).size, 21)
    assert.deepEqual(combined, await getStoredArticles(client, options))
    assert.equal((await getStoredArticles(client, { ...options, publisher: null })).length, 42)
    const guardian = await getStoredArticles(client, { ...options, publisher: 'The Guardian' })
    assert.equal(guardian.length, 21)
    assert.ok(guardian.every(article => article.source === 'The Guardian'))
    const empty = await getArticlePage(client, { ...options, publisher: 'The Guardian', category: 'World', page: 1 })
    assert.deepEqual(empty.articles, [])
    assert.equal(empty.pagination.hasNext, false)
  } finally {
    if (client) client.release(true)
    await pool.end()
  }
})

test('search matches titles and descriptions literally before category filtering and pagination', async () => {
  const pool = createDatabasePool()
  let client
  try {
    client = await pool.connect()
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    const base = { source: 'Test', category: 'Technology', publishedAt: '2026-11-20T12:00:00Z' }
    await saveArticles(client, [
      ...Array.from({ length: 42 }, (_, index) => ({
        ...base, url: `https://example.com/search-${index}`,
        category: index % 2 === 0 ? 'Technology' : 'World',
        title: index % 4 === 0 ? 'Space Research advances' : `Article ${index}`,
        description: 'Latest SPACE RESEARCH findings',
      })),
      { ...base, url: 'https://example.com/ordinary', title: 'Unrelated headline' },
      { ...base, url: 'https://example.com/literal', title: '100%_complete' },
      { ...base, url: 'https://example.com/quoted', title: "A headline containing ' OR 1=1 --" },
    ])
    const first = await getArticlePage(client, { page: 1, category: 'Technology', search: 'space research' })
    const second = await getArticlePage(client, { page: 2, category: 'Technology', search: 'SPACE RESEARCH' })
    assert.equal(first.articles.length, 20)
    assert.equal(first.pagination.hasNext, true)
    assert.equal(second.articles.length, 1)
    assert.equal(second.pagination.hasNext, false)
    const combined = [...first.articles, ...second.articles]
    assert.ok(combined.every(article => article.category === 'Technology'))
    assert.equal(new Set(combined.map(article => article.id)).size, 21)
    assert.ok(combined.some(article => !article.title.toLowerCase().includes('space research')))
    assert.deepEqual(combined, await getStoredArticles(client, { category: 'Technology', search: 'space research' }))
    const literal = await getArticlePage(client, { page: 1, search: '%_' })
    assert.deepEqual(literal.articles.map(article => article.title), ['100%_complete'])
    const quoted = await getArticlePage(client, { page: 1, search: "' OR 1=1 --" })
    assert.equal(quoted.articles.length, 1)
    assert.equal(quoted.articles[0].url, 'https://example.com/quoted')
    assert.equal((await getArticlePage(client, { page: 1, search: 'no-such-phrase' })).articles.length, 0)
    assert.equal((await getStoredArticles(client, { search: '' })).length, 45)
  } finally {
    if (client) client.release(true)
    await pool.end()
  }
})

test('article imports insert, update by URL, preserve optional metadata, and roll back failed batches', async () => {
  const pool = createDatabasePool()
  let client
  try {
    client = await pool.connect()
    // A session-local table shadows the real one and disappears on disconnect.
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    const article = {
      url: 'https://example.com/test-story',
      title: "Publisher's headline; DROP TABLE articles;",
      source: 'Test source', category: 'World', description: 'First description',
      publishedAt: '2026-11-17T12:00:00.000Z', imageUrl: 'https://example.com/image.jpg',
    }
    assert.equal(await saveArticles(client, [article]), 1)
    const first = (await client.query('SELECT * FROM articles')).rows[0]
    assert.equal(first.title, article.title)

    await saveArticles(client, [{ ...article, title: 'Updated headline', description: 'Updated description', publishedAt: null, imageUrl: null }])
    const result = await client.query('SELECT * FROM articles')
    assert.equal(result.rowCount, 1)
    assert.equal(result.rows[0].id, first.id)
    assert.deepEqual(result.rows[0].created_at, first.created_at)
    assert.equal(result.rows[0].title, 'Updated headline')
    assert.equal(result.rows[0].description, 'Updated description')
    assert.equal(result.rows[0].published_at.toISOString(), article.publishedAt)
    assert.equal(result.rows[0].image_url, article.imageUrl)

    await assert.rejects(saveArticles(client, [
      { ...article, title: 'Should roll back' },
      { ...article, url: 'https://example.com/invalid', title: '' },
    ]), (error) => error.code === '23514')
    const afterFailure = await client.query('SELECT * FROM articles')
    assert.equal(afterFailure.rowCount, 1)
    assert.equal(afterFailure.rows[0].title, 'Updated headline')
    assert.equal(await saveArticles(client, []), 0)
  } finally {
    if (client) client.release(true)
    await pool.end()
  }
})

test('pagination filters the full dataset before slicing and handles page boundaries', async () => {
  const pool = createDatabasePool()
  let client
  try {
    client = await pool.connect()
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    assert.deepEqual((await getArticlePage(client, { page: 1 })).pagination,
      { page: 1, pageSize: 20, hasNext: false, hasPrevious: false })
    await saveArticles(client, Array.from({ length: 42 }, (_, index) => ({
      title: `Article ${index}`, url: `https://example.com/page-${index}`,
      source: 'Test', category: index % 2 === 0 ? 'World' : 'Technology',
      publishedAt: '2026-11-20T12:00:00Z',
    })))
    const first = await getArticlePage(client, { page: 1, category: 'Technology' })
    const second = await getArticlePage(client, { page: 2, category: 'Technology' })
    assert.equal(first.articles.length, 20)
    assert.equal(first.pagination.hasNext, true)
    assert.equal(second.articles.length, 1)
    assert.equal(second.pagination.hasNext, false)
    assert.equal(second.pagination.hasPrevious, true)
    const combined = [...first.articles, ...second.articles]
    assert.ok(combined.every(article => article.category === 'Technology'))
    assert.equal(new Set(combined.map(article => article.id)).size, 21)
    assert.deepEqual(combined, await getStoredArticles(client, { category: 'Technology' }))
    assert.equal((await getArticlePage(client, { page: 3, category: 'Technology' })).articles.length, 0)
    assert.equal((await getArticlePage(client, { page: 1, category: 'Business' })).articles.length, 0)
    await client.query('DELETE FROM articles WHERE url = $1', ['https://example.com/page-1'])
    const exactPage = await getArticlePage(client, { page: 1, category: 'Technology' })
    assert.equal(exactPage.articles.length, 20)
    assert.equal(exactPage.pagination.hasNext, false)
  } finally {
    if (client) client.release(true)
    await pool.end()
  }
})

test('stored articles are ordered, mapped, and served through the API', async () => {
  const pool = createDatabasePool()
  let client
  let server
  try {
    client = await pool.connect()
    await client.query('CREATE TEMP TABLE articles (LIKE public.articles INCLUDING ALL)')
    assert.deepEqual(await getStoredArticles(client), [])
    const base = { source: 'Test source', category: 'World', description: 'A description' }
    await saveArticles(client, [
      { ...base, url: 'https://example.com/undated', title: 'Undated' },
      { ...base, url: 'https://example.com/old', title: 'Old', publishedAt: '2026-11-17T12:00:00Z' },
      { ...base, url: 'https://example.com/new', title: 'New', publishedAt: '2026-11-19T12:00:00Z', imageUrl: 'https://example.com/photo.jpg' },
      { ...base, url: 'https://example.com/tied', title: 'Same date, newer ID', publishedAt: '2026-11-19T12:00:00Z' },
    ])
    const articles = await getStoredArticles(client)
    assert.deepEqual(articles.map((article) => article.title), ['Same date, newer ID', 'New', 'Old', 'Undated'])
    assert.equal(typeof articles[0].id, 'string')
    assert.equal(articles[1].publishedAt, '2026-11-19T12:00:00.000Z')
    assert.equal(articles[1].imageUrl, 'https://example.com/photo.jpg')
    assert.equal(articles[3].publishedAt, null)
    assert.equal(articles[3].imageUrl, null)
    assert.equal('published_at' in articles[1], false)

    server = createApp(async (options) => ({ ...await getArticlePage(client, options), unavailableFeeds: [] }))
      .listen(0, '127.0.0.1')
    await once(server, 'listening')
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/articles`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      articles, unavailableFeeds: [],
      pagination: { page: 1, pageSize: 20, hasNext: false, hasPrevious: false },
    })
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
        server.closeAllConnections()
      })
    }
    if (client) client.release(true)
    await pool.end()
  }
})
