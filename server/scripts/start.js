// Set production mode before importing Express and the server, on any OS.
process.env.NODE_ENV = 'production'
await import('../index.js')
