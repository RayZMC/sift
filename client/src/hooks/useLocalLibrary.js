import { useEffect, useState } from 'react'

const validUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}
const validArticle = article => article &&
  ['id', 'title', 'source', 'category', 'description'].every(field => typeof article[field] === 'string') &&
  validUrl(article.url) && (article.imageUrl == null || validUrl(article.imageUrl)) &&
  (article.publishedAt == null || typeof article.publishedAt === 'string')

function readList(key, validate) {
  const raw = localStorage.getItem(key)
  const items = raw === null ? [] : JSON.parse(raw)
  if (!Array.isArray(items) || !items.every(validate)) throw new Error('Invalid browser data')
  return items
}

function useStoredList(key, validate) {
  const read = () => {
    try { return { items: readList(key, validate), error: '' } }
    catch { return { items: [], error: 'Could not read browser data. Check storage permissions; existing data has not been overwritten.' } }
  }
  const [state, setState] = useState(read)
  useEffect(() => {
    function refresh(event) {
      if (event.type === 'sift-storage' || event.key === key || event.key === null) {
        try { setState({ items: readList(key, validate), error: '' }) }
        catch { setState({ items: [], error: 'Could not read browser data. Existing data has not been overwritten.' }) }
      }
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('sift-storage', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('sift-storage', refresh)
    }
  }, [key, validate])
  function update(transform) {
    try {
      const items = transform(readList(key, validate))
      localStorage.setItem(key, JSON.stringify(items))
      setState({ items, error: '' })
      window.dispatchEvent(new Event('sift-storage'))
    } catch {
      throw new Error('Could not save to this browser. Storage may be full, blocked, or contain unreadable data.')
    }
  }
  return { ...state, update }
}

export default function useLocalLibrary() {
  const bookmarks = useStoredList('sift.bookmarks.v1', validArticle)
  return {
    bookmarks: bookmarks.items,
    error: bookmarks.error,
    saveArticle(article) {
      bookmarks.update(items => items.some(item => item.id === article.id) ? items : [{
        id: article.id, title: article.title, url: article.url, source: article.source,
        category: article.category, description: article.description,
        publishedAt: article.publishedAt, imageUrl: article.imageUrl,
      }, ...items])
    },
    removeArticle(id) { bookmarks.update(items => items.filter(item => item.id !== id)) },
  }
}
