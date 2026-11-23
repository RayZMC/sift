import './App.css'
import siftLogo from './assets/sift_dark_theme_transparent.png'
import ArticleCard from './components/ArticleCard.jsx'
import DateFilter from './components/DateFilter.jsx'
import FilterPopover from './components/FilterPopover.jsx'
import CategoryIcon from './components/CategoryIcon.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import InfoPage from './components/InfoPage.jsx'
import BookmarkButton from './components/BookmarkButton.jsx'
import SavedArticles from './components/SavedArticles.jsx'
import useLocalLibrary from './hooks/useLocalLibrary.js'
import { useEffect, useState } from 'react'

function App() {
  const [locationHash, setLocationHash] = useState(() => window.location.hash)
  const infoPage = ['#about', '#contact', '#privacy'].includes(locationHash) ? locationHash.slice(1) : null
  useEffect(() => {
    const updateHash = () => setLocationHash(window.location.hash)
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [])
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
    window.location.hash = ''
    setShowingSaved(false)
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
    <>
      <header className="site-header">
        <div className="top-bar">
          <h1 className="brand">
            <button type="button" aria-label="Sift home" onClick={() => {
              window.location.hash = ''
              setShowingSaved(false)
              startLoading()
              setSelectedCategory('Top')
              setSelectedPublisher('All')
              setSearchInput('')
              setActiveSearch('')
              setActiveDates({ from: '', to: '' })
              setPage(1)
              setRetryCount(count => count + 1)
            }}>
              <img className="brand-logo" src={siftLogo} alt="Sift" />
            </button>
          </h1>
          <form
            className="search-form"
            role="search"
            aria-label="Search news"
            onSubmit={(event) => {
              event.preventDefault()
              applySearch(searchInput)
            }}
          >
            <label className="visually-hidden" htmlFor="news-search">Search news titles and descriptions in the selected category</label>
            <div className="search-controls">
              <input
                id="news-search"
                type="search"
                value={searchInput}
                maxLength={200}
                placeholder="Search news..."
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </form>
        </div>
        <div className="category-bar">
          <nav className="feed-tabs" aria-label="News categories">
            {['Top', 'World', 'Technology', 'Business', 'Science', 'Sports', 'Entertainment'].map(category => (
              <button key={category} type="button" aria-pressed={!infoPage && !showingSaved && selectedCategory === category}
                onClick={() => {
                  window.location.hash = ''
                  setShowingSaved(false)
                  if (selectedCategory !== category) {
                    startLoading()
                    setSelectedCategory(category)
                    setPage(1)
                  }
                }}>
                <CategoryIcon category={category} />
                {category}
              </button>
            ))}
            <button type="button" aria-pressed={!infoPage && showingSaved} onClick={() => { window.location.hash = ''; setShowingSaved(true) }}>
              <CategoryIcon category="Saved" />
              Saved <span className="saved-count">{library.bookmarks.length}</span>
            </button>
          </nav>
        </div>
      </header>
      <main>
        {infoPage && <InfoPage page={infoPage} />}
        <div hidden={Boolean(infoPage)}>

        {library.error && <p role="alert">{library.error}</p>}

        {showingSaved && <SavedArticles articles={library.bookmarks} onRemove={library.removeArticle} />}

        <section className="news-section" hidden={showingSaved}>
          <div className="feed-heading">
          <h2>{selectedCategory === 'Top' ? 'Top news' : `${selectedCategory} news`}</h2>

          <FilterPopover active={selectedPublisher !== 'All' || Boolean(activeDates.from || activeDates.to)}>
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
                  <option value="CBC News">CBC News</option>
                  <option value="Global News">Global News</option>
                  <option value="NPR">NPR</option>
                  <option value="PBS News">PBS News</option>
                </select>
              </div>
            </div>

            <DateFilter activeDates={activeDates} onApply={applyDates} />
          </FilterPopover>
          </div>

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

          <div className="article-grid">
            {articles.map((article, index) => (
              <ArticleCard key={article.id} article={article} featured={index === 0}>
                <BookmarkButton saved={library.bookmarks.some(saved => saved.id === article.id)}
                  onSave={() => library.saveArticle(article)} onRemove={() => library.removeArticle(article.id)} />
              </ArticleCard>
            ))}
          </div>

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
        </div>
      </main>
      <SiteFooter currentPage={infoPage} />
    </>
  )
}

export default App
