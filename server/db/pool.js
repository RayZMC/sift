import pg from 'pg'

export function createDatabasePool() {
  for (const name of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
    if (!process.env[name]) throw new Error(`Missing database setting: ${name}`)
  }

  const pool = new pg.Pool({
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  })

  pool.on('error', (error) => {
    console.error('An idle database connection failed:', error.code || 'unknown error')
  })

  return pool
}
