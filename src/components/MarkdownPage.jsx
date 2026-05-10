import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Tooltip from './Tooltip'
import { GLOSSARY } from '../data/glossary'

/* ── Glossary: build regex once ─────────────────────────────── */
const TERMS = Object.keys(GLOSSARY)
const TERM_RE = new RegExp(
  `\\b(${TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`
)

function injectTooltips(text) {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(TERM_RE)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    const def = GLOSSARY[part]
    if (def) return <Tooltip key={i} term={part} definition={def} />
    return part
  })
}

function processChildren(children) {
  if (!children) return children
  if (typeof children === 'string') return injectTooltips(children)
  if (Array.isArray(children)) return children.map((c, i) => {
    if (typeof c === 'string') return <span key={i}>{injectTooltips(c)}</span>
    return c
  })
  return children
}

/* ── Blockquote emoji detection ─────────────────────────────── */
function getBlockquoteType(children) {
  try {
    const first = Array.isArray(children) ? children[0] : children
    const pChildren = first?.props?.children
    const parts = Array.isArray(pChildren) ? pChildren : [pChildren]
    const str = parts.map(c => (typeof c === 'string' ? c : '')).join('')
    if (str.includes('🟥')) return 'danger'
    if (str.includes('⚠️')) return 'warning'
    if (str.includes('💡')) return 'tip'
    if (str.includes('🟨')) return 'info'
  } catch (_) { /* ignore */ }
  return 'default'
}

const bqTheme = {
  danger:  'border-red-500/60 bg-red-950/25 [&_p]:text-red-200 [&_strong]:text-red-100',
  warning: 'border-amber-500/60 bg-amber-950/25 [&_p]:text-amber-200 [&_strong]:text-amber-100',
  tip:     'border-emerald-500/60 bg-emerald-950/25 [&_p]:text-emerald-200 [&_strong]:text-emerald-100',
  info:    'border-blue-500/60 bg-blue-950/25 [&_p]:text-blue-200 [&_strong]:text-blue-100',
  default: 'border-[#484f58] bg-[#161b22] [&_p]:text-gray-300',
}

