import { createApp } from './app.js'
import { createDatabasePool } from './db/pool.js'
import { getArticlePage } from './repositories/articles.js'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const rawPort = process.env.PORT ?? '3001'
if (!/^\d+$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.')
}
const port = Number(rawPort)
const clientDirectory = process.env.NODE_ENV === 'production'
    ? fileURLToPath(new URL('../client/dist/', import.meta.url))
    : undefined
if (clientDirectory) {
    try {
        await access(join(clientDirectory, 'index.html'))
    } catch {
        throw new Error('Frontend build not found. Run npm run build from the server folder before npm start.')
    }
}

const pool = createDatabasePool()
const app = createApp(async (filters) => ({
    ...await getArticlePage(pool, filters),
    // Kept for frontend compatibility; database reads do not check publishers.
    unavailableFeeds: [],
}), { clientDirectory })

const server = app.listen(port, () => {
    console.log(`Sift ${clientDirectory ? 'website and API' : 'API'} running at http://localhost:${server.address().port}`)
})

let stopping = false
function shutdown(exitCode = 0) {
    if (stopping) return
    stopping = true
    process.exitCode = exitCode
    console.log('Stopping Sift...')
    // Let active requests finish, but do not hang indefinitely during deployment.
    const timeout = setTimeout(() => {
        console.error('Shutdown timed out.')
        process.exit(1)
    }, 15000)
    timeout.unref()
    server.close(async (error) => {
        try {
            if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') throw error
        } catch {
            process.exitCode = 1
        } finally {
            try {
                await pool.end()
            } catch {
                console.error('Could not close database connections.')
                process.exitCode = 1
            }
            clearTimeout(timeout)
            process.removeListener('SIGINT', stop)
            process.removeListener('SIGTERM', stop)
        }
    })
}
const stop = () => shutdown()
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
server.on('error', (error) => {
    console.error('Could not start the server:', error.code || 'unknown error')
    shutdown(1)
})
