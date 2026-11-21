import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../app.js'

const article = {
  id: '1',
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
    throw new Error('Database unavailable')
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

test('an empty database returns 200 with an empty article list', async (t) => {
  const payload = {
    articles: [],
    unavailableFeeds: [],
  }
  const baseUrl = await startApp(t, async () => payload)

  const response = await fetch(`${baseUrl}/api/articles`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), payload)
})

test('failed retrieval returns a safe 500 response and a later request can recover', async (t) => {
  t.mock.method(console, 'error', () => {})
  let offline = true
  const payload = { articles: [article], unavailableFeeds: [] }
  const baseUrl = await startApp(t, async () => {
    if (offline) throw new Error('Internal database error details')
    return payload
  })

  const failed = await fetch(`${baseUrl}/api/articles`)
  assert.equal(failed.status, 500)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await failed.json(), {
    error: 'Could not load articles. Please try again shortly.',
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

test('pagination passes validated page and category to the loader', async (t) => {
  const options = []
  const baseUrl = await startApp(t, async (input) => {
    options.push(input)
    return { articles: [], unavailableFeeds: [] }
  })
  for (const query of ['?page=2&category=Technology', '?category=Business', '?page=1&category=All', '']) {
    const response = await fetch(`${baseUrl}/api/articles${query}`)
    assert.equal(response.status, 200)
    await response.json()
  }
  assert.deepEqual(options.map(({ dateFrom, dateTo, ...filters }) => {
    assert.equal(dateFrom, null)
    assert.equal(dateTo, null)
    return filters
  }), [
    { page: 2, category: 'Technology', search: '', publisher: null }, { page: 1, category: 'Business', search: '', publisher: null },
    { page: 1, category: null, search: '', publisher: null }, { page: 1, category: null, search: '', publisher: null },
  ])
})

test('invalid pages and categories return 400 before loading articles', async (t) => {
  let calls = 0
  const baseUrl = await startApp(t, async () => { calls += 1; return {} })
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=', 'page=1000001', 'page=1&page=2', 'category=Unknown', 'category=World&category=Business']) {
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 400, query)
    assert.equal(typeof (await response.json()).error, 'string')
  }
  assert.equal(calls, 0)
})

test('search is trimmed and combined with category and page options', async (t) => {
  const options = []
  const baseUrl = await startApp(t, async input => {
    options.push(input)
    return { articles: [], unavailableFeeds: [] }
  })
  for (const search of ['  Artificial Intelligence  ', '   ', 'x'.repeat(200)]) {
    const query = new URLSearchParams({ q: search, category: 'Technology', page: '2' })
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 200)
    await response.json()
  }
  assert.deepEqual(options.map(input => input.search), ['Artificial Intelligence', '', 'x'.repeat(200)])
  assert.ok(options.every(input => input.category === 'Technology' && input.page === 2))
})

test('repeated or oversized search parameters are rejected before database access', async (t) => {
  let calls = 0
  const baseUrl = await startApp(t, async () => { calls += 1; return {} })
  for (const query of ['q=one&q=two', `q=${'x'.repeat(201)}`]) {
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 400)
    assert.equal(typeof (await response.json()).error, 'string')
  }
  assert.equal(calls, 0)
})

test('publisher filters combine with search, category, and pagination', async (t) => {
  const options = []
  const baseUrl = await startApp(t, async input => {
    options.push(input)
    return { articles: [], unavailableFeeds: [] }
  })
  for (const publisher of ['BBC News', 'The Guardian', 'All']) {
    const query = new URLSearchParams({ publisher, page: '2', category: 'Technology', q: 'space' })
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 200)
    await response.json()
  }
  assert.deepEqual(options, ['BBC News', 'The Guardian', null].map(publisher => ({
    publisher, page: 2, category: 'Technology', search: 'space', dateFrom: null, dateTo: null,
  })))
})

test('unknown, blank, or repeated publisher filters return 400', async (t) => {
  let calls = 0
  const baseUrl = await startApp(t, async () => { calls += 1; return {} })
  for (const query of ['publisher=Unknown', 'publisher=', 'publisher=BBC', 'publisher=All&publisher=BBC%20News']) {
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'Unknown publisher.' })
  }
  assert.equal(calls, 0)
})

test('date filters accept inclusive ranges, single boundaries, and leap days', async (t) => {
  const options = []
  const baseUrl = await startApp(t, async input => { options.push(input); return { articles: [] } })
  for (const query of ['from=2026-11-01&to=2026-11-20', 'from=2024-02-29', 'to=2026-11-20', 'from=2026-11-20&to=2026-11-20']) {
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 200)
    await response.json()
  }
  assert.deepEqual(options.map(({ dateFrom, dateTo }) => [dateFrom, dateTo]), [
    ['2026-11-01', '2026-11-20'], ['2024-02-29', null], [null, '2026-11-20'], ['2026-11-20', '2026-11-20'],
  ])
})

test('invalid dates and reversed ranges are rejected before loading articles', async (t) => {
  let calls = 0
  const baseUrl = await startApp(t, async () => { calls += 1; return {} })
  for (const query of [
    'from=', 'to=no-date', 'from=2026-02-29', 'to=2026-04-31', 'from=2026-13-01',
    'from=0000-01-01', 'from=2026-1-01', 'to=2026-11-20T12:00:00Z',
    'from=2026-11-21&to=2026-11-20', 'from=2026-11-01&from=2026-11-02',
    'to=2026-11-01&to=2026-11-02',
  ]) {
    const response = await fetch(`${baseUrl}/api/articles?${query}`)
    assert.equal(response.status, 400, query)
    assert.equal(typeof (await response.json()).error, 'string')
  }
  assert.equal(calls, 0)
})
