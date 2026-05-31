import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, X, Menu, ShieldCheck, PenLine, Bookmark, LayoutDashboard, Send, TrendingUp, LogOut, User, FileText, Home, ChevronRight } from 'lucide-react'
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
  const navigate  = useNavigate()
  const location  = useLocation()
  const [drawer, setDrawer]   = useState(false)
  const [search, setSearch]   = useState(false)
  const [q, setQ]             = useState('')
  const inputRef = useRef()
  const drawerRef = useRef()

  // Close drawer on route change
  useEffect(() => { setDrawer(false) }, [location.pathname])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawer) return
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawer(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [drawer])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  // Focus search input when opened
  useEffect(() => {
    if (search && inputRef.current) inputRef.current.focus()
  }, [search])

  const handleSearch = (e) => {
    e.preventDefault()
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`)
      setSearch(false)
      setQ('')
    }
  }

  const date = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const navActive = (path) => location.pathname === path ? styles.active : ''

  return (
    <>
      <header className={styles.header}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <span className={styles.date}>{date}</span>
          <div className={styles.topRight}>
            <button className={styles.searchBtn} onClick={() => setSearch(s => !s)} aria-label="Search">
              {search ? <X size={17} /> : <Search size={17} />}
            </button>
            <button className={styles.burgerBtn} onClick={() => setDrawer(true)} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {search && (
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <Search size={15} className={styles.searchIcon} />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search articles, topics, authors..."
              className={styles.searchInput}
            />
            {q && (
              <button type="button" className={styles.searchClear} onClick={() => setQ('')}>
                <X size={14} />
              </button>
            )}
            <button type="submit" className={styles.searchGo}>Go</button>
          </form>
        )}

        {/* Masthead */}
        <div className={styles.masthead}>
          <div className={styles.mastheadTop}>TRUTH · ESTD. 2026 · COURAGE · IMPACT</div>
          <div className={styles.logoWrap}>
            <span className={styles.logoThe}>the</span>
            <Link to="/" className={styles.logo}>Voice</Link>
          </div>
          <p className={styles.tagline}>Independent Student Journalism</p>
        </div>

        {/* Desktop nav */}
        <nav className={styles.desktopNav}>
          <Link to="/" className={`${styles.navItem} ${navActive('/')}`}>Home</Link>
          {CATS.map(c => (
            <Link key={c.key} to={`/category/${c.key}`}
              className={`${styles.navItem} ${navActive(`/category/${c.key}`)}`}>
              {c.label}
            </Link>
          ))}
          <Link to="/trending" className={`${styles.navItem} ${navActive('/trending')}`}>Trending</Link>
          <Link to="/digest"   className={`${styles.navItem} ${navActive('/digest')}`}>Digest</Link>
          {/* Desktop only quick actions */}
          <div className={styles.desktopActions}>
            {user && isWriter && (
              <Link to="/write" className={styles.writeBtn}><PenLine size={13}/> Write</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={styles.adminBtn}><ShieldCheck size={13}/> Admin</Link>
            )}
          </div>
        </nav>
      </header>

      {/* Drawer overlay */}
      {drawer && <div className={styles.overlay} onClick={() => setDrawer(false)} />}

      {/* Side drawer */}
      <aside className={`${styles.drawer} ${drawer ? styles.drawerOpen : ''}`} ref={drawerRef}>
        {/* Drawer header */}
        <div className={styles.drawerHead}>
          <div className={styles.drawerLogo}>
            <span className={styles.drawerLogoThe}>the</span>
            <span className={styles.drawerLogoMain}>Voice</span>
          </div>
          <button className={styles.drawerClose} onClick={() => setDrawer(false)}>
            <X size={20} />
          </button>
        </div>

        {/* User profile strip */}
        {user ? (
          <div className={styles.drawerUser}>
            <Link to={`/profile/${user.uid}`} className={styles.drawerUserInfo} onClick={() => setDrawer(false)}>
              {profile?.photo
                ? <img src={profile.photo} alt="" className={styles.drawerAvatar} referrerPolicy="no-referrer" />
                : <span className={styles.drawerAvatarInit}>{(profile?.name || 'U')[0].toUpperCase()}</span>}
              <div>
                <strong>{profile?.name || 'My Profile'}</strong>
                <span>{profile?.role || 'Reader'}</span>
              </div>
              <ChevronRight size={14} className={styles.drawerChevron} />
            </Link>
          </div>
        ) : (
          <div className={styles.drawerUserGuest}>
            <Link to="/auth" className={styles.drawerSignIn} onClick={() => setDrawer(false)}>
              Sign in to write, like & save
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionLabel}>Navigate</div>
          <Link to="/" className={styles.drawerItem} onClick={() => setDrawer(false)}>
            <Home size={16} /> Home
          </Link>
          <Link to="/trending" className={styles.drawerItem} onClick={() => setDrawer(false)}>
            <TrendingUp size={16} /> Trending
          </Link>
          <Link to="/digest" className={styles.drawerItem} onClick={() => setDrawer(false)}>
            <FileText size={16} /> Weekly Digest
          </Link>
        </div>

        {/* Categories */}
        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionLabel}>Sections</div>
          {CATS.map(c => (
            <Link key={c.key} to={`/category/${c.key}`} className={styles.drawerItem} onClick={() => setDrawer(false)}>
              {c.label}
            </Link>
          ))}
        </div>

        {/* User actions */}
        {user && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionLabel}>My Account</div>
            {isWriter && (
              <Link to="/write" className={styles.drawerItem} onClick={() => setDrawer(false)}>
                <PenLine size={16} /> Write an Article
              </Link>
            )}
            <Link to="/dashboard" className={styles.drawerItem} onClick={() => setDrawer(false)}>
              <LayoutDashboard size={16} /> My Dashboard
            </Link>
            <Link to="/read-later" className={styles.drawerItem} onClick={() => setDrawer(false)}>
              <Bookmark size={16} /> Saved Articles
            </Link>
            <Link to="/tip" className={styles.drawerItem} onClick={() => setDrawer(false)}>
              <Send size={16} /> Send a Tip
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`${styles.drawerItem} ${styles.drawerAdmin}`} onClick={() => setDrawer(false)}>
                <ShieldCheck size={16} /> Editorial Desk
              </Link>
            )}
          </div>
        )}

        {!user && (
          <div className={styles.drawerSection}>
            <div className={styles.drawerSectionLabel}>Join Us</div>
            <Link to="/apply" className={styles.drawerItem} onClick={() => setDrawer(false)}>
              <PenLine size={16} /> Apply to Write
            </Link>
            <Link to="/tip" className={styles.drawerItem} onClick={() => setDrawer(false)}>
              <Send size={16} /> Send a Tip
            </Link>
          </div>
        )}

        {/* Bottom actions */}
        <div className={styles.drawerBottom}>
          {user ? (
            <button className={styles.drawerLogout} onClick={() => { logout(); setDrawer(false) }}>
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <Link to="/auth" className={styles.drawerSignInBtn} onClick={() => setDrawer(false)}>
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
