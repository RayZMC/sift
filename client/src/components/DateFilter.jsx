import { useState } from 'react'

function DateFilter({ activeDates, onApply }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')

  function submitDates(event) {
    event.preventDefault()
    if (from && to && from > to) {
      setError('From date must be on or before To date.')
      return
    }
    setError('')
    onApply({ from, to })
  }

  function clearDates() {
    setFrom('')
    setTo('')
    setError('')
    onApply({ from: '', to: '' })
  }

  return (
    <form className="date-filter" aria-label="Filter by publication date" onSubmit={submitDates}>
      <p id="date-help">Publication dates use UTC. Either date is optional; both include the full day.</p>
      <div className="feed-filters">
        <div className="filter-field">
          <label htmlFor="date-from">From</label>
          <input
            id="date-from" type="date" min="0001-01-01" max="9999-12-31"
            value={from} aria-describedby="date-help" aria-invalid={Boolean(error)}
            onChange={(event) => { setFrom(event.target.value); setError('') }}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="date-to">To</label>
          <input
            id="date-to" type="date" min="0001-01-01" max="9999-12-31"
            value={to} aria-describedby="date-help" aria-invalid={Boolean(error)}
            onChange={(event) => { setTo(event.target.value); setError('') }}
          />
        </div>
      </div>
      {error && <p role="alert" className="feed-notice">{error}</p>}
      <div className="date-actions">
        <button type="submit">Apply dates</button>
        <button type="button" onClick={clearDates} disabled={!from && !to && !activeDates.from && !activeDates.to}>
          Clear dates
        </button>
      </div>
      {(activeDates.from || activeDates.to) && (
        <p className="search-summary">
          Applied dates (UTC): {activeDates.from || 'Any start date'} to {activeDates.to || 'Any end date'}.
        </p>
      )}
    </form>
  )
}

export default DateFilter
