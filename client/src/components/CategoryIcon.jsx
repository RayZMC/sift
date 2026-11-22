const icons = {
  Top: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
  World: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  Technology: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5M8 21h8" /></>,
  Business: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3" /></>,
  Science: <><path d="M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10" /><path d="M10 18h.01M14 17h.01" /></>,
  Sports: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M6 5c7 4 7 10 0 14M18 5c-7 4-7 10 0 14" /></>,
  Entertainment: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 8V3h18v5M3 8h18M8 3 5 8M14 3l-3 5M20 3l-3 5m-7 5 5 3-5 3v-6Z" /></>,
  Saved: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
}

export default function CategoryIcon({ category }) {
  return (
    <svg className="category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icons[category]}
    </svg>
  )
}
