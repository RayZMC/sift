import { createDatabasePool } from '../db/pool.js'
import { importNews } from '../services/import-news.js'

let pool

try {
  pool = createDatabasePool()
  const { count, unavailableFeeds } = await importNews(pool)
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
  if (pool) await pool.end()
}
