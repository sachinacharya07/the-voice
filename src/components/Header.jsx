import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, X, Menu, ShieldCheck, PenLine, Bookmark, LayoutDashboard, Send, TrendingUp, LogOut, FileText, Home, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Header.module.css'

const CATS = [
  { key: 'school',  label: 'School & College' },
  { key: 'science', label: 'Science & Tech' },
  { key: 'sports',  label: 'Sports' },
  { key: 'arts',    label: 'Arts & Culture' },
  { key: 'world',   label: 'World' },
  { key: 'opinion', label: 'Opinion' },
]

export default function Header() {
  const { user, profile, logout, isAdmin, isWriter } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [drawer, setDrawer]   = useState(false)
  const [search, setSearch]   = useState(false)
  const [q, setQ]             = useState('')
  const inputRef  = useRef()
  const drawerRef = useRef()

  useEffect(() => { setDrawer(false) }, [location.pathname])

  useEffect(() => {
    if (!drawer) return
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawer(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawer])

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  useEffect(() => {
    if (search && inputRef.current) inputRef.current.focus()
  }, [search])

  const handleSearch = (e) => {
    e.preventDefault()
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setSearch(false); setQ('') }
  }

  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const active = (path) => location.pathname === path ? styles.active : ''

  return (
    <>
      <header className={styles.header}>

        {/* ── DESKTOP HEADER ─────────────────────────────── */}
        <div className={styles.desktopHeader}>
          {/* Top utility bar */}
          <div className={styles.topBar}>
            <span className={styles.date}>{date}</span>
            <div className={styles.topActions}>
              <button className={styles.iconBtn} onClick={() => setSearch(s => !s)}>
                {search ? <X size={15}/> : <Search size={15}/>}
              </button>
              {user ? (
                <>
                  {isWriter && <Link to="/write" className={styles.writeBtn}><PenLine size={12}/> Write</Link>}
                  {isAdmin  && <Link to="/admin" className={styles.adminBtn}><ShieldCheck size={12}/> Admin</Link>}
                  <Link to={`/profile/${user.uid}`} className={styles.avatar}>
                    {profile?.photo
                      ? <img src={profile.photo} alt="" referrerPolicy="no-referrer"/>
                      : <span>{(profile?.name||'U')[0].toUpperCase()}</span>}
                  </Link>
                  <button className={styles.iconBtn} onClick={logout} title="Sign out"><LogOut size={15}/></button>
                </>
              ) : (
                <Link to="/auth" className={styles.writeBtn}>Sign in</Link>
              )}
            </div>
          </div>

          {/* Search bar */}
          {search && (
            <form className={styles.searchBar} onSubmit={handleSearch}>
              <Search size={15} className={styles.searchIcon}/>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search articles, topics, authors..." className={styles.searchInput}/>
              {q && <button type="button" onClick={() => setQ('')} className={styles.searchClear}><X size={13}/></button>}
              <button type="submit" className={styles.searchGo}>Go</button>
            </form>
          )}

          {/* Masthead — clean newspaper style, no tagline clutter */}
          <div className={styles.masthead}>
            <div className={styles.mastheadRule}/>
            <Link to="/" className={styles.logo}>The Voice</Link>
            <div className={styles.mastheadSub}>
              <span className={styles.mastheadLine}/>
              <span className={styles.mastheadTag}>Independent Student Journalism · Est. 2026</span>
              <span className={styles.mastheadLine}/>
            </div>
            <div className={styles.mastheadRule}/>
          </div>

          {/* Nav */}
          <nav className={styles.nav}>
            <Link to="/"            className={`${styles.navItem} ${active('/')}`}>Home</Link>
            {CATS.map(c => (
              <Link key={c.key} to={`/category/${c.key}`}
                className={`${styles.navItem} ${active(`/category/${c.key}`)}`}>{c.label}</Link>
            ))}
            <Link to="/trending"    className={`${styles.navItem} ${active('/trending')}`}>Trending</Link>
            <Link to="/digest"      className={`${styles.navItem} ${active('/digest')}`}>Digest</Link>
          </nav>
        </div>

        {/* ── MOBILE HEADER ──────────────────────────────── */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileTopBar}>
            <button className={styles.mobileIconBtn} onClick={() => setSearch(s => !s)}>
              {search ? <X size={18}/> : <Search size={18}/>}
            </button>
            <Link to="/" className={styles.mobileLogo}>The Voice</Link>
            <button className={styles.mobileIconBtn} onClick={() => setDrawer(true)}>
              <Menu size={20}/>
            </button>
          </div>
          {search && (
            <form className={styles.searchBar} onSubmit={handleSearch}>
              <Search size={15} className={styles.searchIcon}/>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search..." className={styles.searchInput}/>
              {q && <button type="button" onClick={() => setQ('')} className={styles.searchClear}><X size={13}/></button>}
              <button type="submit" className={styles.searchGo}>Go</button>
            </form>
          )}
        </div>

      </header>

      {/* ── SIDE DRAWER (mobile only) ───────────────────── */}
      {drawer && <div className={styles.overlay} onClick={() => setDrawer(false)}/>}
      <aside className={`${styles.drawer} ${drawer ? styles.drawerOpen : ''}`} ref={drawerRef}>
        <div className={styles.drawerHead}>
          <span className={styles.drawerLogo}>The Voice</span>
          <button className={styles.drawerClose} onClick={() => setDrawer(false)}><X size={18}/></button>
        </div>

        {user ? (
          <Link to={`/profile/${user.uid}`} className={styles.drawerUser} onClick={() => setDrawer(false)}>
            {profile?.photo
              ? <img src={profile.photo} alt="" className={styles.drawerAvatar} referrerPolicy="no-referrer"/>
              : <span className={styles.drawerAvatarInit}>{(profile?.name||'U')[0].toUpperCase()}</span>}
            <div><strong>{profile?.name}</strong><span>{profile?.role||'Reader'}</span></div>
            <ChevronRight size={14} style={{marginLeft:'auto',color:'var(--mid)'}}/>
          </Link>
        ) : (
          <Link to="/auth" className={styles.drawerGuestBanner} onClick={() => setDrawer(false)}>
            Sign in to write, save & like →
          </Link>
        )}

        <div className={styles.drawerSection}>
          <p className={styles.drawerLabel}>Navigate</p>
          <Link to="/"         className={styles.drawerItem} onClick={() => setDrawer(false)}><Home size={15}/>Home</Link>
          <Link to="/trending" className={styles.drawerItem} onClick={() => setDrawer(false)}><TrendingUp size={15}/>Trending</Link>
          <Link to="/digest"   className={styles.drawerItem} onClick={() => setDrawer(false)}><FileText size={15}/>Weekly Digest</Link>
        </div>

        <div className={styles.drawerSection}>
          <p className={styles.drawerLabel}>Sections</p>
          {CATS.map(c => (
            <Link key={c.key} to={`/category/${c.key}`} className={styles.drawerItem} onClick={() => setDrawer(false)}>
              {c.label}
            </Link>
          ))}
        </div>

        {user && (
          <div className={styles.drawerSection}>
            <p className={styles.drawerLabel}>My Account</p>
            {isWriter && <Link to="/write"     className={styles.drawerItem} onClick={() => setDrawer(false)}><PenLine size={15}/>Write Article</Link>}
            <Link to="/dashboard"  className={styles.drawerItem} onClick={() => setDrawer(false)}><LayoutDashboard size={15}/>My Dashboard</Link>
            <Link to="/read-later" className={styles.drawerItem} onClick={() => setDrawer(false)}><Bookmark size={15}/>Saved Articles</Link>
            <Link to="/tip"        className={styles.drawerItem} onClick={() => setDrawer(false)}><Send size={15}/>Send a Tip</Link>
            {isAdmin && <Link to="/admin" className={`${styles.drawerItem} ${styles.drawerAdmin}`} onClick={() => setDrawer(false)}><ShieldCheck size={15}/>Editorial Desk</Link>}
          </div>
        )}

        {!user && (
          <div className={styles.drawerSection}>
            <p className={styles.drawerLabel}>Join</p>
            <Link to="/apply" className={styles.drawerItem} onClick={() => setDrawer(false)}><PenLine size={15}/>Apply to Write</Link>
            <Link to="/tip"   className={styles.drawerItem} onClick={() => setDrawer(false)}><Send size={15}/>Send a Tip</Link>
          </div>
        )}

        <div className={styles.drawerBottom}>
          {user
            ? <button className={styles.drawerLogout} onClick={() => { logout(); setDrawer(false) }}><LogOut size={14}/>Sign out</button>
            : <Link to="/auth" className={styles.drawerSignIn} onClick={() => setDrawer(false)}>Sign in</Link>}
        </div>
      </aside>
    </>
  )
}
