import { useState } from 'react'

function ArticleCard({ article, children, featured = false }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null)
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null
  const hasValidDate = publishedDate && !Number.isNaN(publishedDate.getTime())

  return (
    <article className={featured ? 'article-card article-card-featured' : 'article-card'}>
      <div className="article-meta">
        <p className="article-source">
          {featured && <span className="lead-label">Lead story</span>}
          {article.source}
        </p>
        {hasValidDate && (
          <time className="article-date" dateTime={article.publishedAt}>
            {publishedDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </time>
        )}
      </div>
      {article.imageUrl && article.imageUrl !== failedImageUrl && (
        <img className="article-image" src={article.imageUrl} alt=""
          loading={featured ? 'eager' : 'lazy'} referrerPolicy="no-referrer"
          onError={() => setFailedImageUrl(article.imageUrl)} />
      )}
      <div className="article-content">
        <h3>{article.url ? <a href={article.url}>{article.title}</a> : article.title}</h3>
        <p className="article-description">{article.description}</p>
        <div className="article-actions">
          {article.url && <a className="read-story" href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`Read story: ${article.title} (opens in a new tab)`}>Read story <span aria-hidden="true">&rarr;</span></a>}
          {children}
        </div>
      </div>
    </article>
  )
}

export default ArticleCard
