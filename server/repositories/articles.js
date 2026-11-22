export async function getStoredArticles(db, {
  category = null, search = '', publisher = null,
  dateFrom = null, dateTo = null, limit = null, offset = 0,
} = {}) {
  const { rows } = await db.query(`
    SELECT id, url, title, source, category, description, published_at, image_url
    FROM articles
    WHERE ($1::text IS NULL OR ($1 = 'Top' AND is_top) OR ($1 <> 'Top' AND category = $1))
      AND ($4::text = '' OR strpos(lower(title), lower($4)) > 0
        OR strpos(lower(description), lower($4)) > 0)
      AND ($5::text IS NULL OR source = $5)
      AND ($6::date IS NULL OR published_at >= ($6::date::timestamp AT TIME ZONE 'UTC'))
      AND ($7::date IS NULL OR published_at < (($7::date + 1)::timestamp AT TIME ZONE 'UTC'))
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT $2 OFFSET $3
  `, [category, limit, offset, search, publisher, dateFrom, dateTo])

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    source: row.source,
    category: row.category,
    description: row.description,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    imageUrl: row.image_url,
  }))
}

export async function getArticlePage(db, {
  page, category = null, search = '', publisher = null, dateFrom = null, dateTo = null,
}) {
  const pageSize = 20
  // Fetch one extra row to tell whether a Next page exists.
  const articles = await getStoredArticles(db, {
    category,
    search,
    publisher,
    dateFrom,
    dateTo,
    limit: pageSize + 1,
    offset: (page - 1) * pageSize,
  })
  return {
    articles: articles.slice(0, pageSize),
    pagination: { page, pageSize, hasNext: articles.length > pageSize, hasPrevious: page > 1 },
  }
}

export async function saveArticles(client, articles, refreshedTopSources = []) {
  await client.query('BEGIN')
  try {
    // Refresh headline membership only when that publisher's Top feed succeeded.
    // Failed feeds retain their previous headlines until a later successful import.
    await client.query('UPDATE articles SET is_top = FALSE WHERE source = ANY($1::text[]) AND is_top', [refreshedTopSources])
    for (const article of articles) {
      // Values are passed separately so publisher text is never executed as SQL.
      await client.query(`
        INSERT INTO articles (url, title, source, category, description, published_at, image_url, is_top)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (url) DO UPDATE SET
          title = EXCLUDED.title,
          source = EXCLUDED.source,
          category = CASE WHEN EXCLUDED.category = 'Top' THEN articles.category ELSE EXCLUDED.category END,
          description = EXCLUDED.description,
          published_at = COALESCE(EXCLUDED.published_at, articles.published_at),
          image_url = COALESCE(EXCLUDED.image_url, articles.image_url),
          is_top = articles.is_top OR EXCLUDED.is_top
      `, [
        article.url, article.title, article.source, article.category,
        article.description ?? '', article.publishedAt ?? null, article.imageUrl ?? null, article.isTop ?? false,
      ])
    }
    await client.query('COMMIT')
    return articles.length
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
