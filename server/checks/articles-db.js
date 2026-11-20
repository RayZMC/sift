import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabasePool } from '../db/pool.js'
import { once } from 'node:events'
import { saveArticles, getStoredArticles, getArticlePage } from '../repositories/articles.js'
import { createApp } from '../app.js'

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

    server = createApp(async () => ({ articles: await getStoredArticles(client), unavailableFeeds: [] }))
      .listen(0, '127.0.0.1')
    await once(server, 'listening')
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/articles`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { articles, unavailableFeeds: [] })
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
