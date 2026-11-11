import './App.css'
import ArticleCard from './components/ArticleCard.jsx'
import { useEffect, useState } from 'react'

function App() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [articles, setArticles] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [unavailableFeeds, setUnavailableFeeds] = useState([])
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadArticles() {
      try {
        const response = await fetch('/api/articles')

        if(!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data = await response.json()

        if (!ignore) {
          setArticles(data.articles)
          setUnavailableFeeds(data.unavailableFeeds)
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
    }

  }, [retryCount])

  function retryArticles() {
    setLoadStatus('loading')
    setArticles([])
    setUnavailableFeeds([])
    setRetryCount((count) => count + 1)
  }

  const visibleArticles = selectedCategory === 'All' ? articles : articles.filter((article) => article.category === selectedCategory)

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
          onChange={(event) => setSelectedCategory(event.target.value)}
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

        {loadStatus === 'success' && unavailableFeeds.length > 0 && (
          <p role="status" className="feed-notice">
            Some feeds are temporarily unavailable: {unavailableFeeds.map((feed) =>
              `${feed.source} (${feed.category})`,
            ).join(', ')}.
          </p>
        )}

        {(loadStatus === 'error' || (loadStatus === 'success' && unavailableFeeds.length > 0)) && (
          <button type="button" className="retry-button" onClick={retryArticles}>
            Try again
          </button>
        )}

        {loadStatus === 'success' && visibleArticles.length === 0 && (
          <p>No articles are available in this category right now.</p>
        )}

        {visibleArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
    </main>
  )
}

export default App
