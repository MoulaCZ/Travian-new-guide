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
        'bg-[#1a1510] border-r border-[#3e3226]',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* ── Brand ─────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-4 h-16 border-b border-[#3e3226] flex-shrink-0 overflow-hidden">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#241d14] to-[#1a1510]" />
        {/* Top gold line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f0a820] to-transparent opacity-60" />

        <div className="relative flex items-center gap-3 min-w-0">
          {/* Shield icon with gold border */}
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border border-[#f0a820]/40 bg-[#f0a820]/10">
            <Shield className="w-4 h-4 text-[#f0a820]" />
          </div>
          <div className="min-w-0">
            <div
              className="text-sm font-bold leading-none tracking-wide truncate"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#f0e6d0' }}
            >
              Travian Legends
            </div>
            <div className="text-[10px] mt-0.5 leading-none" style={{ color: '#f0a820', opacity: 0.8 }}>
              Alliance Guide
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="relative lg:hidden ml-2 p-1 text-[#7a6a55] hover:text-[#d4c4a8] rounded flex-shrink-0 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 select-none"
           style={{ color: '#5a4930', fontFamily: 'Cinzel, Georgia, serif' }}>
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
                    ? 'bg-[#f0a820]/12 border border-[#f0a820]/25'
                    : 'border border-transparent hover:bg-[#241d14] hover:border-[#3e3226]',
                ].join(' ')}
              >
                <Icon
                  className={[
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    active ? 'text-[#f0a820]' : 'text-[#5a4930] group-hover:text-[#a89880]',
                  ].join(' ')}
                />
                <span
                  className="flex-1 truncate"
                  style={{ color: active ? '#f0e6d0' : '#a89880' }}
                >
                  {page.title}
                </span>
                {active && (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f0a820', opacity: 0.6 }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Footer ────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-[#3e3226] flex-shrink-0 space-y-1">
        <button
          onClick={() => { onOpenOnboarding?.(); onClose?.() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border border-transparent hover:bg-[#241d14] hover:border-[#3e3226] group"
        >
          <Rocket className="w-4 h-4 flex-shrink-0 text-[#5a4930] group-hover:text-[#f0a820] transition-colors" />
          <span className="text-[#7a6a55] group-hover:text-[#d4c4a8] transition-colors">Getting Started</span>
        </button>
        <p className="text-[10px] leading-relaxed px-3" style={{ color: '#5a4930' }}>
          Free-to-play · Defensive play
        </p>
      </div>
    </aside>
  )
}
