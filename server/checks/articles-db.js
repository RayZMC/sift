import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabasePool } from '../db/pool.js'
import { saveArticles } from '../repositories/articles.js'

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
