import { useState } from 'react'

export default function Tooltip({ term, definition }) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative inline-block">
      <span
        className="border-b border-dotted border-amber-400/70 text-amber-300 cursor-help"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {term}
      </span>
      {visible && (
        <span className="absolute bottom-full left-0 mb-2 z-50 w-56 p-3 rounded-lg bg-[#1c2128] border border-[#484f58] text-xs text-gray-300 leading-relaxed shadow-2xl pointer-events-none whitespace-normal">
          <span className="font-semibold text-amber-400 block mb-1">{term}</span>
          {definition}
          {/* Arrow */}
          <span className="absolute top-full left-4 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#484f58]" />
        </span>
      )}
    </span>
  )
}
