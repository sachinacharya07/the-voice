import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, limit, serverTimestamp } from 'firebase/firestore'
import { db, CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import NotificationSettings from '../components/NotificationSettings'
import { useAuth } from '../context/AuthContext'
import styles from './ProfilePage.module.css'

const ROLE_LABELS = { admin:'Editor-in-Chief', editor:'Editor', writer:'Writer', reader:'Reader' }
const ROLE_COLORS = { admin:'#c0392b', editor:'#185FA5', writer:'#0F6E56', reader:'#888' }

function fmtNum(n) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n||0) }
function fmtDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
function readTime(body='') { return Math.max(1, Math.ceil((body||'').trim().split(/\s+/).length / 200)) }

export default function ProfilePage() {
  const { uid } = useParams()
  const { user, profile: myProfile } = useAuth()
  const isSelf = user?.uid === uid

  const [profile,   setProfile]   = useState(null)
  const [articles,  setArticles]  = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [tab,       setTab]       = useState('articles') // articles | popular | bookmarks | settings
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [editForm,  setEditForm]  = useState({})
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarRef = useRef()

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(query(
        collection(db, 'articles'),
        where('authorId', '==', uid),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(50)
      )),
    ]).then(([userSnap, artSnap]) => {
      if (userSnap.exists()) {
        const p = { ...userSnap.data(), uid }
        setProfile(p)
        setEditForm({
          name: p.name || '',
          bio: p.bio || '',
          website: p.website || '',
          twitter: p.twitter || '',
          instagram: p.instagram || '',
        })
      }
      setArticles(artSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => setError('Failed to load profile.'))
    .finally(() => setLoading(false))
  }, [uid])

  // Load bookmarks only for own profile
  useEffect(() => {
    if (!isSelf || !user) return
    getDocs(query(
      collection(db, 'articles'),
      where('bookmarkedBy', 'array-contains', user.uid),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(20)
    )).then(snap => setBookmarks(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    .catch(() => {})
  }, [isSelf, user])

  const saveProfile = async () => {
    if (!isSelf || !user) return
    setSaving(true)
    try {
      // Only safe profile fields — never send role, uid, email
      const data = {
        name: editForm.name.trim().replace(/<[^>]*>/g,'').slice(0, 80),
        bio: editForm.bio.trim().replace(/<[^>]*>/g,'').slice(0, 300),
        website: editForm.website.trim().replace(/<[^>]*>/g,'').slice(0, 200),
        twitter: editForm.twitter.trim().replace(/^@/,'').replace(/[^a-zA-Z0-9_]/g,'').slice(0, 50),
        instagram: editForm.instagram.trim().replace(/^@/,'').replace(/[^a-zA-Z0-9_.]/g,'').slice(0, 50),
        updatedAt: serverTimestamp(),
      }
      await updateDoc(doc(db, 'users', user.uid), data)
      setProfile(p => ({ ...p, ...data }))
      setEditing(false)
    } catch { alert('Save failed.') }
    setSaving(false)
  }

  const uploadAvatar = async (file) => {
    if (!file || !isSelf) return
    setAvatarUploading(true)
    try {
      const toBase64 = f => new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f)
      })
      const b64 = await toBase64(file)
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: b64, upload_preset: CLOUDINARY_PRESET,
          transformation: 'w_200,h_200,c_fill,g_face,r_max' })
      })
      const data = await resp.json()
      if (!data.secure_url) throw new Error('Upload failed')
      await updateDoc(doc(db, 'users', user.uid), { photo: data.secure_url })
      setProfile(p => ({ ...p, photo: data.secure_url }))
    } catch { alert('Avatar upload failed.') }
    setAvatarUploading(false)
  }

  // ── derived stats ─────────────────────────────────────
  const totalViews    = articles.reduce((s, a) => s + (a.views || 0), 0)
  const totalLikes    = articles.reduce((s, a) => s + (a.likes || 0), 0)
  const totalReadMins = articles.reduce((s, a) => s + readTime(a.body), 0)
  const popularArts   = [...articles].sort((a, b) => (b.views||0) - (a.views||0))

  // ── loading / error ───────────────────────────────────
  if (loading) return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.heroSkeleton}/>
        <div className={styles.grid}>{[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
      </div>
    </PageWrapper>
  )
  if (error || !profile) return (
    <PageWrapper>
      <div className={styles.wrap}><div className={styles.empty}>{error||'User not found.'}</div></div>
    </PageWrapper>
  )

  const roleLabel = ROLE_LABELS[profile.role] || 'Reader'
  const roleColor = ROLE_COLORS[profile.role] || '#888'

  return (
    <PageWrapper>
      {/* ── HERO ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          {/* Avatar */}
          <div className={styles.avatarWrap}>
            {profile.photo
              ? <img src={profile.photo} alt={profile.name} className={styles.avatar} referrerPolicy="no-referrer"/>
              : <span className={styles.avatarInit}>{(profile.name||'U')[0].toUpperCase()}</span>
            }
            {isSelf && (
              <button className={styles.avatarEdit}
                onClick={() => avatarRef.current?.click()}
                disabled={avatarUploading}
                title="Change photo">
                {avatarUploading ? '…' : '✎'}
              </button>
            )}
            <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={e => uploadAvatar(e.target.files[0])}/>
          </div>

          {/* Info */}
          <div className={styles.heroInfo}>
            {editing ? (
              <input className={styles.editName} value={editForm.name}
                onChange={e => setEditForm(f=>({...f,name:e.target.value}))}
                placeholder="Your name" maxLength={80}/>
            ) : (
              <h1 className={styles.name}>{profile.name}</h1>
            )}
            <div className={styles.roleBadge} style={{color:roleColor, borderColor:roleColor}}>
              {roleLabel}
            </div>
            {editing ? (
              <textarea className={styles.editBio} value={editForm.bio}
                onChange={e => setEditForm(f=>({...f,bio:e.target.value}))}
                placeholder="Write a short bio…" maxLength={300} rows={3}/>
            ) : (
              profile.bio && <p className={styles.bio}>{profile.bio}</p>
            )}

            {/* Social links */}
            {editing ? (
              <div className={styles.editSocials}>
                <input className={styles.editSocial} value={editForm.twitter}
                  onChange={e=>setEditForm(f=>({...f,twitter:e.target.value}))}
                  placeholder="Twitter/X username (no @)" maxLength={50}/>
                <input className={styles.editSocial} value={editForm.instagram}
                  onChange={e=>setEditForm(f=>({...f,instagram:e.target.value}))}
                  placeholder="Instagram username (no @)" maxLength={50}/>
                <input className={styles.editSocial} value={editForm.website}
                  onChange={e=>setEditForm(f=>({...f,website:e.target.value}))}
                  placeholder="Website URL" maxLength={200}/>
              </div>
            ) : (
              <div className={styles.socials}>
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    @{profile.twitter}
                  </a>
                )}
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    @{profile.instagram}
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.createdAt && (
                  <span className={styles.joinDate}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Joined {fmtDate(profile.createdAt)}
                  </span>
                )}
              </div>
            )}

            {/* Edit controls */}
            {isSelf && (
              editing ? (
                <div className={styles.editActions}>
                  <button className={styles.saveBtn} onClick={saveProfile} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                  <button className={styles.cancelBtn} onClick={()=>setEditing(false)}>Cancel</button>
                </div>
              ) : (
                <button className={styles.editBtn} onClick={()=>setEditing(true)}>Edit Profile</button>
              )
            )}
          </div>

          {/* Stats */}
          <div className={styles.statsCol}>
            {[
              { num: articles.length, label: 'Articles' },
              { num: fmtNum(totalViews), label: 'Total Views' },
              { num: fmtNum(totalLikes), label: 'Total Likes' },
              { num: `${totalReadMins}m`, label: 'Content' },
            ].map(s => (
              <div key={s.label} className={styles.stat}>
                <strong>{s.num}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className={styles.tabsWrap}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab==='articles'?styles.tabActive:''}`}
            onClick={()=>setTab('articles')}>
            Latest {articles.length > 0 && <span className={styles.tabCount}>{articles.length}</span>}
          </button>
          <button className={`${styles.tab} ${tab==='popular'?styles.tabActive:''}`}
            onClick={()=>setTab('popular')}>
            Most Read
          </button>
          {isSelf && (
            <button className={`${styles.tab} ${tab==='bookmarks'?styles.tabActive:''}`}
              onClick={()=>setTab('bookmarks')}>
              Saved {bookmarks.length > 0 && <span className={styles.tabCount}>{bookmarks.length}</span>}
            </button>
          )}
          {isSelf && (
            <button className={`${styles.tab} ${tab==='settings'?styles.tabActive:''}`}
              onClick={()=>setTab('settings')}>
              Settings
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className={styles.wrap}>

        {/* Articles tab */}
        {tab === 'articles' && (
          articles.length === 0
            ? <div className={styles.empty}>No published articles yet.</div>
            : <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        )}

        {/* Popular tab */}
        {tab === 'popular' && (
          popularArts.length === 0
            ? <div className={styles.empty}>No articles yet.</div>
            : <div className={styles.grid}>{popularArts.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        )}

        {/* Bookmarks tab — own profile only */}
        {tab === 'bookmarks' && isSelf && (
          bookmarks.length === 0
            ? <div className={styles.empty}>No saved articles yet. Tap the bookmark icon on any article.</div>
            : <div className={styles.grid}>{bookmarks.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        )}

        {/* Settings tab — own profile only */}
        {tab === 'settings' && isSelf && (
          <div className={styles.settingsWrap}>
            <div className={styles.settingsSection}>
              <h3>Notification Settings</h3>
              <NotificationSettings/>
            </div>
            {(profile.role === 'reader') && (
              <div className={styles.settingsSection}>
                <h3>Want to write for The Voice?</h3>
                <p>Apply to join our writing team. Your articles will be reviewed by our editors before publishing.</p>
                <Link to="/apply" className={styles.applyBtn}>Apply to Write →</Link>
              </div>
            )}
            {(profile.role === 'writer' || profile.role === 'editor') && (
              <div className={styles.settingsSection}>
                <h3>Writer Dashboard</h3>
                <p>Manage your submitted articles, check their status, and track performance.</p>
                <Link to="/dashboard" className={styles.applyBtn}>Go to Dashboard →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
