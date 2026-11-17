import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createDatabasePool } from '../db/pool.js'

const directory = new URL('../db/migrations/', import.meta.url)
let pool
let client

try {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()
  pool = createDatabasePool()
  client = await pool.connect()
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(736946)')
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const applied = []
  for (const file of files) {
    const sql = await readFile(new URL(file, directory), 'utf8')
    const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
    const { rows } = await client.query(
      'SELECT checksum FROM schema_migrations WHERE filename = $1', [file],
    )
    if (rows.length > 0) {
      if (rows[0].checksum !== checksum) {
        throw new Error(`Applied migration changed: ${file}. Add a new migration instead.`)
      }
      continue
    }

    await client.query(sql)
    await client.query(
      'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
      [file, checksum],
    )
    applied.push(file)
  }

  await client.query('COMMIT')
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.')
} catch (error) {
  if (client) await client.query('ROLLBACK')
  console.error('Migration failed:', error.message)
  process.exitCode = 1
} finally {
  if (client) client.release()
  if (pool) await pool.end()
}
