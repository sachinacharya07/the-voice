import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { CheckCircle, XCircle, Eye, Users, FileText, TrendingUp, Shield } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './AdminPage.module.css'

const CAT_LABELS = { school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b' }

export default function AdminPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [published, setPublished] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, totalViews: 0, totalLikes: 0, writers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [pendSnap, pubSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db,'articles'),where('status','==','pending'),orderBy('submittedAt','desc'))),
      getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'))),
      getDocs(collection(db,'users'))
    ])
    const pend = pendSnap.docs.map(d=>({id:d.id,...d.data()}))
    const pub = pubSnap.docs.map(d=>({id:d.id,...d.data()}))
    const usrs = usersSnap.docs.map(d=>({id:d.id,...d.data()}))
    setPending(pend)
    setPublished(pub)
    setUsers(usrs)
    setStats({
      total: pub.length,
      totalViews: pub.reduce((s,a)=>s+(a.views||0),0),
      totalLikes: pub.reduce((s,a)=>s+(a.likes||0),0),
      writers: usrs.filter(u=>u.role==='writer'||u.role==='admin').length
    })
    setLoading(false)
  }

  const approve = async (id) => {
    await updateDoc(doc(db,'articles',id),{ status:'published', publishedAt: serverTimestamp() })
    loadAll()
  }

  const reject = async (id) => {
    if (!confirm('Reject and delete this submission?')) return
    await deleteDoc(doc(db,'articles',id))
    loadAll()
  }

  const unpublish = async (id) => {
    if (!confirm('Unpublish this article?')) return
    await updateDoc(doc(db,'articles',id),{ status:'unpublished' })
    loadAll()
  }

  const updateRole = async (uid, role) => {
    await updateDoc(doc(db,'users',uid),{ role })
    loadAll()
  }

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Shield size={20} />
            <div>
              <h1>Editorial Desk</h1>
              <p>Signed in as <strong>{profile?.email}</strong></p>
            </div>
          </div>
          {pending.length > 0 && <span className={styles.badge}>{pending.length} awaiting review</span>}
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><FileText size={18} /><div><strong>{stats.total}</strong><span>Published</span></div></div>
          <div className={styles.statCard}><Eye size={18} /><div><strong>{stats.totalViews}</strong><span>Total Views</span></div></div>
          <div className={styles.statCard}><TrendingUp size={18} /><div><strong>{stats.totalLikes}</strong><span>Total Likes</span></div></div>
          <div className={styles.statCard}><Users size={18} /><div><strong>{users.length}</strong><span>Members</span></div></div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab==='pending'?styles.active:''}`} onClick={()=>setTab('pending')}>
            Pending {pending.length > 0 && <span className={styles.tabBadge}>{pending.length}</span>}
          </button>
          <button className={`${styles.tab} ${tab==='published'?styles.active:''}`} onClick={()=>setTab('published')}>Published ({published.length})</button>
          <button className={`${styles.tab} ${tab==='users'?styles.active:''}`} onClick={()=>setTab('users')}>Members ({users.length})</button>
        </div>

        {loading ? <div className={styles.loading}>Loading...</div> : (
          <>
            {/* PENDING */}
            {tab === 'pending' && (
              <div className={styles.list}>
                {pending.length === 0 ? (
                  <div className={styles.empty}><CheckCircle size={32} /><p>All clear — nothing pending review.</p></div>
                ) : pending.map(a => (
                  <div key={a.id} className={styles.card}>
                    {a.coverImage && <img src={a.coverImage} alt="" className={styles.cardThumb} />}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                        <span className={styles.cardBy}>By {a.authorName}</span>
                        <span className={styles.cardDate}>{a.submittedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                      </div>
                      <h3 className={styles.cardHed}>{a.title}</h3>
                      {a.summary && <p className={styles.cardDek}>{a.summary}</p>}
                      <div className={styles.wordInfo}>{Math.max(1,Math.ceil(a.body.trim().split(/\s+/).length/200))} min read · {a.body.trim().split(/\s+/).length} words</div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.approveBtn} onClick={()=>approve(a.id)}><CheckCircle size={14} /> Approve</button>
                      <button className={styles.rejectBtn} onClick={()=>reject(a.id)}><XCircle size={14} /> Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PUBLISHED */}
            {tab === 'published' && (
              <div className={styles.list}>
                {published.length === 0 ? <div className={styles.empty}><p>No published articles yet.</p></div>
                : published.map(a => (
                  <div key={a.id} className={styles.card}>
                    {a.coverImage && <img src={a.coverImage} alt="" className={styles.cardThumb} />}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                        <span className={styles.cardBy}>By {a.authorName}</span>
                      </div>
                      <h3 className={styles.cardHed}>{a.title}</h3>
                      <div className={styles.pubStats}>
                        <span><Eye size={11} /> {a.views||0} views</span>
                        <span>❤ {a.likes||0} likes</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.rejectBtn} onClick={()=>unpublish(a.id)}>Unpublish</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className={styles.userList}>
                {users.map(u => (
                  <div key={u.id} className={styles.userRow}>
                    <div className={styles.userInfo}>
                      {u.photo ? <img src={u.photo} alt="" className={styles.userAvatar} /> : <span className={styles.userInit}>{(u.name||'U')[0]}</span>}
                      <div>
                        <strong>{u.name}</strong>
                        <span>{u.email}</span>
                      </div>
                    </div>
                    <select
                      className={styles.roleSelect}
                      value={u.role || 'reader'}
                      onChange={e => updateRole(u.id, e.target.value)}
                      disabled={u.email === profile?.email}
                    >
                      <option value="reader">Reader</option>
                      <option value="writer">Writer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
