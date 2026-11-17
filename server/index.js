import { createApp } from './app.js'
import { getArticles } from './services/news.js'
import { createNewsCache } from './services/news-cache.js'

const port = 3001
const getCachedArticles = createNewsCache(getArticles)
const app = createApp(getCachedArticles)

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
