import {
  BookOpen, MapPin, Shield, Wheat, Swords,
  Flag, Coins, Lightbulb, X, ChevronRight, ChevronLeft, Rocket, MessageSquarePlus,
} from 'lucide-react'

const iconMap = { BookOpen, MapPin, Shield, Wheat, Swords, Flag, Coins, Lightbulb }

export default function Sidebar({
  pages, currentPage, onNavigate,
  isOpen, onClose,
  onOpenOnboarding,
  collapsed, onToggleCollapse,
  onSuggest,
}) {
  return (
    <aside
      className={[
        /* Mobile: fixed drawer */
        'fixed lg:static inset-y-0 left-0 z-30',
        'flex flex-col flex-shrink-0',
        'bg-[#1a1510] border-r border-[#3e3226]',
        'transition-all duration-300 ease-in-out',
        /* Mobile slide in/out; desktop always visible */
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        /* Width: full on mobile, collapsed/expanded on desktop */
        'w-64',
        collapsed ? 'lg:w-12' : 'lg:w-64',
      ].join(' ')}
    >
      {/* ── Brand header ─────────────────────────────── */}
      <div className="relative flex items-center h-16 border-b border-[#3e3226] flex-shrink-0 overflow-hidden px-3">
        <div className="absolute inset-0 bg-gradient-to-r from-[#241d14] to-[#1a1510]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f0a820] to-transparent opacity-60" />

        {/* Shield icon — always visible */}
        <div className="relative w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border border-[#f0a820]/40 bg-[#f0a820]/10">
          <Shield className="w-4 h-4 text-[#f0a820]" />
        </div>

        {/* Title — hidden when desktop-collapsed */}
        <div className={`relative flex-1 min-w-0 ml-3 ${collapsed ? 'lg:hidden' : ''}`}>
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

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`relative hidden lg:flex p-1 text-[#7a6a55] hover:text-[#d4c4a8] rounded flex-shrink-0 transition-colors ${collapsed ? 'ml-auto' : 'ml-1'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="relative lg:hidden ml-1 p-1 text-[#7a6a55] hover:text-[#d4c4a8] rounded flex-shrink-0 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {!collapsed && (
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 select-none hidden lg:block"
            style={{ color: '#5a4930', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Guide Pages
          </p>
        )}

        <div className="space-y-0.5">
          {pages.map(page => {
            const Icon = iconMap[page.icon] ?? BookOpen
            const active = page.id === currentPage
            return (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                title={collapsed ? page.title : undefined}
                className={[
                  'w-full flex items-center rounded-lg text-sm text-left',
                  'transition-all duration-150 group',
                  /* Desktop collapsed: icon only, centred */
                  collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5 gap-2.5' : 'px-3 py-2.5 gap-2.5',
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
                {/* Label: always show on mobile, hide on desktop-collapsed */}
                <span
                  className={`flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}
                  style={{ color: active ? '#f0e6d0' : '#a89880' }}
                >
                  {page.title}
                </span>
                {active && !collapsed && (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 hidden lg:block" style={{ color: '#f0a820', opacity: 0.6 }} />
                )}
                {active && (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 lg:hidden" style={{ color: '#f0a820', opacity: 0.6 }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div className={`border-t border-[#3e3226] flex-shrink-0 ${collapsed ? 'px-2 py-3 space-y-1.5' : 'px-3 py-3 space-y-2'}`}>

        {/* Suggest Edit — prominent amber button */}
        <button
          onClick={onSuggest}
          title={collapsed ? 'Suggest Edit' : undefined}
          className={[
            'w-full flex items-center rounded-lg text-sm transition-all group',
            'border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 hover:border-amber-500/55',
            collapsed ? 'lg:justify-center lg:p-2 px-3 py-2.5 gap-2.5' : 'px-3 py-2.5 gap-2.5',
          ].join(' ')}
        >
          <MessageSquarePlus className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:text-amber-300 transition-colors" />
          <div className={`flex-1 text-left min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="text-xs font-semibold text-amber-300 group-hover:text-amber-200 transition-colors leading-tight">
              Nahlásit chybu
            </div>
            <div className="text-[10px] text-amber-700 group-hover:text-amber-600 transition-colors truncate">
              Něco nesedí? Dej nám vědět
            </div>
          </div>
          <ChevronRight className={`w-3 h-3 text-amber-600/40 group-hover:text-amber-400 flex-shrink-0 transition-colors ${collapsed ? 'lg:hidden' : ''}`} />
        </button>

        {/* Getting Started */}
        <button
          onClick={() => { onOpenOnboarding?.(); onClose?.() }}
          title={collapsed ? 'Getting Started' : undefined}
          className={[
            'w-full flex items-center rounded-lg text-sm transition-colors border border-transparent hover:bg-[#241d14] hover:border-[#3e3226] group',
            collapsed ? 'lg:justify-center lg:p-2 px-3 py-2 gap-2.5' : 'px-3 py-2 gap-2.5',
          ].join(' ')}
        >
          <Rocket className="w-4 h-4 flex-shrink-0 text-[#5a4930] group-hover:text-[#f0a820] transition-colors" />
          <span className={`text-[#7a6a55] group-hover:text-[#d4c4a8] transition-colors ${collapsed ? 'lg:hidden' : ''}`}>
            Getting Started
          </span>
        </button>

        {!collapsed && (
          <p className="text-[10px] leading-relaxed px-3 hidden lg:block" style={{ color: '#5a4930' }}>
            Free-to-play · Defensive play
          </p>
        )}
      </div>
    </aside>
  )
}
