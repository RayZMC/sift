import './App.css'
import ArticleCard from './components/ArticleCard.jsx'

function App() {

  const articles = [
    {
      id: 1,
      title: 'Community opens new rec centre',
      source: 'Example news',
      description: 'The center blah',
      url: 'https://example.com/?article=1',
    },
    {
      id: 2,
      title: 'City is growing',
      source: 'Sample News',
      description: 'The city is growing',
      url: 'https://example.com/?article=2',
    }
  ]

  return (
    <main>
      <header>
        <h1>Sift</h1>
        <p>Discover news from multiple sources in one place.</p>
      </header>

      <section>
        <h2>Latest news</h2>

        {articles.length === 0 && (
          <p>No articles to display</p>
        )}
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
    </main>
  )
}

export default App