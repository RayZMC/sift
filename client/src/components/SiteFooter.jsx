export default function SiteFooter({ currentPage }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>&copy; {new Date().getFullYear()} Sift. Article content belongs to its respective publishers.</p>
        <nav aria-label="Footer">
          {[
            ['about', 'About'], ['contact', 'Contact'], ['privacy', 'Privacy Policy'],
          ].map(([page, label]) => (
            <a key={page} href={`#${page}`} aria-current={currentPage === page ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
