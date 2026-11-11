const CACHE_DURATION_MS = 5 * 60 * 1000
const PARTIAL_CACHE_DURATION_MS = 60 * 1000

export function createNewsCache(loadArticles, now = Date.now) {
  // This memory belongs to one server process and clears when it restarts.
  let cachedResult = null
  let expiresAt = 0
  let pendingRequest = null

  return async function getCachedArticles() {
    if (cachedResult && now() < expiresAt) {
      return cachedResult
    }

    // Concurrent visitors share the same download while the cache refreshes.
    if (!pendingRequest) {
      pendingRequest = loadArticles()
        .then((result) => {
          const duration = result.unavailableFeeds.length > 0
            ? PARTIAL_CACHE_DURATION_MS
            : CACHE_DURATION_MS

          cachedResult = result
          expiresAt = now() + duration
          return result
        })
        .finally(() => {
          // Runs after success or failure so a later request can try again.
          pendingRequest = null
        })
    }

    return pendingRequest
  }
}
