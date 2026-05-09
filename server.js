import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000
const BASE = '/Travian-new-guide'

// Keboola sends POST / on startup — handle it gracefully
app.use((req, res, next) => {
  if (req.method === 'POST') return res.sendStatus(200)
  next()
})

// Redirect root to base path
app.get('/', (req, res) => {
  res.redirect(301, BASE + '/')
})

// Serve static Vite build at the correct base path
app.use(BASE, express.static(join(__dirname, 'dist')))

// SPA fallback for all sub-routes
app.get(`${BASE}/*`, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Travian Guide running on port ${PORT}`)
})
