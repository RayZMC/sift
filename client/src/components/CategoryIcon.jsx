const icons = {
  Top: '\u26A1',
  World: '\u{1F30E}',
  Technology: '\u{1F4BB}',
  Business: '\u{1F4CA}',
  Science: '\u{1F52C}',
  Sports: '\u{1F3C6}',
  Entertainment: '\u{1F3AD}',
  Saved: '\u{1F516}',
}

export default function CategoryIcon({ category }) {
  return (
    <span className="category-icon" aria-hidden="true">
      {icons[category]}
    </span>
  )
}
