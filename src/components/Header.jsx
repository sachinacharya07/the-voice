import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, PenLine, ShieldCheck, LogOut, User, TrendingUp, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Header.module.css'

const CATS = [
  { key: 'school', label: 'School' },
  { key: 'science', label: 'Science & Tech' },
  { key: 'sports', label: 'Sports' },
  { key: 'arts', label: 'Arts & Culture' },
  { key: 'world', label: 'World' },
  { key: 'opinion', label: 'Opinion' },
]

export default function Header() {
  const { user, profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setSearchOpen(false); setQ('') }
  }

  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <span className={styles.date}>{date}</span>
        <div className={styles.topActions}>
          {user ? (
            <>
              <button className={styles.iconBtn} onClick={() => setSearchOpen(s => !s)} title="Search"><Search size={15} /></button>
              <Link to="/trending" className={styles.iconBtn} title="Trending"><TrendingUp size={15} /></Link>
              <Link to="/write" className={styles.iconBtn + ' ' + styles.writeBtn}><PenLine size={13} /> Write</Link>
              {isAdmin && <Link to="/admin" className={styles.iconBtn + ' ' + styles.adminBtn}><ShieldCheck size={13} /> Admin</Link>}
              <Link to={`/profile/${user.uid}`} className={styles.avatar}>
                {profile?.photo ? <img src={profile.photo} alt="" /> : <span>{(profile?.name || 'U')[0].toUpperCase()}</span>}
              </Link>
              <button className={styles.iconBtn} onClick={logout} title="Sign out"><LogOut size={15} /></button>
            </>
          ) : (
            <Link to="/auth" className={styles.iconBtn + ' ' + styles.writeBtn}>Sign in</Link>
          )}
          <button className={styles.iconBtn + ' ' + styles.burger} onClick={() => setMenuOpen(s => !s)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <Search size={16} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles, topics, authors..." />
          <button type="submit">Search</button>
          <button type="button" onClick={() => setSearchOpen(false)}><X size={16} /></button>
        </form>
      )}

      <div className={styles.masthead}>
        <Link to="/" className={styles.logo}>The Voice</Link>
        <p className={styles.tagline}>Independent Student Journalism</p>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={`${styles.navItem} ${location.pathname === '/' ? styles.active : ''}`}>Home</Link>
          {CATS.map(c => (
            <Link key={c.key} to={`/category/${c.key}`}
              className={`${styles.navItem} ${location.pathname === `/category/${c.key}` ? styles.active : ''}`}>
              {c.label}
            </Link>
          ))}
        </div>
      </nav>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link to="/" onClick={() => setMenuOpen(false)} className={styles.mobileItem}>Home</Link>
          {CATS.map(c => (
            <Link key={c.key} to={`/category/${c.key}`} onClick={() => setMenuOpen(false)} className={styles.mobileItem}>{c.label}</Link>
          ))}
          <Link to="/trending" onClick={() => setMenuOpen(false)} className={styles.mobileItem}>Trending</Link>
          {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className={styles.mobileItem + ' ' + styles.mobileAdmin}>Editorial Desk</Link>}
        </div>
      )}
    </header>
  )
}
