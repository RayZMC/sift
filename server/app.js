import express from 'express'

// Receive the article loader so API tests can supply data without a database.
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
      res.status(500).json({ error: 'Could not load articles. Please try again shortly.' })
    }
  })

  return app
}
