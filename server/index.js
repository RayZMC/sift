import { createApp } from './app.js'
import { createDatabasePool } from './db/pool.js'
import { getStoredArticles, getArticlePage } from './repositories/articles.js'

const port = 3001
const pool = createDatabasePool()
const app = createApp(async ({ page, category }) => ({
    ...(page === undefined
        ? { articles: await getStoredArticles(pool) }
        : await getArticlePage(pool, { page, category })),
    // Kept for frontend compatibility; database reads do not check publishers.
    unavailableFeeds: [],
}))

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
