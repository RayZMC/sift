import { useEffect, useRef } from 'react'

export default function FilterPopover({ active, children }) {
  const container = useRef(null)

  useEffect(() => {
    function closeOutside(event) {
      if (container.current && !container.current.contains(event.target)) container.current.open = false
    }
    function closeWithEscape(event) {
      if (event.key === 'Escape' && container.current?.open) {
        container.current.open = false
        container.current.querySelector('summary').focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [])

  return (
    <details className="news-filters" ref={container}>
      <summary>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters{active && <span className="filter-active" aria-label="Filters active" />}
      </summary>
      <div className="filter-popover" role="region" aria-label="News filters">
        {children}
      </div>
    </details>
  )
}
