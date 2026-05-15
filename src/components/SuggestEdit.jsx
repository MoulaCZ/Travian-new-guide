import { useState } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react'

/** Same origin + Vite base path so Keboola/GitHub Pages both hit the Node proxy URL */
function suggestEndpointUrl() {
  const base = import.meta.env.BASE_URL || '/'
  return new URL('api/suggest', `${window.location.origin}${base}`).href
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Cold starts / transient GitHub errors — retry POST only when failure looks retryable */
async function postSuggestion(payload) {
  const url = suggestEndpointUrl()
  const delays = [0, 550, 1300]
  let lastDetail = ''

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await sleep(delays[attempt])
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) return { ok: true }

      let detail = ''
      try {
        const j = await res.json()
        detail = typeof j?.error === 'string' ? j.error : ''
      } catch {
        /* ignore */
      }
      lastDetail = detail || `HTTP ${res.status}`

      const retry =
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504

      if (!retry || attempt === delays.length - 1)
        return { ok: false, status: res.status, detail }
    } catch {
      lastDetail = 'Network error'
      if (attempt === delays.length - 1) return { ok: false, status: 0, detail: lastDetail }
    }
  }

  return { ok: false, status: 0, detail: lastDetail }
}

/* Controlled modal — no internal floating button.
   Parent is responsible for opening (open prop) and closing (onClose prop). */
export default function SuggestEdit({ open, onClose, currentPage }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [errorHint, setErrorHint] = useState('')

  const reset = () => {
    setTitle('')
    setBody('')
    setName('')
    setStatus('idle')
    setErrorHint('')
  }

  const close = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const submit = async () => {
    if (!body.trim()) return
    setStatus('sending')
    setErrorHint('')

    const issueTitle = title.trim() || `Suggestion for: ${currentPage}`
    const issueBody = [
      `**Page:** ${currentPage}`,
      name.trim() ? `**Submitted by:** ${name.trim()}` : null,
      '',
      '**Suggestion:**',
      body.trim(),
      '',
      '---',
      '*Submitted via Travian Guide app*',
    ]
      .filter(l => l !== null)
      .join('\n')

    const result = await postSuggestion({ title: issueTitle, body: issueBody })

    if (result.ok) {
      setStatus('success')
      return
    }

    setStatus('error')

    const { status: httpStatus, detail } = result
    if (detail === 'GITHUB_TOKEN not configured' || detail.includes('GITHUB_TOKEN'))
      setErrorHint('Server is missing GitHub credentials — tell the admin to set GITHUB_TOKEN on the Keboola data app.')
    else if (httpStatus === 404)
      setErrorHint('Suggestion API was not found. Use the deployed guide (Keboola data app), not raw GitHub Pages.')
    else if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504)
      setErrorHint('Backend or GitHub was temporarily unavailable — try again in a few seconds.')
    else if (detail && detail !== `HTTP ${httpStatus}`)
      setErrorHint(detail)
    else setErrorHint(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <MessageSquarePlus className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white text-sm">Suggest an Edit</span>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {status === 'success' ? (
            <div className="flex flex-col items-center py-6 text-center gap-3">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-white font-semibold">Thanks for the suggestion!</p>
              <p className="text-gray-400 text-sm">It's been submitted as a GitHub issue and will be reviewed soon.</p>
              <button
                onClick={close}
                className="mt-2 px-4 py-2 rounded-lg bg-[#21262d] border border-[#30363d] text-gray-300 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center py-6 text-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-white font-semibold">Something went wrong</p>
              <p className="text-gray-400 text-sm">
                {errorHint ||
                  'Could not submit the suggestion. Use the Keboola-hosted guide so suggestions reach GitHub (GitHub Pages has no backend).'}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 px-4 py-2 rounded-lg bg-[#21262d] border border-[#30363d] text-gray-300 hover:text-white text-sm transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 bg-[#21262d] rounded-lg px-3 py-2">
                Current page: <span className="text-amber-400 font-medium">{currentPage}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Your name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aragorn"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Suggestion <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Describe what's wrong or what you'd like to add..."
                  rows={4}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/60 transition-colors resize-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={!body.trim() || status === 'sending'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-[#21262d] disabled:text-gray-500 text-black font-semibold text-sm transition-colors"
              >
                {status === 'sending' ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit suggestion</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