/* ── Internal link resolver ─────────────────────────────────── */
function resolveInternal(href) {
  if (!href || href.startsWith('http') || href.startsWith('#')) return null
  if (!href.endsWith('.md')) return null
  return href.replace(/^\.\//, '').replace(/^docs\//, '').replace(/\.md$/, '').split('#')[0]
}

/* ── Build-order row detection ──────────────────────────────── */
// node is a hast element node; children may include whitespace text nodes.
function getBuildRowNum(node) {
  try {
    // Recursively collect all text from a hast node
    function getText(n) {
      if (!n) return ''
      if (n.type === 'text') return n.value
      if (Array.isArray(n.children)) return n.children.map(getText).join('')
      return ''
    }
    // Find first element child (skip whitespace text nodes)
    const firstCell = node?.children?.find(c => c?.type === 'element')
    const val = getText(firstCell).trim()
    const n = parseInt(val, 10)
    if (!isNaN(n) && String(n) === val && n > 0 && n <= 300) return n
  } catch (_) { /* ignore */ }
  return null
}

/* ── Component ──────────────────────────────────────────────── */
export default function MarkdownPage({ content, pageId, onNavigate }) {
  const base = import.meta.env.BASE_URL

  /* Build-order progress stored in localStorage */
  const storageKey = `travian-progress-${pageId}`
  const [progress, setProgress] = useState(() => {
    try {
      const s = localStorage.getItem(storageKey)
      return s ? JSON.parse(s) : {}
    } catch { return {} }
  })

  const toggleRow = (rowNum) => {
    setProgress(prev => {
      const next = { ...prev, [rowNum]: !prev[rowNum] }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  /* Count checkable rows in this page */
  const totalRows = useMemo(() => {
    const matches = content.match(/^\|\s*\d+\s*\|/gm)
    return matches ? matches.length : 0
  }, [content])

  const doneRows = Object.values(progress).filter(Boolean).length

  const components = {
    /* Headings — Cinzel medieval style */
    h1: ({ children }) => (
      <h1
        className="mt-2 mb-8 leading-tight"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        {/* Decorative top line */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#f0a820]/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#f0a820]/60" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#f0a820]/40" />
        </div>
        <span className="block text-2xl md:text-3xl font-bold text-[#f0e6d0] tracking-wide">
          {children}
        </span>
        {/* Decorative bottom line */}
        <div className="mt-5 h-[1px] bg-gradient-to-r from-[#f0a820]/50 via-[#f0a820]/20 to-transparent" />
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="mt-10 mb-4 flex items-center gap-3"
        style={{ fontFamily: 'Cinzel, Georgia, serif' }}
      >
        <div className="w-1 h-5 rounded-full bg-[#f0a820] flex-shrink-0" />
        <span className="text-base md:text-lg font-semibold text-[#f0a820] tracking-wide">
          {children}
        </span>
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold mt-7 mb-3" style={{ color: '#f0e6d0' }}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xs font-semibold uppercase tracking-widest mt-5 mb-2" style={{ color: '#7a6a55', fontFamily: 'Cinzel, Georgia, serif' }}>
        {children}
      </h4>
    ),

    /* Paragraph — with tooltip injection */
    p: ({ children }) => (
      <p className="leading-7 mb-4 last:mb-0" style={{ color: '#c4b49a' }}>{processChildren(children)}</p>
    ),

    /* Inline */
    strong: ({ children }) => (
      <strong className="font-semibold" style={{ color: '#f0e6d0' }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic" style={{ color: '#c4b49a' }}>{children}</em>
    ),

    /* Links */
    a: ({ href, children }) => {
      const id = resolveInternal(href)
      if (id) {
        return (
          <button
            onClick={() => onNavigate(id)}
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium cursor-pointer transition-colors"
          >
            {children}
          </button>
        )
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium transition-colors"
        >
          {children}
        </a>
      )
    },

    /* Lists — with tooltip injection */
    ul: ({ children }) => (
      <ul className="mb-4 ml-5 space-y-1.5 list-disc marker:text-[#f0a820]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-5 space-y-1.5 list-decimal marker:text-[#f0a820]">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-7 pl-1" style={{ color: '#c4b49a' }}>{processChildren(children)}</li>
    ),

    /* Blockquote */
    blockquote: ({ children }) => {
      const type = getBlockquoteType(children)
      return (
        <blockquote className={`border-l-[3px] px-4 py-3 my-5 rounded-r-lg text-sm leading-relaxed ${bqTheme[type]}`}>
          {children}
        </blockquote>
      )
    },

    /* Tables — with build-order checkbox rows */
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-xl border border-[#3e3226] shadow-lg">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="sticky top-0" style={{ background: '#241d14' }}>{children}</thead>
    ),
    th: ({ children }) => (
      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap border-b border-[#3e3226]" style={{ color: '#f0a820', fontFamily: 'Cinzel, Georgia, serif' }}>
        {children}
      </th>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-[#241d14]">{children}</tbody>
    ),

    tr: ({ children, node }) => {
      const rowNum = getBuildRowNum(node)
      if (rowNum !== null) {
        const done = !!progress[rowNum]
        return (
          <tr
            onClick={() => toggleRow(rowNum)}
            className="cursor-pointer transition-colors duration-100"
            style={{ background: done ? 'rgba(34,80,34,0.18)' : undefined }}
            onMouseEnter={e => { if (!done) e.currentTarget.style.background = 'rgba(36,29,20,0.8)' }}
            onMouseLeave={e => { if (!done) e.currentTarget.style.background = undefined }}
          >
            {children}
            <td className="px-3 py-2 text-center w-8">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-xs font-bold transition-colors ${
                done
                  ? 'border-emerald-600/60 text-emerald-400'
                  : 'border-[#3e3226] text-transparent'
              }`}
              style={{ background: done ? 'rgba(34,80,34,0.3)' : undefined }}>
                ✓
              </span>
            </td>
          </tr>
        )
      }
      return (
        <tr
          className="transition-colors duration-100"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(36,29,20,0.6)'}
          onMouseLeave={e => e.currentTarget.style.background = undefined}
        >{children}</tr>
      )
    },

    td: ({ children, node }) => {
      const text = (() => {
        try {
          function t(n) { return n?.type === 'text' ? n.value : (n?.children ?? []).map(t).join('') }
          return t(node).trim()
        } catch { return '' }
      })()
      const isNum = /^\d+$/.test(text)
      return (
        <td
          className={`px-4 py-2.5 text-sm align-top ${isNum ? 'whitespace-nowrap w-10 text-center' : ''}`}
          style={{ color: isNum ? '#7a6a55' : '#c4b49a' }}
        >
          {isNum ? text : processChildren(children)}
        </td>
      )
    },

    /* Code */
    code: ({ inline, className, children }) => {
      if (inline || !className) {
        return (
          <code className="px-1.5 py-0.5 rounded text-[0.84em] font-mono" style={{ background: '#241d14', color: '#f0a820' }}>
            {children}
          </code>
        )
      }
      return (
        <div className="my-4 rounded-xl overflow-hidden border border-[#3e3226]">
          <pre className="p-4 overflow-x-auto" style={{ background: '#1a1510' }}>
            <code className="text-sm font-mono leading-relaxed" style={{ color: '#c4b49a' }}>{children}</code>
          </pre>
        </div>
      )
    },

    /* Divider */
    hr: () => (
      <div className="my-8 flex items-center gap-3">
        <div className="h-[1px] flex-1" style={{ background: 'linear-gradient(90deg, transparent, #3e3226)' }} />
        <div className="w-1 h-1 rounded-full bg-[#3e3226]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#5a4930]" />
        <div className="w-1 h-1 rounded-full bg-[#3e3226]" />
        <div className="h-[1px] flex-1" style={{ background: 'linear-gradient(90deg, #3e3226, transparent)' }} />
      </div>
    ),

    /* Image */
    img: ({ src, alt }) => {
      const imgSrc = src?.startsWith('http') ? src : `${base}${(src ?? '').replace(/^\.\//, '')}`
      return (
        <figure className="my-8">
          <img
            src={imgSrc}
            alt={alt}
            className="w-full rounded-xl block shadow-xl"
            style={{ border: '1px solid #3e3226' }}
          />
          {alt && (
            <figcaption className="text-center text-xs text-gray-500 mt-2 italic">{alt}</figcaption>
          )}
        </figure>
      )
    },
  }

  return (
    <article className="max-w-5xl mx-auto px-5 md:px-10 py-8 md:py-12">
      {/* Build-order progress bar */}
      {totalRows > 0 && (
        <div className="mb-8 p-4 rounded-xl border" style={{ background: '#1a1510', borderColor: '#3e3226' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7a6a55', fontFamily: 'Cinzel, Georgia, serif' }}>
              Build Progress
            </span>
            <span className="text-xs" style={{ color: '#7a6a55' }}>
              <span style={{ color: doneRows === totalRows ? '#4ade80' : '#f0e6d0', fontWeight: 600 }}>{doneRows}</span>
              {' / '}{totalRows} steps
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#241d14' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalRows ? (doneRows / totalRows) * 100 : 0}%`,
                background: doneRows === totalRows
                  ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                  : 'linear-gradient(90deg, #c08010, #f0a820)',
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: '#5a4930' }}>
            {doneRows === totalRows
              ? '✓ All steps complete!'
              : doneRows > 0
                ? 'Click any row to toggle'
                : 'Click rows in the build order to track your progress'}
          </p>
        </div>
      )}

      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
