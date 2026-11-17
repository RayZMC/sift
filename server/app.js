import express from 'express'

// Receive the article loader so tests can supply data without calling publishers.
export function createApp(loadArticles) {
  const app = express()

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/articles', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    try {
      const result = await loadArticles()
      res.json(result)
    } catch (error) {
      console.error('Could not fetch news:', error.message)
      res.status(502).json({ error: 'Could not fetch news. Please try again shortly.' })
    }
  })

  return app
}
