import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, PenLine, ShieldCheck, LogOut, TrendingUp, Menu, X, Bookmark, LayoutDashboard, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Header.module.css'

const CATS=[
  {key:'school',label:'School'},{key:'science',label:'Science & Tech'},
  {key:'sports',label:'Sports'},{key:'arts',label:'Arts & Culture'},
  {key:'world',label:'World'},{key:'opinion',label:'Opinion'},
]

export default function Header() {
  const { user, profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')

  const handleSearch=(e)=>{
    e.preventDefault()
    if(q.trim()){navigate(`/search?q=${encodeURIComponent(q.trim())}`);setSearchOpen(false);setQ('')}
  }

  const date=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
  const isWriter=profile?.role==='writer'||profile?.role==='editor'||isAdmin

  return(
    <header className={styles.header}>
      <div className={styles.topBar}>
        <span className={styles.date}>{date}</span>
        <div className={styles.topActions}>
          {user?(
            <>
              <button className={styles.iconBtn} onClick={()=>setSearchOpen(s=>!s)}><Search size={14}/></button>
              <Link to="/trending" className={styles.iconBtn}><TrendingUp size={14}/></Link>
              <Link to="/read-later" className={styles.iconBtn}><Bookmark size={14}/></Link>
              <Link to="/digest" className={styles.iconBtn} title="Weekly Digest">📰</Link>
              <Link to="/tip" className={styles.iconBtn} title="Send a tip"><Send size={14}/></Link>
              {isWriter&&<Link to="/dashboard" className={styles.iconBtn}><LayoutDashboard size={14}/></Link>}
              <Link to="/write" className={`${styles.iconBtn} ${styles.writeBtn}`}><PenLine size={13}/> Write</Link>
              {isAdmin&&<Link to="/admin" className={`${styles.iconBtn} ${styles.adminBtn}`}><ShieldCheck size={13}/> Admin</Link>}
              <Link to={`/profile/${user.uid}`} className={styles.avatar}>
                {profile?.photo?<img src={profile.photo} alt=""/>:<span>{(profile?.name||'U')[0].toUpperCase()}</span>}
              </Link>
              <button className={styles.iconBtn} onClick={logout}><LogOut size={14}/></button>
            </>
          ):(
            <>
              <Link to="/apply" className={styles.iconBtn}>Apply to Write</Link>
              <Link to="/auth" className={`${styles.iconBtn} ${styles.writeBtn}`}>Sign in</Link>
            </>
          )}
          <button className={`${styles.iconBtn} ${styles.burger}`} onClick={()=>setMenuOpen(s=>!s)}>
            {menuOpen?<X size={18}/>:<Menu size={18}/>}
          </button>
        </div>
      </div>

      {searchOpen&&(
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <Search size={16}/>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search articles, topics, authors..."/>
          <button type="submit">Search</button>
          <button type="button" onClick={()=>setSearchOpen(false)}><X size={16}/></button>
        </form>
      )}

      <div className={styles.masthead}>
        <Link to="/" className={styles.logo}>The Voice</Link>
        <p className={styles.tagline}>Independent Student Journalism</p>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={`${styles.navItem} ${location.pathname==='/'?styles.active:''}`}>Home</Link>
          {CATS.map(c=>(
            <Link key={c.key} to={`/category/${c.key}`}
              className={`${styles.navItem} ${location.pathname===`/category/${c.key}`?styles.active:''}`}>
              {c.label}
            </Link>
          ))}
          <Link to="/digest" className={`${styles.navItem} ${location.pathname==='/digest'?styles.active:''}`}>Digest</Link>
        </div>
      </nav>

      {menuOpen&&(
        <div className={styles.mobileMenu}>
          <Link to="/" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Home</Link>
          {CATS.map(c=><Link key={c.key} to={`/category/${c.key}`} onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>{c.label}</Link>)}
          <Link to="/trending" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Trending</Link>
          <Link to="/digest" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Weekly Digest</Link>
          <Link to="/tip" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Send a Tip</Link>
          <Link to="/apply" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Apply to Write</Link>
          {user&&<Link to="/read-later" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>Saved Articles</Link>}
          {user&&<Link to="/dashboard" onClick={()=>setMenuOpen(false)} className={styles.mobileItem}>My Dashboard</Link>}
          {isAdmin&&<Link to="/admin" onClick={()=>setMenuOpen(false)} className={`${styles.mobileItem} ${styles.mobileAdmin}`}>Editorial Desk</Link>}
        </div>
      )}
    </header>
  )
}
