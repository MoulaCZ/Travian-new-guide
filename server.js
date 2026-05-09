import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000

// Keboola sends POST / on startup — handle it gracefully
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/') {
    return res.sendStatus(200)
  }
  next()
})

// Serve Vite build output
app.use(express.static(join(__dirname, 'dist')))

// SPA fallback — all other GET routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Travian Guide running on port ${PORT}`)
})
