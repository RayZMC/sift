import { useState } from 'react'
import ArticleCard from './ArticleCard.jsx'
import BookmarkButton from './BookmarkButton.jsx'

export default function SavedArticles({ articles, onRemove }) {
  const [requestedPage, setPage] = useState(1)
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(articles.length / 20)))
  return <section aria-labelledby="saved-heading">
    <h2 id="saved-heading">Saved articles</h2>
    <p>Saved in this browser only. Clearing browser data removes these bookmarks.</p>
    {articles.length === 0 && <p>No saved articles yet. Save articles from Top or a category to read them later.</p>}
    {articles.slice((page - 1) * 20, page * 20).map(article => (
      <ArticleCard key={article.id} article={article}>
        <BookmarkButton saved onRemove={() => onRemove(article.id)} />
      </ArticleCard>
    ))}
    <nav className="pagination" aria-label="Saved article pages">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span role="status">Page {page}</span>
      <button type="button" disabled={page * 20 >= articles.length} onClick={() => setPage(page + 1)}>Next</button>
    </nav>
  </section>
}
