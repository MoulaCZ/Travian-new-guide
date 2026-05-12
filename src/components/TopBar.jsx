import { Menu, Github, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

export default function TopBar({
  title,
  onMenuToggle,
  sidebarCollapsed,
  onToggleSidebarCollapse,
}) {
  return (
    <header className="relative h-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-b border-[#3e3226] bg-[#1a1510]/90 backdrop-blur-sm flex-shrink-0 z-10 overflow-hidden">
      {/* Subtle top gold line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#f0a820]/30 to-transparent" />

      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 text-[#5a4930] hover:text-[#d4c4a8] rounded-md hover:bg-[#241d14] transition-colors flex-shrink-0"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop: prominent guide sidebar toggle (moved from sidebar header so it stays visible when collapsed) */}
      <button
        type="button"
        onClick={onToggleSidebarCollapse}
        className="hidden lg:inline-flex items-center gap-2 flex-shrink-0 rounded-lg border-2 border-[#f0a820]/55 bg-[#f0a820]/12 px-3 py-2 text-left shadow-sm shadow-black/20 transition-colors hover:bg-[#f0a820]/22 hover:border-[#f0a820]/80"
        aria-label={sidebarCollapsed ? 'Show guide sidebar' : 'Hide guide sidebar'}
        title={sidebarCollapsed ? 'Show guide pages' : 'Hide guide pages'}
      >
        {sidebarCollapsed ? (
          <>
            <BookOpen className="h-5 w-5 flex-shrink-0 text-[#f0a820]" aria-hidden />
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#f0a820]" aria-hidden />
            <span
              className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#f0e6d0' }}
            >
              Guide
            </span>
          </>
        ) : (
          <>
            <ChevronLeft className="h-5 w-5 flex-shrink-0 text-[#f0a820]" aria-hidden />
            <span
              className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#f0e6d0' }}
            >
              Hide guide
            </span>
          </>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold truncate block tracking-wide"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4c4a8' }}
        >
          {title}
        </span>
      </div>

      <a
        href="https://github.com/MoulaCZ/Travian-new-guide"
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-[#5a4930] hover:text-[#d4c4a8] rounded-md hover:bg-[#241d14] transition-colors flex-shrink-0"
        aria-label="View on GitHub"
        title="View source on GitHub"
      >
        <Github className="w-4 h-4" />
      </a>
    </header>
  )
}
