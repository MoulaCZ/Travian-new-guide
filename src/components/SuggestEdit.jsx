import { useState } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react'

/* Controlled modal — no internal floating button.
   Parent is responsible for opening (open prop) and closing (onClose prop). */
export default function SuggestEdit({ open, onClose, currentPage }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  const reset = () => {
    setTitle('')
    setBody('')
    setName('')
    setStatus('idle')
  }

  const close = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const submit = async () => {
    if (!body.trim()) return
    setStatus('sending')

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

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: issueTitle, body: issueBody }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
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
              <p className="text-gray-400 text-sm">Could not submit the suggestion. This feature requires the Keboola deployment.</p>
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
