import { Menu, Github } from 'lucide-react'

export default function TopBar({ title, onMenuToggle }) {
  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-[#30363d] bg-[#0d1117]/80 backdrop-blur-sm flex-shrink-0 z-10">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 text-gray-500 hover:text-gray-300 rounded-md hover:bg-[#21262d] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-300 truncate block">{title}</span>
      </div>

      <a
        href="https://github.com/MoulaCZ/Travian-new-guide"
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-gray-600 hover:text-gray-300 rounded-md hover:bg-[#21262d] transition-colors flex-shrink-0"
        aria-label="View on GitHub"
        title="View source on GitHub"
      >
        <Github className="w-4 h-4" />
      </a>
    </header>
  )
}
