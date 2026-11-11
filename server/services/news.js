import Parser from 'rss-parser'

const parser = new Parser()

const feeds = [
  { category: 'World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { category: 'Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
]

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Sift/1.0 (RSS reader)' },
  })

  if (!response.ok) {
    throw new Error(`RSS request failed: ${response.status}`)
  }

  const xml = await response.text()
  const parsedFeed = await parser.parseString(xml)

  return parsedFeed.items
    .filter((item) => item.title && /^https?:\/\//i.test(item.link || ''))
    .map((item) => ({
      id: `${feed.category}:${item.link}`,
      title: item.title,
      source: 'BBC News',
      description: item.contentSnippet || '',
      url: item.link,
      category: feed.category,
    }))
}

export async function getArticles() {
  const articleGroups = await Promise.all(feeds.map(fetchFeed))
  return articleGroups.flat()
}
