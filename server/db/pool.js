import pg from 'pg'

export function createDatabasePool() {
  let connectionString

  if (process.env.DATABASE_URL) {
    let url
    try {
      url = new URL(process.env.DATABASE_URL)
    } catch {
      // Do not include the URL in errors: it contains the database password.
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.')
    }

    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.')
    }

    // Hosted connections must encrypt traffic and verify the server certificate.
    url.searchParams.set('sslmode', 'verify-full')
    connectionString = url.toString()
  } else {
    for (const name of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
      if (!process.env[name]) throw new Error(`Missing database setting: ${name}`)
    }
  }

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  })

  pool.on('error', (error) => {
    console.error('An idle database connection failed:', error.code || 'unknown error')
  })

  return pool
}
