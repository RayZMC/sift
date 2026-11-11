import './App.css'
import ArticleCard from './components/ArticleCard.jsx'
import { useEffect, useState } from 'react'

function App() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [articles, setArticles] = useState([])
  const [loadStatus, setLoadStatus] = useState('loading')

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
          setArticles(data)
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

  }, [])




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
          <p role="alert">Could not load articles. Please refresh to try again.</p>
        )}

        {loadStatus === 'success' && visibleArticles.length === 0 && (
          <p>No articles match this category</p>
        )}

        {visibleArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
    </main>
  )
}

export default App
