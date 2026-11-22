import './App.css'
import ArticleCard from './components/ArticleCard.jsx'
import DateFilter from './components/DateFilter.jsx'
import BookmarkButton from './components/BookmarkButton.jsx'
import SavedArticles from './components/SavedArticles.jsx'
import useLocalLibrary from './hooks/useLocalLibrary.js'
import { useEffect, useState } from 'react'

function App() {
  const library = useLocalLibrary()
  const [showingSaved, setShowingSaved] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('Top')
  const [selectedPublisher, setSelectedPublisher] = useState('All')
  const [articles, setArticles] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ hasNext: false })
  const [retryCount, setRetryCount] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [activeDates, setActiveDates] = useState({ from: '', to: '' })

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    async function loadArticles() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          category: selectedCategory,
          publisher: selectedPublisher,
          q: activeSearch,
        })
        if (activeDates.from) params.set('from', activeDates.from)
        if (activeDates.to) params.set('to', activeDates.to)
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

  }, [page, selectedCategory, selectedPublisher, activeSearch, activeDates, retryCount])

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

  function applySearch(value) {
    const search = value.trim()
    startLoading()
    setSearchInput(search)
    setActiveSearch(search)
    setPage(1)
    // Also refresh when the same search is submitted again.
    setRetryCount((count) => count + 1)
  }

  function applyDates(dates) {
    startLoading()
    setActiveDates(dates)
    setPage(1)
    setRetryCount((count) => count + 1)
  }

  return (
    <main>
      <header>
        <h1>Sift</h1>
        <p>Discover news from multiple sources in one place.</p>
      </header>

      {library.error && <p role="alert">{library.error}</p>}
      <nav className="feed-tabs" aria-label="News categories">
        {['Top', 'World', 'Technology', 'Business', 'Science', 'Sports', 'Entertainment'].map(category => (
          <button key={category} type="button" aria-pressed={!showingSaved && selectedCategory === category}
            onClick={() => {
              setShowingSaved(false)
              if (selectedCategory !== category) {
                startLoading()
                setSelectedCategory(category)
                setPage(1)
              }
            }}>
            {category}
          </button>
        ))}
        <button type="button" aria-pressed={showingSaved} onClick={() => setShowingSaved(true)}>
          Saved <span className="saved-count">{library.bookmarks.length}</span>
        </button>
      </nav>
      {showingSaved && <SavedArticles articles={library.bookmarks} onRemove={library.removeArticle} />}

      <section hidden={showingSaved}>
        <h2>{selectedCategory === 'Top' ? 'Top news' : `${selectedCategory} news`}</h2>
        {selectedCategory === 'Top' && <p>Headlines selected by BBC News and The Guardian, newest first.</p>}

        <form
          className="search-form"
          role="search"
          aria-label="Search news"
          onSubmit={(event) => {
            event.preventDefault()
            applySearch(searchInput)
          }}
        >
          <label htmlFor="news-search">Search titles and descriptions</label>
          <div className="search-controls">
            <input
              id="news-search"
              type="search"
              value={searchInput}
              maxLength={200}
              placeholder="e.g. artificial intelligence"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button type="submit">Search</button>
            <button
              type="button"
              disabled={!searchInput && !activeSearch}
              onClick={() => applySearch('')}
            >
              Clear
            </button>
          </div>
        </form>

        <div className="feed-filters">
          <div className="filter-field">
            <label htmlFor="publisher">Publisher</label>
            <select
              id="publisher"
              value={selectedPublisher}
              onChange={(event) => {
                startLoading()
                setSelectedPublisher(event.target.value)
                setPage(1)
              }}
            >
              <option value="All">All publishers</option>
              <option value="BBC News">BBC News</option>
              <option value="The Guardian">The Guardian</option>
            </select>
          </div>
        </div>

        <DateFilter activeDates={activeDates} onApply={applyDates} />

        {activeSearch && (
          <p className="search-summary">Search results for “{activeSearch}”</p>
        )}

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
          <p>{activeSearch
            ? 'No articles match this search on this page. Try another search or adjust your filters.'
            : 'No articles match these filters on this page. Try adjusting your category, publisher, or dates.'}</p>
        )}

        {articles.map((article) => (
          <ArticleCard key={article.id} article={article}>
            <BookmarkButton saved={library.bookmarks.some(saved => saved.id === article.id)}
              onSave={() => library.saveArticle(article)} onRemove={() => library.removeArticle(article.id)} />
          </ArticleCard>
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
