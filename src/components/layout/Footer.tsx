export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="text-xs text-text-muted">© {year} Owen Jones</span>
        <span className="text-xs text-text-muted">Software Engineer</span>
      </div>
    </footer>
  )
}
