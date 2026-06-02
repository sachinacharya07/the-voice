import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './WriterDashboard.module.css'
import { Eye, Heart, Edit, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const STATUS_INFO = {
  pending:     { label:'Under Review', icon:<Loader size={13}/>,       color:'#b7791f', bg:'#fef9c3' },
  published:   { label:'Published',    icon:<CheckCircle size={13}/>,  color:'#065f46', bg:'#d1fae5' },
  unpublished: { label:'Unpublished',  icon:<AlertCircle size={13}/>,  color:'#991b1b', bg:'#fee2e2' },
}

export default function WriterDashboard() {
  const { user, profile } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(()=>{
    if(!user){ setLoading(false); return }
    getDocs(query(
      collection(db,'articles'),
      where('authorId','==',user.uid),
      orderBy('submittedAt','desc'),
      limit(50)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>setError('Failed to load your articles.'))
    .finally(()=>setLoading(false))
  },[user])

  const pub     = articles.filter(a=>a.status==='published')
  const pending = articles.filter(a=>a.status==='pending')
  const totalViews = pub.reduce((s,a)=>s+(a.views||0),0)
  const totalLikes = pub.reduce((s,a)=>s+(a.likes||0),0)

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h1>My Dashboard</h1>
            <p>Welcome back, <strong>{profile?.name}</strong></p>
          </div>
          <Link to="/write" className={styles.writeBtn}>+ New Article</Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.stat}><Eye size={16}/><strong>{totalViews}</strong><span>Total Views</span></div>
          <div className={styles.stat}><Heart size={16}/><strong>{totalLikes}</strong><span>Total Likes</span></div>
          <div className={styles.stat}><CheckCircle size={16}/><strong>{pub.length}</strong><span>Published</span></div>
          <div className={styles.stat}><Loader size={16}/><strong>{pending.length}</strong><span>Under Review</span></div>
        </div>

        <div className={styles.sectionHead}><h2>My Articles</h2></div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.skeletons}>
            {[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton}/>)}
          </div>
        ) : articles.length===0 ? (
          <div className={styles.empty}>
            <p>You haven't submitted any articles yet.</p>
            <Link to="/write" className={styles.writeBtn}>Write your first article</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {articles.map(a=>{
              const s = STATUS_INFO[a.status] || STATUS_INFO.pending
              return(
                <div key={a.id} className={styles.row}>
                  {a.coverImage&&<img src={a.coverImage} alt="" className={styles.thumb} loading="lazy"/>}
                  <div className={styles.rowBody}>
                    <span className={styles.statusBadge} style={{color:s.color,background:s.bg}}>
                      {s.icon}{s.label}
                    </span>
                    <h3 className={styles.hed}>{a.title}</h3>
                    <div className={styles.rowMeta}>
                      <span><Eye size={11}/>{a.views||0}</span>
                      <span><Heart size={11}/>{a.likes||0}</span>
                      <span><Clock size={11}/>{Math.max(1,Math.ceil((a.body||'').trim().split(/\s+/).length/200))} min</span>
                      <span>{a.submittedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                    </div>
                    {a.correction&&<div className={styles.correctionNote}>📝 Editor note: {a.correction}</div>}
                  </div>
                  <div className={styles.rowActions}>
                    {a.status==='published'&&(
                      <Link to={`/article/${a.id}`} className={styles.viewBtn}><Eye size={13}/> View</Link>
                    )}
                    <Link to={`/edit/${a.id}`} className={styles.editBtn}><Edit size={13}/> Edit</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
