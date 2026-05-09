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
    /* Headings */
    h1: ({ children }) => (
      <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-6 pb-4 border-b border-[#30363d] leading-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg md:text-xl font-semibold text-amber-400 mt-10 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-gray-100 mt-7 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">
        {children}
      </h4>
    ),

    /* Paragraph — with tooltip injection */
    p: ({ children }) => (
      <p className="text-gray-300 leading-7 mb-4 last:mb-0">{processChildren(children)}</p>
    ),

    /* Inline */
    strong: ({ children }) => (
      <strong className="text-gray-100 font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="text-gray-300 italic">{children}</em>
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
      <ul className="mb-4 ml-5 space-y-1.5 list-disc marker:text-amber-500">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-5 space-y-1.5 list-decimal marker:text-amber-500">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-300 leading-7 pl-1">{processChildren(children)}</li>
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
      <div className="overflow-x-auto my-6 rounded-xl border border-[#30363d] shadow-lg">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[#21262d] sticky top-0">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="text-left px-4 py-3 text-amber-400 font-semibold text-xs uppercase tracking-wider whitespace-nowrap border-b border-[#30363d]">
        {children}
      </th>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-[#21262d]">{children}</tbody>
    ),

    tr: ({ children, node }) => {
      const rowNum = getBuildRowNum(node)
      if (rowNum !== null) {
        const done = !!progress[rowNum]
        return (
          <tr
            onClick={() => toggleRow(rowNum)}
            className={`cursor-pointer transition-colors duration-100 ${
              done
                ? 'bg-emerald-950/25 hover:bg-emerald-950/35'
                : 'hover:bg-[#21262d]/60'
            }`}
          >
            {children}
            <td className="px-3 py-2 text-center w-8">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-xs font-bold transition-colors ${
                done
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                  : 'border-[#484f58] text-transparent'
              }`}>
                ✓
              </span>
            </td>
          </tr>
        )
      }
      return (
        <tr className="hover:bg-[#21262d]/60 transition-colors duration-100">{children}</tr>
      )
    },

    td: ({ children, node }) => {
      // First cell (#) and third cell (Tier) stay narrow; Notes wraps
      const text = (() => {
        try {
          function t(n) { return n?.type === 'text' ? n.value : (n?.children ?? []).map(t).join('') }
          return t(node).trim()
        } catch { return '' }
      })()
      const isNum = /^\d+$/.test(text)
      return (
        <td className={`px-4 py-2.5 text-gray-300 text-sm align-top ${isNum ? 'whitespace-nowrap w-10 text-center' : ''}`}>
          {isNum ? text : processChildren(children)}
        </td>
      )
    },

    /* Code */
    code: ({ inline, className, children }) => {
      if (inline || !className) {
        return (
          <code className="bg-[#21262d] text-amber-300 px-1.5 py-0.5 rounded text-[0.84em] font-mono">
            {children}
          </code>
        )
      }
      return (
        <div className="my-4 rounded-xl overflow-hidden border border-[#30363d]">
          <pre className="bg-[#161b22] p-4 overflow-x-auto">
            <code className="text-gray-300 text-sm font-mono leading-relaxed">{children}</code>
          </pre>
        </div>
      )
    },

    /* Divider */
    hr: () => <hr className="border-0 border-t border-[#30363d] my-8" />,

    /* Image */
    img: ({ src, alt }) => {
      const imgSrc = src?.startsWith('http') ? src : `${base}${(src ?? '').replace(/^\.\//, '')}`
      return (
        <figure className="my-8">
          <img
            src={imgSrc}
            alt={alt}
            className="w-full max-w-2xl mx-auto rounded-xl border border-[#30363d] block shadow-xl"
          />
          {alt && (
            <figcaption className="text-center text-xs text-gray-500 mt-2 italic">{alt}</figcaption>
          )}
        </figure>
      )
    },
  }

  return (
    <article className="max-w-4xl mx-auto px-5 md:px-10 py-8 md:py-12">
      {/* Build-order progress bar */}
      {totalRows > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Build Progress</span>
            <span className="text-xs text-gray-500">
              <span className={doneRows === totalRows ? 'text-emerald-400 font-semibold' : 'text-gray-300 font-semibold'}>
                {doneRows}
              </span>
              <span className="text-gray-600"> / {totalRows} steps</span>
            </span>
          </div>
          <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${totalRows ? (doneRows / totalRows) * 100 : 0}%` }}
            />
          </div>
          {doneRows > 0 && doneRows < totalRows && (
            <p className="text-xs text-gray-600 mt-2">Click any row to toggle completion</p>
          )}
          {doneRows === 0 && (
            <p className="text-xs text-gray-600 mt-2">Click rows in the build order below to track your progress</p>
          )}
          {doneRows === totalRows && (
            <p className="text-xs text-emerald-500 mt-2 font-medium">✓ All steps complete!</p>
          )}
        </div>
      )}

      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
