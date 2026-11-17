import { createDatabasePool } from '../db/pool.js'

let pool

try {
  pool = createDatabasePool()
  const { rows } = await pool.query(
    'SELECT current_database() AS database, current_user AS username',
  )
  console.log(`Connected to database "${rows[0].database}" as "${rows[0].username}".`)
} catch (error) {
  console.error('Database connection check failed:', error.code || error.message)
  process.exitCode = 1
} finally {
  // Release connections so this one-off command can exit.
  if (pool) await pool.end()
}
