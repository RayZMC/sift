import { useState } from 'react'

function ArticleCard({ article, children }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null)
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null
  const hasValidDate = publishedDate && !Number.isNaN(publishedDate.getTime())

  return (
    <article className="article-card">
      {article.imageUrl && article.imageUrl !== failedImageUrl && (
        <img
          className="article-image"
          src={article.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedImageUrl(article.imageUrl)}
        />
      )}
      <div className="article-content">
        <p className="article-source">{article.source}</p>
        <h3>
          {article.url ? (
            <a href={article.url}>{article.title}</a>
          ) : (
            article.title
          )}
        </h3>
        {hasValidDate && (
          <p className="article-date">
            <time dateTime={article.publishedAt}>
              Published {publishedDate.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </p>
        )}
        <p>{article.description}</p>
        {children}
      </div>
    </article>
  );
}

export default ArticleCard;
