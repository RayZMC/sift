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
  { source: 'BBC News', category: 'Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { source: 'BBC News', category: 'Sports', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { source: 'BBC News', category: 'Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' },
  { source: 'CBC News', category: 'World', url: 'https://www.cbc.ca/webfeed/rss/rss-world' },
  { source: 'CBC News', category: 'Business', url: 'https://www.cbc.ca/webfeed/rss/rss-business' },
  { source: 'Global News', category: 'World', url: 'https://globalnews.ca/world/feed/' },
  { source: 'Global News', category: 'Business', url: 'https://globalnews.ca/money/feed/' },
  { source: 'NPR', category: 'Science', url: 'https://feeds.npr.org/1007/rss.xml' },
  { source: 'NPR', category: 'Technology', url: 'https://feeds.npr.org/1019/rss.xml' },
  { source: 'PBS News', category: 'World', url: 'https://www.pbs.org/newshour/feeds/rss/world' },
  { source: 'PBS News', category: 'Science', url: 'https://www.pbs.org/newshour/feeds/rss/science' },
  { source: 'BBC News', category: 'Top', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'The Guardian', category: 'Top', url: 'https://www.theguardian.com/international/rss' },
  { source: 'CBC News', category: 'Top', url: 'https://www.cbc.ca/webfeed/rss/rss-topstories' },
  { source: 'Global News', category: 'Top', url: 'https://globalnews.ca/feed/' },
  { source: 'NPR', category: 'Top', url: 'https://feeds.npr.org/1001/rss.xml' },
  { source: 'PBS News', category: 'Top', url: 'https://www.pbs.org/newshour/feeds/rss/headlines' },
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
    // Some feeds put the lead image inside their HTML description.
    ...[item.content, item['content:encoded']].map(content => typeof content === 'string'
      ? content.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, '&')
      : null),
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
      isTop: feed.category === 'Top',
      publishedAt: normalizeDate(item.isoDate || item.pubDate),
      imageUrl: getImageUrl(item),
    }))
}

export async function getArticles() {
  const results = await Promise.allSettled(feeds.map(fetchFeed))
  const articleGroups = []
  const unavailableFeeds = []
  const refreshedTopSources = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      articleGroups.push(result.value)
      if (feeds[index].category === 'Top') refreshedTopSources.push(feeds[index].source)
    } else {
      const feed = feeds[index]
      unavailableFeeds.push({ source: feed.source, category: feed.category })
      console.warn(`Could not load ${feed.source} (${feed.category}): ${result.reason.message}`)
    }
  })

  if (unavailableFeeds.length === feeds.length) {
    throw new Error('All news feeds are unavailable')
  }

  const byUrl = new Map()
  for (const article of articleGroups.flat()) {
    const existing = byUrl.get(article.url)
    // Keep the specific category while also marking headline-feed membership.
    if (existing) existing.isTop ||= article.isTop
    else byUrl.set(article.url, article)
  }
  const uniqueArticles = [...byUrl.values()]

  const articles = uniqueArticles.sort((a, b) => {
    // Keep undated articles after all dated articles.
    if (!a.publishedAt) return b.publishedAt ? 1 : 0
    if (!b.publishedAt) return -1
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  })

  return { articles, unavailableFeeds, refreshedTopSources }
}
