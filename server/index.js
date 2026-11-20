import { createApp } from './app.js'
import { createDatabasePool } from './db/pool.js'
import { getStoredArticles } from './repositories/articles.js'

const port = 3001
const pool = createDatabasePool()
const app = createApp(async () => ({
    articles: await getStoredArticles(pool),
    // Kept for frontend compatibility; database reads do not check publishers.
    unavailableFeeds: [],
}))

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
