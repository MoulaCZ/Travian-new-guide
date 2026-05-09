import http from 'http'
import https from 'https'
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

/* ── GitHub Issues proxy ──────────────────────────────────────
   Requires env var: GITHUB_TOKEN (set as Keboola secret)
   Token needs scope: public_repo (issues:write on this repo)
────────────────────────────────────────────────────────────── */
function handleSuggest(req, res) {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    try {
      const { title, body: issueBody } = JSON.parse(body)
      const token = process.env.GITHUB_TOKEN

      if (!token) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }))
      }

      const payload = JSON.stringify({
        title: title || 'Suggestion from guide',
        body: issueBody || '',
        labels: ['suggestion'],
      })

      const options = {
        hostname: 'api.github.com',
        path: '/repos/MoulaCZ/Travian-new-guide/issues',
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'travian-guide-app',
          'Content-Length': Buffer.byteLength(payload),
        },
      }

      const ghReq = https.request(options, ghRes => {
        let data = ''
        ghRes.on('data', c => { data += c })
        ghRes.on('end', () => {
          if (ghRes.statusCode === 201) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'GitHub API error', status: ghRes.statusCode }))
          }
        })
      })

      ghReq.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      })

      ghReq.write(payload)
      ghReq.end()
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Bad request' }))
    }
  })
}

/* ── Main server ─────────────────────────────────────────────── */
http.createServer((req, res) => {
  const url = req.url.split('?')[0]

  // Suggest endpoint — POST /api/suggest
  if (req.method === 'POST' && url === '/api/suggest') {
    return handleSuggest(req, res)
  }

  // Keboola sends POST / on startup — respond OK
  if (req.method === 'POST') {
    res.writeHead(200)
    return res.end()
  }

  // Redirect root to base
  if (url === '/') {
    res.writeHead(301, { Location: BASE + '/' })
    return res.end()
  }

  // Strip base prefix for static files
  let filePath
  if (url.startsWith(BASE)) {
    filePath = path.join(DIST, url.slice(BASE.length) || '/')
  } else {
    filePath = path.join(DIST, url)
  }

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
