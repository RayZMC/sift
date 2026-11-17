import { createDatabasePool } from '../db/pool.js'
import { getArticles } from '../services/news.js'
import { saveArticles } from '../repositories/articles.js'

let pool
let client

try {
  pool = createDatabasePool()
  // Fetch fresh RSS before opening a database transaction.
  const { articles, unavailableFeeds } = await getArticles()
  client = await pool.connect()
  const count = await saveArticles(client, articles)
  console.log(`Saved ${count} articles (inserted or updated by URL).`)
  if (unavailableFeeds.length > 0) {
    console.warn(`Unavailable feeds: ${unavailableFeeds.map((feed) =>
      `${feed.source} (${feed.category})`,
    ).join(', ')}`)
  }
} catch (error) {
  console.error('News import failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  if (client) client.release()
  if (pool) await pool.end()
}
