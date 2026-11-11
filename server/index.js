import express from 'express'
import { getArticles } from './services/news.js'
import { createNewsCache } from './services/news-cache.js'

const app = express()
const port = 3001
const getCachedArticles = createNewsCache(getArticles)

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.get('/api/articles', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    try {
        const result = await getCachedArticles()
        res.json(result)
    } catch (error) {
        console.error('Could not fetch news:', error.message)
        res.status(502).json({ error: 'Could not fetch news. Please try again shortly.' })
    }
})

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
