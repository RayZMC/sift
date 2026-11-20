import './App.css'
import ArticleCard from './components/ArticleCard.jsx'
import { useEffect, useState } from 'react'

function App() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [articles, setArticles] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ hasNext: false })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    async function loadArticles() {
      try {
        const params = new URLSearchParams({ page: String(page), category: selectedCategory })
        const response = await fetch(`/api/articles?${params}`, { signal: controller.signal })

        if(!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data = await response.json()
        if (!Array.isArray(data.articles) || !data.pagination) {
          throw new Error('Invalid articles response')
        }

        if (!ignore) {
          setArticles(data.articles)
          setPagination(data.pagination)
          setLoadStatus('success')
        }
      } catch (error) {
          if (!ignore) {
            console.error(error)
            setLoadStatus('error')
          }
      }
    }

    loadArticles()

    return () => {
      ignore = true
      controller.abort()
    }

  }, [page, selectedCategory, retryCount])

  function startLoading() {
    setLoadStatus('loading')
    setArticles([])
    setPagination({ hasNext: false })
  }

  function retryArticles() {
    startLoading()
    setRetryCount((count) => count + 1)
  }

  function changePage(nextPage) {
    startLoading()
    setPage(nextPage)
  }

  return (
    <main>
      <header>
        <h1>Sift</h1>
        <p>Discover news from multiple sources in one place.</p>
      </header>

      <section>
        <h2>Latest news</h2>

        <label htmlFor="category">Category: </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(event) => {
            startLoading()
            setSelectedCategory(event.target.value)
            setPage(1)
          }}
        >
          <option value="All">All categories</option>
          <option value="World">World</option>
          <option value="Business">Business</option>
          <option value="Technology">Technology</option>
        </select>

        {loadStatus === 'loading' && (
          <p role="status">Loading articles...</p>
        )}

        {loadStatus === 'error' && (
          <p role="alert" className="feed-notice">Could not load news right now. Please try again shortly.</p>
        )}

        {loadStatus === 'error' && (
          <button type="button" className="retry-button" onClick={retryArticles}>
            Try again
          </button>
        )}

        {loadStatus === 'success' && articles.length === 0 && (
          <p>No articles are available on this page.</p>
        )}

        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}

        <nav className="pagination" aria-label="News pages">
          <button
            type="button"
            disabled={loadStatus === 'loading' || page === 1}
            onClick={() => changePage(page - 1)}
          >
            Previous
          </button>
          <span role="status">Page {page}</span>
          <button
            type="button"
            disabled={loadStatus !== 'success' || !pagination.hasNext}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </nav>
      </section>
    </main>
  )
}

export default App
