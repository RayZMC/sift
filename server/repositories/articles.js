export async function getStoredArticles(db, { category = null, search = '', limit = null, offset = 0 } = {}) {
  const { rows } = await db.query(`
    SELECT id, url, title, source, category, description, published_at, image_url
    FROM articles
    WHERE ($1::text IS NULL OR category = $1)
      AND ($4::text = '' OR strpos(lower(title), lower($4)) > 0
        OR strpos(lower(description), lower($4)) > 0)
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT $2 OFFSET $3
  `, [category, limit, offset, search])

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

export async function getArticlePage(db, { page, category = null, search = '' }) {
  const pageSize = 20
  // Fetch one extra row to tell whether a Next page exists.
  const articles = await getStoredArticles(db, {
    category,
    search,
    limit: pageSize + 1,
    offset: (page - 1) * pageSize,
  })
  return {
    articles: articles.slice(0, pageSize),
    pagination: { page, pageSize, hasNext: articles.length > pageSize, hasPrevious: page > 1 },
  }
}

export async function saveArticles(client, articles) {
  await client.query('BEGIN')
  try {
    for (const article of articles) {
      // Values are passed separately so publisher text is never executed as SQL.
      await client.query(`
        INSERT INTO articles (url, title, source, category, description, published_at, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (url) DO UPDATE SET
          title = EXCLUDED.title,
          source = EXCLUDED.source,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          published_at = COALESCE(EXCLUDED.published_at, articles.published_at),
          image_url = COALESCE(EXCLUDED.image_url, articles.image_url)
      `, [
        article.url, article.title, article.source, article.category,
        article.description ?? '', article.publishedAt ?? null, article.imageUrl ?? null,
      ])
    }
    await client.query('COMMIT')
    return articles.length
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
