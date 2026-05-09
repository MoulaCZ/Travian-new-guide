import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

/* ── Component ──────────────────────────────────────────────── */
export default function MarkdownPage({ content, onNavigate }) {
  const base = import.meta.env.BASE_URL

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

    /* Paragraph */
    p: ({ children }) => (
      <p className="text-gray-300 leading-7 mb-4 last:mb-0">{children}</p>
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

    /* Lists */
    ul: ({ children }) => (
      <ul className="mb-4 ml-5 space-y-1.5 list-disc marker:text-amber-500">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-5 space-y-1.5 list-decimal marker:text-amber-500">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-300 leading-7 pl-1">{children}</li>
    ),

    /* Blockquote */
    blockquote: ({ children }) => {
      const type = getBlockquoteType(children)
      return (
        <blockquote
          className={`border-l-[3px] px-4 py-3 my-5 rounded-r-lg text-sm leading-relaxed ${bqTheme[type]}`}
        >
          {children}
        </blockquote>
      )
    },

    /* Tables */
    table: ({ children }) => (
      <div className="overflow-x-auto my-6 rounded-xl border border-[#30363d] shadow-lg">
        <table className="w-full text-sm border-collapse min-w-max">{children}</table>
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
    tr: ({ children }) => (
      <tr className="hover:bg-[#21262d]/60 transition-colors duration-100">{children}</tr>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-gray-300 text-sm align-top">{children}</td>
    ),

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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  )
}
