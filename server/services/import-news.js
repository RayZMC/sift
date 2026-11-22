import { getArticles } from './news.js'
import { saveArticles } from '../repositories/articles.js'

export async function importNews(pool) {
  // Do not hold a database connection while waiting for publishers.
  const { articles, unavailableFeeds, refreshedTopSources } = await getArticles()
  const client = await pool.connect()
  try {
    const count = await saveArticles(client, articles, refreshedTopSources)
    return { count, unavailableFeeds }
  } finally {
    client.release()
  }
}
