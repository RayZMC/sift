import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  const [error, setError] = useState('')

  useEffect(() => {
    function syncTheme(event) {
      if (event.key !== 'sift.theme' && event.key !== null) return
      const next = event.newValue === 'light' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      setTheme(next)
      setError('')
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('sift.theme', next)
      setError('')
    } catch {
      setError('Theme changed, but this browser could not save your preference.')
    }
  }

  return (
    <div className="theme-control">
      <button className="theme-toggle" type="button" onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        <span aria-hidden="true">{theme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}</span>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
      {error && <p className="theme-error" role="status">{error}</p>}
    </div>
  )
}
