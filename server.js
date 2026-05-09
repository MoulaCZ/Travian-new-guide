import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3000
const BASE = '/Travian-new-guide'
const DIST = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff2':'font/woff2',
}

http.createServer((req, res) => {
  // Keboola sends POST on startup — respond OK
  if (req.method === 'POST') {
    res.writeHead(200)
    return res.end()
  }

  let url = req.url.split('?')[0]

  // Redirect root to base
  if (url === '/') {
    res.writeHead(301, { Location: BASE + '/' })
    return res.end()
  }

  // Strip base prefix
  if (url.startsWith(BASE)) {
    url = url.slice(BASE.length) || '/'
  }

  let filePath = path.join(DIST, url)

  // SPA fallback: if not a file, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      return res.end('Not found')
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}).listen(PORT, () => {
  console.log(`Travian Guide running on port ${PORT}`)
})
