import { createApp } from './app.js'
import { createDatabasePool } from './db/pool.js'
import { getArticlePage } from './repositories/articles.js'

const port = 3001
const pool = createDatabasePool()
const app = createApp(async (filters) => ({
    ...await getArticlePage(pool, filters),
    // Kept for frontend compatibility; database reads do not check publishers.
    unavailableFeeds: [],
}))

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
