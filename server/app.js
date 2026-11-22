import express from 'express'

function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Receive the article loader so API tests can supply data without a database.
export function createApp(loadArticles) {
  const app = express()

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/articles', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const { page: rawPage, category: rawCategory, q: rawSearch, publisher: rawPublisher, from, to } = req.query
    if (rawPage !== undefined && (
      typeof rawPage !== 'string' || !/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 1000000
    )) {
      return res.status(400).json({ error: 'Page must be an integer between 1 and 1000000.' })
    }
    if (rawCategory !== undefined && !['All', 'Top', 'World', 'Business', 'Technology', 'Science', 'Sports', 'Entertainment'].includes(rawCategory)) {
      return res.status(400).json({ error: 'Unknown category.' })
    }
    if (rawSearch !== undefined && (typeof rawSearch !== 'string' || rawSearch.length > 200)) {
      return res.status(400).json({ error: 'Search must be a single string of at most 200 characters.' })
    }
    const search = (rawSearch ?? '').trim()
    if (rawPublisher !== undefined && !['All', 'BBC News', 'The Guardian', 'CBC News', 'Global News', 'NPR', 'PBS News'].includes(rawPublisher)) {
      return res.status(400).json({ error: 'Unknown publisher.' })
    }
    const publisher = rawPublisher === undefined || rawPublisher === 'All' ? null : rawPublisher
    if ((from !== undefined && !isCalendarDate(from)) || (to !== undefined && !isCalendarDate(to))) {
      return res.status(400).json({ error: 'Dates must be valid calendar dates in YYYY-MM-DD format.' })
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: 'From date must be on or before To date.' })
    }
    const page = Number(rawPage ?? 1)
    const category = rawCategory === undefined || rawCategory === 'All' ? null : rawCategory
    try {
      const result = await loadArticles({ page, category, search, publisher, dateFrom: from ?? null, dateTo: to ?? null })
      res.json(result)
    } catch (error) {
      console.error('Could not fetch news:', error.message)
      res.status(500).json({ error: 'Could not load articles. Please try again shortly.' })
    }
  })

  return app
}
