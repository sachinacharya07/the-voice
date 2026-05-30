import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './WriterDashboard.module.css'
import { Eye, Heart, MessageSquare, Edit, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const STATUS_INFO = {
  pending:   { label:'Under Review', icon:<Loader size={13}/>,  color:'#b7791f', bg:'#fef9c3' },
  published: { label:'Published',    icon:<CheckCircle size={13}/>, color:'#065f46', bg:'#d1fae5' },
  unpublished:{ label:'Unpublished', icon:<AlertCircle size={13}/>, color:'#991b1b', bg:'#fee2e2' },
}

export default function WriterDashboard() {
  const { user, profile } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!user)return
    getDocs(query(
      collection(db,'articles'),
      where('authorId','==',user.uid),
      orderBy('submittedAt','desc')
    )).then(snap=>{
      setArticles(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
  },[user])

  const totalViews = articles.filter(a=>a.status==='published').reduce((s,a)=>s+(a.views||0),0)
  const totalLikes = articles.filter(a=>a.status==='published').reduce((s,a)=>s+(a.likes||0),0)
  const published  = articles.filter(a=>a.status==='published').length
  const pending    = articles.filter(a=>a.status==='pending').length

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
          <div className={styles.stat}><CheckCircle size={16}/><strong>{published}</strong><span>Published</span></div>
          <div className={styles.stat}><Loader size={16}/><strong>{pending}</strong><span>Under Review</span></div>
        </div>

        <div className={styles.sectionHead}><h2>My Articles</h2></div>

        {loading ? <div className={styles.loading}>Loading...</div>
        : articles.length === 0 ? (
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
                  {a.coverImage&&<img src={a.coverImage} alt="" className={styles.thumb}/>}
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
                    {a.correction&&<div className={styles.correctionNote}>📝 Editor correction: {a.correction}</div>}
                  </div>
                  <div className={styles.rowActions}>
                    {a.status==='published'&&<Link to={`/article/${a.id}`} className={styles.viewBtn}><Eye size={13}/> View</Link>}
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
