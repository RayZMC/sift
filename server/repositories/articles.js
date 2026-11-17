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
