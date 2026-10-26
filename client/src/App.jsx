import './App.css'

function App() {

  const articles = [
    {
      id: 1,
      title: 'Community opens new rec centre',
      source: 'Example news',
      description: 'The center blah',
    },
    {
      id: 2,
      title: 'City is growing',
      source: 'Sample News',
      description: 'The city is growing',
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
          <article key={article.id}>
            <p>Sample Article - {article.source}</p>
            <h3>{article.title}</h3>
            <p>{article.description}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App