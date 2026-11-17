import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../app.js'

const article = {
  id: 'https://example.com/story',
  title: 'Example headline',
  source: 'BBC News',
  description: 'Example description',
  url: 'https://example.com/story',
  category: 'World',
  publishedAt: '2026-11-11T12:00:00.000Z',
  imageUrl: null,
}

async function startApp(t, loadArticles) {
  // Port 0 asks the OS for a free port, leaving the development server alone.
  const server = createApp(loadArticles).listen(0, '127.0.0.1')
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
    server.closeAllConnections()
  }))
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}`
}

test('health endpoint returns 200 without requesting articles', async (t) => {
  let calls = 0
  const baseUrl = await startApp(t, async () => {
    calls += 1
    throw new Error('Publisher unavailable')
  })

  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
  assert.equal(calls, 0)
})

test('articles endpoint returns the JSON payload and prevents browser caching', async (t) => {
  const payload = { articles: [article], unavailableFeeds: [] }
  const baseUrl = await startApp(t, async () => payload)

  const response = await fetch(`${baseUrl}/api/articles`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /^application\/json/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), payload)
})

test('partial feed failures still return 200 with available articles and warnings', async (t) => {
  const payload = {
    articles: [article],
    unavailableFeeds: [{ source: 'The Guardian', category: 'Technology' }],
  }
  const baseUrl = await startApp(t, async () => payload)

  const response = await fetch(`${baseUrl}/api/articles`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), payload)
})

test('failed retrieval returns a safe 502 response and a later request can recover', async (t) => {
  t.mock.method(console, 'error', () => {})
  let offline = true
  const payload = { articles: [article], unavailableFeeds: [] }
  const baseUrl = await startApp(t, async () => {
    if (offline) throw new Error('Internal publisher error details')
    return payload
  })

  const failed = await fetch(`${baseUrl}/api/articles`)
  assert.equal(failed.status, 502)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await failed.json(), {
    error: 'Could not fetch news. Please try again shortly.',
  })

  offline = false
  const recovered = await fetch(`${baseUrl}/api/articles`)
  assert.equal(recovered.status, 200)
  assert.deepEqual(await recovered.json(), payload)
})

test('unknown routes return 404', async (t) => {
  const baseUrl = await startApp(t, async () => ({ articles: [], unavailableFeeds: [] }))
  const response = await fetch(`${baseUrl}/api/does-not-exist`)
  assert.equal(response.status, 404)
  await response.text()
})
