import express from 'express'
import { getArticles } from './services/news.js'

const app = express()
const port = 3001

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.get('/api/articles', async (req, res) => {
    try {
        const articles = await getArticles()
        res.json(articles)
    } catch (error) {
        console.error('Could not fetch news:', error.message)
        res.status(502).json({ error: 'Could not fetch news. Please try again shortly.' })
    }
})

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})
