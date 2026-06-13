const ILLUSTRATIONS = {
  search: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="27" cy="27" r="17"/>
      <path d="M40 40l13 13" strokeLinecap="round"/>
      <path d="M21 27h12M27 21v12" strokeLinecap="round"/>
    </svg>
  ),
  empty: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="12" y="8" width="40" height="48" rx="3"/>
      <line x1="20" y1="20" x2="44" y2="20" strokeLinecap="round"/>
      <line x1="20" y1="28" x2="44" y2="28" strokeLinecap="round"/>
      <line x1="20" y1="36" x2="36" y2="36" strokeLinecap="round"/>
    </svg>
  ),
  bookmark: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 8h32a4 4 0 014 4v44L32 46 12 56V12a4 4 0 014-4z"/>
      <path d="M24 28l6 6 10-10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  write: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M40 8L56 24L24 56H8V40L40 8z" strokeLinejoin="round"/>
      <line x1="32" y1="16" x2="48" y2="32"/>
    </svg>
  ),
  letter: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="16" width="48" height="36" rx="3"/>
      <path d="M8 20l24 18 24-18" strokeLinecap="round"/>
    </svg>
  ),
  notification: (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M32 8a20 20 0 0120 20v12l6 8H6l6-8V28A20 20 0 0132 8z"/>
      <path d="M26 52a6 6 0 0012 0" strokeLinecap="round"/>
    </svg>
  ),
}

export default function EmptyState({ type='empty', title, message, action, actionLabel }) {
  return (
    <div style={{textAlign:'center',padding:'4rem 2rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.85rem'}}>
      <div style={{color:'var(--border)',marginBottom:'0.25rem'}}>
        {ILLUSTRATIONS[type] || ILLUSTRATIONS.empty}
      </div>
      {title && (
        <h3 style={{fontFamily:'var(--serif)',fontSize:'18px',fontWeight:700,color:'var(--black)',letterSpacing:'-0.01em'}}>
          {title}
        </h3>
      )}
      {message && (
        <p style={{fontSize:'13.5px',color:'var(--mid)',lineHeight:1.65,maxWidth:'280px',margin:'0 auto'}}>
          {message}
        </p>
      )}
      {action && actionLabel && (
        <button onClick={action}
          style={{marginTop:'0.5rem',padding:'8px 22px',background:'var(--black)',color:'var(--white)',border:'none',fontSize:'12px',fontWeight:700,letterSpacing:'0.06em',cursor:'pointer',fontFamily:'var(--sans)',transition:'background 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--red)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--black)'}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
