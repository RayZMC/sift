import './App.css'
import ArticleCard from './components/ArticleCard.jsx'
import { useState } from 'react'

function App() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const articles = [
    {
      id: 1,
      title: 'Community opens new rec centre',
      source: 'Example news',
      description: 'The center blah',
      url: 'https://example.com/?article=1',
      category: 'World',
    },
    {
      id: 2,
      title: 'City is growing',
      source: 'Sample News',
      description: 'The city is growing',
      url: 'https://example.com/?article=2',
      category: 'Business',
    }
  ]

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
        </select>

        {visibleArticles.length === 0 && (
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