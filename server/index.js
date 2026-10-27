import express from 'express'

const app = express()
const port = 3001

const articles = [
    {
      id: 1,
      title: 'Community opens new rec centre',
      source: 'Example news',
      description: 'The center blah',
      url: 'https://example.com/?article=1',
      category: 'World',
    },
    {
      id: 2,
      title: 'City is growing',
      source: 'Sample News',
      description: 'The city is growing',
      url: 'https://example.com/?article=2',
      category: 'Business',
    }
]

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.get('/api/articles', (req, res) => {
    res.json(articles)
})

app.listen(port, () => {
    console.log(`Sift API running at http://localhost:${port}`)
})