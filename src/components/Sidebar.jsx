import {
  BookOpen, MapPin, Shield, Wheat, Swords,
  Flag, Coins, Lightbulb, X, ChevronRight, Rocket,
} from 'lucide-react'

const iconMap = { BookOpen, MapPin, Shield, Wheat, Swords, Flag, Coins, Lightbulb }

export default function Sidebar({ pages, currentPage, onNavigate, isOpen, onClose, onOpenOnboarding }) {
  return (
    <aside
      className={[
        'fixed lg:static inset-y-0 left-0 z-30',
        'w-64 flex flex-col flex-shrink-0',
        'bg-[#161b22] border-r border-[#30363d]',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* ── Brand ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#30363d] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-gray-950" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate leading-none">Travian Legends</div>
            <div className="text-[10px] text-amber-500/80 leading-none mt-0.5">Alliance Guide</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden ml-2 p-1 text-gray-500 hover:text-gray-300 rounded flex-shrink-0"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2 select-none">
          Guide Pages
        </p>
        <div className="space-y-0.5">
          {pages.map(page => {
            const Icon = iconMap[page.icon] ?? BookOpen
            const active = page.id === currentPage
            return (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left',
                  'transition-all duration-150 group',
                  active
                    ? 'bg-amber-500/15 text-amber-300 font-medium'
                    : 'text-gray-400 hover:bg-[#21262d] hover:text-gray-200',
                ].join(' ')}
              >
                <Icon
                  className={[
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    active ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400',
                  ].join(' ')}
                />
                <span className="flex-1 truncate">{page.title}</span>
                {active && (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Footer ────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-[#30363d] flex-shrink-0 space-y-2">
        <button
          onClick={() => { onOpenOnboarding?.(); onClose?.() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-[#21262d] hover:text-amber-400 transition-colors group"
        >
          <Rocket className="w-4 h-4 flex-shrink-0 text-gray-600 group-hover:text-amber-400 transition-colors" />
          <span>Getting Started</span>
        </button>
        <p className="text-[10px] text-gray-600 leading-relaxed px-3">
          Free-to-play · Defensive play
        </p>
      </div>
    </aside>
  )
}
