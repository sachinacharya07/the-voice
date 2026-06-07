import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './WriterDashboard.module.css'
import { Eye, Heart, Edit, Clock, CheckCircle, AlertCircle, Trash2, BookOpen, Tag, TrendingUp, Bookmark } from 'lucide-react'

const CAT_LABELS = { school:'School & College', science:'Science & Tech', sports:'Sports', arts:'Arts & Culture', world:'World', opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5', science:'#0F6E56', sports:'#854F0B', arts:'#993556', world:'#444441', opinion:'#c0392b' }

const STATUS_INFO = {
  pending:     { label:'Under Review', color:'#b7791f', bg:'#fef9c3' },
  published:   { label:'Published',    color:'#065f46', bg:'#d1fae5' },
  unpublished: { label:'Unpublished',  color:'#991b1b', bg:'#fee2e2' },
  rejected:    { label:'Rejected',     color:'#991b1b', bg:'#fee2e2' },
  draft:       { label:'Draft',        color:'#555',    bg:'#f3f4f6' },
}

function readTime(body=''){return Math.max(1,Math.ceil((body||'').trim().split(/\s+/).length/200))}
function wordCount(body=''){return (body||'').trim().split(/\s+/).filter(Boolean).length}
function fmtDate(ts){
  if(!ts)return''
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
}
function fmtNum(n){return n>=1000?`${(n/1000).toFixed(1)}k`:String(n)}

// Simple bar sparkline using inline SVG
function ViewBar({val, max}){
  const pct = max ? Math.max(4, Math.round((val/max)*100)) : 4
  return(
    <div className={styles.bar} title={`${val} views`}>
      <div className={styles.barFill} style={{width:`${pct}%`}}/>
    </div>
  )
}

export default function WriterDashboard(){
  const {user, profile} = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [tab, setTab]           = useState('all')  // all | published | pending | drafts
  const [deleting, setDeleting] = useState(null)

  useEffect(()=>{
    if(!user){setLoading(false);return}
    getDocs(query(
      collection(db,'articles'),
      where('authorId','==',user.uid),
      orderBy('submittedAt','desc'),
      limit(100)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>setError('Failed to load your articles.'))
    .finally(()=>setLoading(false))
  },[user])

  const pub      = articles.filter(a=>a.status==='published')
  const pending  = articles.filter(a=>a.status==='pending')
  const drafts   = articles.filter(a=>a.status==='draft')
  const rejected = articles.filter(a=>a.status==='rejected'||a.status==='unpublished')

  const totalViews  = pub.reduce((s,a)=>s+(a.views||0),0)
  const totalLikes  = pub.reduce((s,a)=>s+(a.likes||0),0)
  const totalWords  = articles.reduce((s,a)=>s+wordCount(a.body),0)
  const maxViews    = Math.max(...pub.map(a=>a.views||0), 1)

  const tabItems = {
    all:       articles,
    published: pub,
    pending,
    drafts,
    rejected,
  }
  const shown = tabItems[tab] || articles

  const handleDelete = async(id, status)=>{
    if(status==='published'){
      alert("Published articles can't be deleted. Contact an editor.")
      return
    }
    if(!confirm('Delete this article permanently?')) return
    setDeleting(id)
    try{
      await deleteDoc(doc(db,'articles',id))
      setArticles(arts=>arts.filter(a=>a.id!==id))
    } catch {
      alert('Delete failed.')
    }
    setDeleting(null)
  }

  const TABS = [
    {key:'all',       label:'All',        count:articles.length},
    {key:'published', label:'Published',  count:pub.length},
    {key:'pending',   label:'In Review',  count:pending.length},
    {key:'drafts',    label:'Drafts',     count:drafts.length},
    {key:'rejected',  label:'Rejected',   count:rejected.length},
  ]

  return(
    <PageWrapper>
      <div className={styles.wrap}>

        {/* ── HEADER ── */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerBadge}>Writer Dashboard</div>
            <h1>{profile?.name||'My Dashboard'}</h1>
            <p>{profile?.bio||'Manage your articles and track performance.'}</p>
          </div>
          <Link to="/write" className={styles.writeBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Article
          </Link>
        </div>

        {/* ── STATS ── */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statIcon}><Eye size={18}/></div>
            <strong className={styles.statNum}>{fmtNum(totalViews)}</strong>
            <span className={styles.statLabel}>Total Views</span>
          </div>
          <div className={styles.stat}>
            <div className={styles.statIcon}><Heart size={18}/></div>
            <strong className={styles.statNum}>{fmtNum(totalLikes)}</strong>
            <span className={styles.statLabel}>Likes</span>
          </div>
          <div className={styles.stat}>
            <div className={styles.statIcon}><CheckCircle size={18}/></div>
            <strong className={styles.statNum}>{pub.length}</strong>
            <span className={styles.statLabel}>Published</span>
          </div>
          <div className={styles.stat}>
            <div className={styles.statIcon}><BookOpen size={18}/></div>
            <strong className={styles.statNum}>{fmtNum(totalWords)}</strong>
            <span className={styles.statLabel}>Words Written</span>
          </div>
        </div>

        {/* ── TOP ARTICLE ── */}
        {pub.length>0&&(()=>{
          const top=pub.reduce((best,a)=>(a.views||0)>(best.views||0)?a:best, pub[0])
          return(
            <div className={styles.topStory}>
              <div className={styles.topLabel}><TrendingUp size={11}/>Your Top Story</div>
              <Link to={`/article/${top.id}`} className={styles.topTitle}>{top.title}</Link>
              <div className={styles.topStats}>
                <span><Eye size={11}/>{fmtNum(top.views||0)} views</span>
                <span><Heart size={11}/>{top.likes||0} likes</span>
                <span><Clock size={11}/>{readTime(top.body)} min read</span>
                <span>{fmtDate(top.publishedAt)}</span>
              </div>
            </div>
          )
        })()}

        {/* ── TABS ── */}
        <div className={styles.tabs}>
          {TABS.map(t=>(
            <button key={t.key}
              className={`${styles.tabBtn} ${tab===t.key?styles.tabActive:''}`}
              onClick={()=>setTab(t.key)}>
              {t.label}
              {t.count>0&&<span className={styles.tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>

        {error&&<div className={styles.error}>{error}</div>}

        {/* ── LIST ── */}
        {loading?(
          <div className={styles.skeletons}>
            {[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton}/>)}
          </div>
        ):shown.length===0?(
          <div className={styles.empty}>
            <p>{tab==='all'?"You haven't submitted any articles yet.":`No ${tab} articles.`}</p>
            {tab==='all'&&<Link to="/write" className={styles.writeBtn}>Write your first article</Link>}
          </div>
        ):(
          <div className={styles.list}>
            {/* views chart header for published tab */}
            {tab==='published'&&pub.length>1&&(
              <div className={styles.chartHint}>Article performance — views</div>
            )}
            {shown.map(a=>{
              const s = STATUS_INFO[a.status]||STATUS_INFO.pending
              const sections = [
                a.isOriginal&&'Originals',
                a.isExplained&&'Explained',
                a.isBplus&&'B+',
              ].filter(Boolean)
              return(
                <div key={a.id} className={styles.row}>
                  {a.coverImage&&(
                    <div className={styles.thumbWrap}>
                      <img src={a.coverImage} alt="" className={styles.thumb} loading="lazy"/>
                    </div>
                  )}
                  <div className={styles.rowBody}>
                    <div className={styles.rowTop}>
                      <span className={styles.statusBadge} style={{color:s.color,background:s.bg}}>
                        {s.label}
                      </span>
                      {a.category&&(
                        <span className={styles.catChip} style={{color:CAT_COLORS[a.category]||'#888',borderColor:CAT_COLORS[a.category]||'#888'}}>
                          {CAT_LABELS[a.category]||a.category}
                        </span>
                      )}
                      {sections.map(sec=>(
                        <span key={sec} className={styles.secChip}>{sec}</span>
                      ))}
                    </div>
                    <h3 className={styles.hed}>{a.title}</h3>
                    <div className={styles.rowMeta}>
                      <span><Eye size={11}/>{fmtNum(a.views||0)}</span>
                      <span><Heart size={11}/>{a.likes||0}</span>
                      <span><Clock size={11}/>{readTime(a.body)} min · {fmtNum(wordCount(a.body))} words</span>
                      {a.submittedAt&&<span>{fmtDate(a.submittedAt)}</span>}
                    </div>
                    {/* views bar for published */}
                    {a.status==='published'&&<ViewBar val={a.views||0} max={maxViews}/>}
                    {/* rejection note */}
                    {(a.rejectionReason||a.correction)&&(
                      <div className={styles.editorNote}>
                        <AlertCircle size={11}/>
                        <span>{a.rejectionReason||a.correction}</span>
                      </div>
                    )}
                    {/* tags */}
                    {(a.tags||[]).length>0&&(
                      <div className={styles.tagRow}>
                        <Tag size={10}/>
                        {a.tags.map(t=><span key={t} className={styles.tag}>#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className={styles.rowActions}>
                    {a.status==='published'&&(
                      <Link to={`/article/${a.id}`} className={styles.actionBtn}>
                        <Eye size={12}/>View
                      </Link>
                    )}
                    {a.status!=='published'&&(
                      <Link to={`/edit/${a.id}`} className={`${styles.actionBtn} ${styles.editBtn}`}>
                        <Edit size={12}/>Edit
                      </Link>
                    )}
                    {a.status!=='published'&&(
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={()=>handleDelete(a.id,a.status)}
                        disabled={deleting===a.id}>
                        <Trash2 size={12}/>{deleting===a.id?'…':'Delete'}
                      </button>
                    )}
                    {a.status==='published'&&(
                      <button className={`${styles.actionBtn} ${styles.bookmarkBtn}`}
                        onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/article/${a.id}`).then(()=>alert('Link copied!'))}>
                        <Bookmark size={12}/>Copy Link
                      </button>
                    )}
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
