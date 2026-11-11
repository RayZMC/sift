function ArticleCard({ article }) {
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null
  const hasValidDate = publishedDate && !Number.isNaN(publishedDate.getTime())

  return (
    <article>
      <p>{article.source}</p>
      <h3>
        {article.url ? (
          <a href={article.url}>{article.title}</a>
        ) : (
          article.title
        )}
      </h3>
      {hasValidDate && (
        <p>
          <time dateTime={article.publishedAt}>
            Published {publishedDate.toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
        </p>
      )}
      <p>{article.description}</p>
    </article>
  );
}

export default ArticleCard;
