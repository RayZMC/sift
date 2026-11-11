import assert from 'node:assert/strict'
import test from 'node:test'
import { createNewsCache } from '../services/news-cache.js'

const completeResult = { articles: [{ id: 'article-1' }], unavailableFeeds: [] }
const partialResult = {
  articles: [{ id: 'article-1' }],
  unavailableFeeds: [{ source: 'The Guardian', category: 'Technology' }],
}

test('reuses complete results for five minutes, then loads fresh articles', async () => {
  let time = 0
  let calls = 0
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    return { articles: [{ id: `article-${calls}` }], unavailableFeeds: [] }
  }, () => time)

  const first = await getCachedArticles()
  time = 299999
  assert.deepEqual(await getCachedArticles(), first)
  assert.equal(calls, 1)

  time = 300000
  const refreshed = await getCachedArticles()
  assert.equal(calls, 2)
  assert.equal(refreshed.articles[0].id, 'article-2')
})

test('retries partial results after one minute and caches recovered results for five minutes', async () => {
  let time = 0
  let calls = 0
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    return calls === 1 ? partialResult : completeResult
  }, () => time)

  assert.deepEqual(await getCachedArticles(), partialResult)
  time = 59999
  assert.deepEqual(await getCachedArticles(), partialResult)
  assert.equal(calls, 1)

  time = 60000
  assert.deepEqual(await getCachedArticles(), completeResult)
  assert.equal(calls, 2)
  time = 359999
  await getCachedArticles()
  assert.equal(calls, 2)
  time = 360000
  await getCachedArticles()
  assert.equal(calls, 3)
})

test('shares an in-progress download and starts the cache lifetime when it completes', async () => {
  let time = 0
  let calls = 0
  let finishDownload
  const download = new Promise((resolve) => { finishDownload = resolve })
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    return download
  }, () => time)

  const first = getCachedArticles()
  const second = getCachedArticles()
  assert.equal(calls, 1)

  time = 10000
  finishDownload(completeResult)
  assert.deepEqual(await Promise.all([first, second]), [completeResult, completeResult])
  time = 309999
  await getCachedArticles()
  assert.equal(calls, 1)
  time = 310000
  await getCachedArticles()
  assert.equal(calls, 2)
})

test('does not cache failures and allows a later request to recover', async () => {
  let calls = 0
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    if (calls === 1) throw new Error('All news feeds are unavailable')
    return completeResult
  })

  const first = getCachedArticles()
  const second = getCachedArticles()
  await Promise.all([
    assert.rejects(first, /All news feeds are unavailable/),
    assert.rejects(second, /All news feeds are unavailable/),
  ])
  assert.equal(calls, 1)
  assert.deepEqual(await getCachedArticles(), completeResult)
  assert.equal(calls, 2)
})

test('does not serve expired data when a refresh fails', async () => {
  let time = 0
  let calls = 0
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    if (calls === 2) throw new Error('All news feeds are unavailable')
    return completeResult
  }, () => time)

  await getCachedArticles()
  time = 300000
  await assert.rejects(getCachedArticles(), /All news feeds are unavailable/)
  assert.deepEqual(await getCachedArticles(), completeResult)
  assert.equal(calls, 3)
})

test('caches a successful empty result', async () => {
  let calls = 0
  const emptyResult = { articles: [], unavailableFeeds: [] }
  const getCachedArticles = createNewsCache(async () => {
    calls += 1
    return emptyResult
  }, () => 0)

  assert.deepEqual(await getCachedArticles(), emptyResult)
  assert.deepEqual(await getCachedArticles(), emptyResult)
  assert.equal(calls, 1)
})
