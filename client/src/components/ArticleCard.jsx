function ArticleCard({ article }) {
  return (
    <article>
      <p>Sample Article - {article.source}</p>
      <h3>
        {article.url ? (
          <a href={article.url}>{article.title}</a>
        ) : (
          article.title
        )}
      </h3>
      <p>{article.description}</p>
    </article>
  );
}

export default ArticleCard;
