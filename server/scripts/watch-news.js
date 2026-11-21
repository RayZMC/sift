import { createDatabasePool } from '../db/pool.js'
import { importNews } from '../services/import-news.js'
import { getImportInterval, runImportLoop } from '../services/import-scheduler.js'

const controller = new AbortController()
const stop = () => controller.abort()
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
let pool

try {
  const intervalMs = getImportInterval(process.env.NEWS_IMPORT_INTERVAL_MINUTES)
  pool = createDatabasePool()
  console.log(`News worker started. Importing now, then waiting ${intervalMs / 60000} minutes between imports.`)
  await runImportLoop({
    intervalMs,
    signal: controller.signal,
    importNews: async () => {
      const { count, unavailableFeeds } = await importNews(pool)
      console.log(`[${new Date().toISOString()}] Saved ${count} articles; ${unavailableFeeds.length} feeds unavailable.`)
    },
    onError: (error) => {
      console.error('Scheduled import failed; will retry after the interval:', error.code || error.message)
    },
  })
  console.log('News worker stopped.')
} catch (error) {
  console.error('News worker failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
  if (pool) await pool.end()
}
