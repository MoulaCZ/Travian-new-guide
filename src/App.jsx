import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import MarkdownPage from './components/MarkdownPage'
import Onboarding, { useOnboarding } from './components/Onboarding'
import SuggestEdit from './components/SuggestEdit'
import { pages } from './data/pages'

export default function App() {
  const [currentPage, setCurrentPage] = useState('readme')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const contentRef = useRef(null)
  const onboarding = useOnboarding()

  const navigate = (id) => {
    setCurrentPage(id)
    setSidebarOpen(false)
    setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: 'instant' }), 0)
  }

  const idx = pages.findIndex(p => p.id === currentPage)
  const page = pages[idx] ?? pages[0]
  const prev = idx > 0 ? pages[idx - 1] : null
  const next = idx < pages.length - 1 ? pages[idx + 1] : null

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-100 overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        pages={pages}
        currentPage={currentPage}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenOnboarding={onboarding.open}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={page.title}
          onMenuToggle={() => setSidebarOpen(o => !o)}
        />

        <main ref={contentRef} className="flex-1 overflow-y-auto">
          <MarkdownPage
            key={page.id}
            content={page.content}
            pageId={page.id}
            onNavigate={navigate}
          />

          {/* Prev / Next navigation */}
          <div className="max-w-4xl mx-auto px-5 md:px-10 pb-12">
            <div className="border-t border-[#30363d] pt-8 flex items-stretch gap-4">
              {prev ? (
                <button
                  onClick={() => navigate(prev.id)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:border-amber-500/40 transition-all duration-200 text-left group"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Previous</div>
                    <div className="text-sm font-medium text-gray-300 group-hover:text-white truncate transition-colors">
                      {prev.title}
                    </div>
                  </div>
                </button>
              ) : <div className="flex-1" />}

              {next ? (
                <button
                  onClick={() => navigate(next.id)}
                  className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] hover:border-amber-500/40 transition-all duration-200 text-right justify-end group"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Next</div>
                    <div className="text-sm font-medium text-gray-300 group-hover:text-white truncate transition-colors">
                      {next.title}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                </button>
              ) : <div className="flex-1" />}
            </div>
          </div>
        </main>
      </div>

      {/* Onboarding wizard */}
      {onboarding.show && <Onboarding onClose={onboarding.close} />}

      {/* Floating suggest-edit button */}
      <SuggestEdit currentPage={page.title} />
    </div>
  )
}
