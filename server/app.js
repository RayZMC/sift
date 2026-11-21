import express from 'express'

// Receive the article loader so API tests can supply data without a database.
export function createApp(loadArticles) {
  const app = express()

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/articles', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const { page: rawPage, category: rawCategory, q: rawSearch, publisher: rawPublisher } = req.query
    if (rawPage !== undefined && (
      typeof rawPage !== 'string' || !/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 1000000
    )) {
      return res.status(400).json({ error: 'Page must be an integer between 1 and 1000000.' })
    }
    if (rawCategory !== undefined && !['All', 'World', 'Business', 'Technology'].includes(rawCategory)) {
      return res.status(400).json({ error: 'Unknown category.' })
    }
    if (rawSearch !== undefined && (typeof rawSearch !== 'string' || rawSearch.length > 200)) {
      return res.status(400).json({ error: 'Search must be a single string of at most 200 characters.' })
    }
    const search = (rawSearch ?? '').trim()
    if (rawPublisher !== undefined && !['All', 'BBC News', 'The Guardian'].includes(rawPublisher)) {
      return res.status(400).json({ error: 'Unknown publisher.' })
    }
    const publisher = rawPublisher === undefined || rawPublisher === 'All' ? null : rawPublisher
    const page = Number(rawPage ?? 1)
    const category = rawCategory === undefined || rawCategory === 'All' ? null : rawCategory
    try {
      const result = await loadArticles({ page, category, search, publisher })
      res.json(result)
    } catch (error) {
      console.error('Could not fetch news:', error.message)
      res.status(500).json({ error: 'Could not load articles. Please try again shortly.' })
    }
  })

  return app
}
