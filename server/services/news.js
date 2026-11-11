import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnails', { keepArray: true }],
      ['media:content', 'media', { keepArray: true }],
    ],
  },
})

const feeds = [
  { source: 'BBC News', category: 'World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'BBC News', category: 'Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'The Guardian', category: 'Technology', url: 'https://www.theguardian.com/technology/rss' },
]

function normalizeDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function getImageUrl(item) {
  // Publishers use different RSS fields for images.
  const candidates = [
    ...(item.thumbnails || []).map((image) => image.$?.url),
    ...(item.media || [])
      .filter((image) => {
        const attributes = image.$
        if (attributes?.medium) return attributes.medium === 'image'
        if (attributes?.type) return attributes.type.startsWith('image/')
        // The Guardian omits the media type, but supplies image file URLs.
        return /\.(avif|gif|jpe?g|png|webp)([?#]|$)/i.test(attributes?.url || '')
      })
      .sort((a, b) => Number(b.$?.width || 0) - Number(a.$?.width || 0))
      .map((image) => image.$?.url),
    item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : null,
  ]

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
        return url.href
      }
    } catch {
      // Skip missing or malformed URLs and try the next image.
    }
  }
  return null
}

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
      id: item.link,
      title: item.title,
      source: feed.source,
      description: item.contentSnippet || '',
      url: item.link,
      category: feed.category,
      publishedAt: normalizeDate(item.isoDate || item.pubDate),
      imageUrl: getImageUrl(item),
    }))
}

export async function getArticles() {
  const articleGroups = await Promise.all(feeds.map(fetchFeed))
  const seenUrls = new Set()
  const uniqueArticles = articleGroups.flat().filter((article) => {
    // Keep the first occurrence, using the order of the configured feeds.
    if (seenUrls.has(article.url)) return false
    seenUrls.add(article.url)
    return true
  })

  return uniqueArticles.sort((a, b) => {
    // Keep undated articles after all dated articles.
    if (!a.publishedAt) return b.publishedAt ? 1 : 0
    if (!b.publishedAt) return -1
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  })
}
