import { setTimeout as delay } from 'node:timers/promises'

export function getImportInterval(value = '15') {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1440) {
    throw new Error('NEWS_IMPORT_INTERVAL_MINUTES must be an integer from 1 to 1440.')
  }
  return Number(value) * 60 * 1000
}

export async function runImportLoop({ importNews, intervalMs, signal, onError, wait = delay }) {
  while (!signal.aborted) {
    try {
      // Await completion before scheduling the next import: no overlap in this worker.
      await importNews()
    } catch (error) {
      onError(error)
    }
    if (signal.aborted) break

    try {
      await wait(intervalMs, undefined, { signal })
    } catch (error) {
      if (signal.aborted && error.name === 'AbortError') break
      throw error
    }
  }
}
