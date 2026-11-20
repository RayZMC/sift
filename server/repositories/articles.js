export async function getStoredArticles(db) {
  const { rows } = await db.query(`
    SELECT id, url, title, source, category, description, published_at, image_url
    FROM articles
    ORDER BY published_at DESC NULLS LAST, id DESC
  `)

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
