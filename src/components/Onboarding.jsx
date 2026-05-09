import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Shield, Wheat, Flag, Coins, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'travian-guide-onboarding-seen'

const slides = [
  {
    icon: BookOpen,
    color: 'text-amber-400',
    bg: 'bg-amber-950/30 border-amber-500/30',
    title: 'Welcome to the Alliance Guide',
    content: (
      <>
        <p className="text-gray-300 leading-7">
          This guide covers everything you need to know to play as a <strong className="text-white">defensive, free-to-play</strong> player in our alliance.
        </p>
        <p className="text-gray-300 leading-7 mt-3">
          Whether you're brand new to Travian or just new to our alliance — start here. Read through each section before you make major decisions in-game.
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-950/30 border-blue-500/30',
    title: 'The Group System',
    content: (
      <>
        <p className="text-gray-300 leading-7">
          We operate in <strong className="text-white">groups of 4 villages</strong>:
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#21262d] border border-[#30363d] p-3 text-center">
            <div className="text-2xl mb-1">🛡️</div>
            <div className="text-sm font-semibold text-white">1 × Anvil</div>
            <div className="text-xs text-gray-400 mt-1">Trains & houses troops</div>
          </div>
          <div className="rounded-lg bg-[#21262d] border border-[#30363d] p-3 text-center">
            <div className="text-2xl mb-1">🌾</div>
            <div className="text-sm font-semibold text-white">3 × Feeders</div>
            <div className="text-xs text-gray-400 mt-1">Produce & ship resources</div>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-4">
          Groups are placed close together on the map. Feeders keep the anvil stocked so it can train defence non-stop.
        </p>
      </>
    ),
  },
  {
    icon: Flag,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30 border-emerald-500/30',
    title: 'Your Progression',
    content: (
      <>
        <p className="text-gray-300 leading-7 mb-4">You'll move through these phases during the server:</p>
        <ol className="space-y-2">
          {[
            ['1', 'First Village', 'Build up resources, culture points, unlock settlers'],
            ['2', 'Anvil Village', 'Found your 2nd village on a 3-3-3-9 grain tile'],
            ['3', 'Feeder Villages', '3rd, 4th village — resource production for the group'],
            ['4', 'Chief a 15-crop', 'Late game: conquer a 15-crop tile for your capital'],
          ].map(([num, title, desc]) => (
            <li key={num} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {num}
              </span>
              <div>
                <span className="text-white font-medium text-sm">{title}</span>
                <span className="text-gray-400 text-xs block">{desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    icon: Coins,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/30 border-yellow-500/30',
    title: 'Playing Free-to-Play',
    content: (
      <>
        <p className="text-gray-300 leading-7">
          This guide assumes <strong className="text-white">no real-money purchases</strong>. You can still earn gold through:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          <li className="flex gap-2"><span className="text-amber-400">→</span> Refer-a-Friend links (share within alliance)</li>
          <li className="flex gap-2"><span className="text-amber-400">→</span> Bidding low on items with no bids in the auction</li>
          <li className="flex gap-2"><span className="text-amber-400">→</span> One-time starter gold offer</li>
        </ul>
        <p className="text-gray-400 text-sm mt-4">
          Prioritise: <strong className="text-gray-200">Gold Club</strong> (200G) → <strong className="text-gray-200">Travian Plus</strong>. Everything else is a nice-to-have.
        </p>
      </>
    ),
  },
  {
    icon: Wheat,
    color: 'text-orange-400',
    bg: 'bg-orange-950/30 border-orange-500/30',
    title: 'How to Use This Guide',
    content: (
      <>
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex gap-3 items-start">
            <span className="text-amber-400 font-bold flex-shrink-0">☰</span>
            <span>Use the <strong className="text-white">sidebar</strong> to jump between topics at any time</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>
            <span><strong className="text-white">Click any row</strong> in a build order to mark it done — progress is saved in your browser</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-amber-400 font-bold flex-shrink-0">~</span>
            <span><strong className="text-white">Hover over underlined terms</strong> like <em>anvil</em> or <em>chiefing</em> for quick definitions</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="text-blue-400 font-bold flex-shrink-0">✉</span>
            <span>Use the <strong className="text-white">Suggest Edit</strong> button (bottom-right) to report mistakes or request additions</span>
          </li>
        </ul>
      </>
    ),
  },
]

export default function Onboarding({ onClose }) {
  const [step, setStep] = useState(0)
  const slide = slides[step]
  const Icon = slide.icon

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`border-b border-[#30363d] px-6 py-5 flex items-center gap-4 ${slide.bg} border-l-4`}>
          <div className={`p-2 rounded-lg bg-[#0d1117]/40`}>
            <Icon className={`w-6 h-6 ${slide.color}`} />
          </div>
          <h2 className="text-base font-semibold text-white leading-tight">{slide.title}</h2>
          <button
            onClick={finish}
            className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[220px]">
          {slide.content}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-3">
          {/* Dots */}
          <div className="flex gap-1.5 flex-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? 'bg-amber-400 w-5' : 'bg-[#30363d] w-1.5 hover:bg-[#484f58]'
                }`}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-gray-200 text-sm transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {step < slides.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
              >
                Let's go! <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true)
    }
  }, [])

  return {
    show,
    open: () => setShow(true),
    close: () => setShow(false),
  }
}
