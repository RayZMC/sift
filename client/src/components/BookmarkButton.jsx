import { useState } from 'react'

export default function BookmarkButton({ saved, onSave, onRemove }) {
  const [error, setError] = useState('')
  function update() {
    try {
      if (saved) onRemove()
      else onSave()
      setError('')
    } catch (failure) { setError(failure.message) }
  }
  return <div className="bookmark-controls">
    <button type="button" onClick={update}>{saved ? 'Remove bookmark' : 'Save article'}</button>
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>
}
