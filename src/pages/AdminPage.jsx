import { useEffect, useState, useCallback } from 'react'
import { collection, query, where, orderBy, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit, setDoc, addDoc } from 'firebase/firestore'
import { CheckCircle, XCircle, Eye, Users, FileText, TrendingUp, Shield, Star, AlertTriangle, Send, Bell, Mail, Upload, Trash2 } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './AdminPage.module.css'

const CAT_LABELS={school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion'}
const CAT_COLORS={school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b'}

// Fetch only what the active tab needs
async function fetchTab(tab) {
  switch(tab) {
    case 'pending':
      return getDocs(query(collection(db,'articles'),where('status','==','pending'),orderBy('submittedAt','desc'),limit(50)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'published':
      return getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'),limit(50)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'users':
      return getDocs(collection(db,'users')).then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'reports':
      return getDocs(query(collection(db,'reports'),orderBy('createdAt','desc'),limit(30)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'tips':
      return getDocs(query(collection(db,'tips'),orderBy('createdAt','desc'),limit(30)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'letters':
      return getDocs(query(collection(db,'letters'),orderBy('createdAt','desc'),limit(30)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'newsletter':
      return getDocs(query(collection(db,'newsletter'),orderBy('subscribedAt','desc'),limit(100)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    case 'applications':
      return getDocs(query(collection(db,'applications'),orderBy('createdAt','desc'),limit(30)))
        .then(s=>s.docs.map(d=>({id:d.id,...d.data()})))
    default: return []
  }
}

export default function AdminPage() {
  const { profile } = useAuth()
  const [tab, setTab]         = useState('pending')
  const [data, setData]       = useState({})
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats]     = useState(null)
  const [correction, setCorrection] = useState({})
  const [breaking, setBreaking]     = useState('')
  const [pushTitle, setPushTitle]   = useState('')
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [emailMsg, setEmailMsg]     = useState('')
  const [issueVol, setIssueVol] = useState('')
  const [issueNum, setIssueNum] = useState('')
  // Pinned hero article
  const [pinnedId, setPinnedId] = useState(null)

  // Load pinned article id once
  useEffect(()=>{
    getDoc(doc(db,'settings','pinnedHero')).then(async snap=>{
      if(snap.exists()) setPinnedId(snap.data().articleId||null)
    }).catch(()=>{})
  },[])

  const togglePin = async(articleId) => {
    try{
      if(pinnedId===articleId){
        await deleteDoc(doc(db,'settings','pinnedHero'))
        setPinnedId(null)
      } else {
        await setDoc(doc(db,'settings','pinnedHero'),{articleId,updatedAt:serverTimestamp()})
        setPinnedId(articleId)
      }
    }catch(e){ alert('Failed to pin: '+e.message) }
  }

  // E-Paper upload state
  const [epapers, setEpapers]       = useState(null) // null = not loaded
  const [epUploading, setEpUploading] = useState(false)
  const [epForm, setEpForm]         = useState({title:'',vol:'',num:'',description:'',pdfFile:null,thumbFile:null})

  // Load stats once on mount (lightweight count queries)
  useEffect(()=>{
    Promise.all([
      getDocs(query(collection(db,'articles'),where('status','==','published'),limit(200))),
      getDocs(query(collection(db,'articles'),where('status','==','pending'),limit(50))),
      getDocs(query(collection(db,'newsletter'),limit(500))),
      getDocs(collection(db,'users')),
    ]).then(async ([pub,pend,news,usrs])=>{
      const pubArr=pub.docs.map(d=>d.data())
      setStats({
        total:pubArr.length,
        pending:pend.size,
        newsletter:news.size,
        totalViews:pubArr.reduce((s,a)=>s+(a.views||0),0),
        totalLikes:pubArr.reduce((s,a)=>s+(a.likes||0),0),
        members:usrs.size
      })
    })
  },[])

  // Load tab data lazily — only when tab is switched
  const loadTab = useCallback(async(t)=>{
    if(data[t]) return // already loaded, use cache
    setTabLoading(true)
    try {
      const result = await fetchTab(t)
      setData(d=>({...d,[t]:result}))
    } catch(e) { setError('Failed to load data. Try refreshing.') }
    setTabLoading(false)
  },[data])

  useEffect(()=>{ loadTab(tab) },[tab])

  const switchTab=(t)=>{ setTab(t) }

  // After mutation, clear cache for affected tab and reload
  const refresh=(t)=>setData(d=>{ const n={...d}; delete n[t]; return n })

  const approve=async(id, scheduleDate=null)=>{
    try {
      const issueData=(issueVol&&issueNum)?{issue:{vol:issueVol,num:issueNum}}:{}
      // Scheduled publishing
      let scheduled = null
      if (scheduleDate) {
        const d = new Date(scheduleDate)
        if (!isNaN(d.getTime()) && d > new Date()) scheduled = d
      }
      await updateDoc(doc(db,'articles',id),{
        status: scheduled ? 'scheduled' : 'published',
        publishedAt: scheduled ? scheduled : serverTimestamp(),
        ...(scheduled ? {scheduledFor: scheduled} : {}),
        ...issueData,
      })
      refresh('pending'); refresh('published')
      setStats(s=>s?{...s,pending:Math.max(0,s.pending-1),total:s.total+1}:s)
      // Send push notification to all subscribers
      const article = (data.pending||[]).find(a=>a.id===id)
      if(article) {
        try {
          const { auth } = await import('../lib/firebase')
          const token = await auth.currentUser?.getIdToken()
          if(token) {
            fetch('/api/article-published',{
              method:'POST',
              headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
              body:JSON.stringify({articleId:id,title:article.title,summary:article.summary,coverImage:article.coverImage,category:article.category})
            }).catch(()=>{})
          }
        } catch {}
      }
      // Fetch fresh pending list directly — can't use loadTab() here because
      // refresh() is async setState and the cache check would still see stale data
      setTabLoading(true)
      fetchTab('pending').then(async result => {
        setData(d=>({...d,pending:result}))
        setTabLoading(false)
      }).catch(()=>setTabLoading(false))
    } catch(e) { alert('Failed to approve: '+e.message) }
  }

  const reject=async(id)=>{
    if(!window.confirm('Reject and delete this submission?'))return
    try {
      await deleteDoc(doc(db,'articles',id))
      setData(d=>({...d,pending:(d.pending||[]).filter(a=>a.id!==id)}))
      setStats(s=>s?{...s,pending:Math.max(0,s.pending-1)}:s)
    } catch(e) { alert('Failed to reject: '+e.message) }
  }

  const unpublish=async(id)=>{
    if(!window.confirm('Unpublish this article?'))return
    try {
      await updateDoc(doc(db,'articles',id),{status:'unpublished'})
      setData(d=>({...d,published:(d.published||[]).filter(a=>a.id!==id)}))
      setStats(s=>s?{...s,total:Math.max(0,s.total-1)}:s)
    } catch(e) { alert('Failed to unpublish: '+e.message) }
  }

  const toggleEditorsPick=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{editorsPick:!current})
    setData(d=>({...d,published:(d.published||[]).map(a=>a.id===id?{...a,editorsPick:!current}:a)}))
  }

  const toggleFactChecked=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{factChecked:!current})
    setData(d=>({...d,published:(d.published||[]).map(a=>a.id===id?{...a,factChecked:!current}:a)}))
  }

  const addCorrection=async(id,tab='published')=>{
    if(!correction[id]?.trim())return
    const text=correction[id].trim()
    await updateDoc(doc(db,'articles',id),{
      correction:text,
      correctionDate:serverTimestamp(),
    })
    setCorrection(c=>({...c,[id]:''}))
    setData(d=>({...d,[tab]:(d[tab]||[]).map(a=>a.id===id?{...a,correction:text}:a)}))
  }

  const updateRole=async(uid,role)=>{
    const VALID_ROLES=['reader','writer','editor','admin']
    if(!VALID_ROLES.includes(role)){alert('Invalid role');return}
    try{
      await updateDoc(doc(db,'users',uid),{role})
      setData(d=>({...d,users:(d.users||[]).map(u=>u.id===uid?{...u,role}:u)}))
    }catch(e){alert('Failed to update role: '+e.message)}
  }

  const approveApplication=async(id,uid,email,name)=>{
    try{
      await updateDoc(doc(db,'users',uid),{role:'writer'})
      await updateDoc(doc(db,'applications',id),{status:'approved',reviewedAt:serverTimestamp()})
      setData(d=>({...d,applications:(d.applications||[]).map(a=>a.id===id?{...a,status:'approved'}:a)}))
      // Open mail to congratulate
      const subj=encodeURIComponent(`Your application to The Voice — Approved!`)
      const body=encodeURIComponent(`Hi ${name||''},

Congratulations! Your application to write for The Voice has been approved.

You can now log in and start writing at ${window.location.origin}/write

Welcome to the team!

— The Voice Editorial Team`)
      window.open(`mailto:${email}?subject=${subj}&body=${body}`)
    }catch(e){alert('Approval failed: '+e.message)}
  }

  const rejectApplication=async(id,email,name)=>{
    const reason=prompt(`Reason for rejecting ${name||email} (will be sent to them):`)
    if(reason===null)return
    try{
      await updateDoc(doc(db,'applications',id),{status:'rejected',rejectionReason:reason,reviewedAt:serverTimestamp()})
      setData(d=>({...d,applications:(d.applications||[]).map(a=>a.id===id?{...a,status:'rejected'}:a)}))
      if(reason&&email){
        const subj=encodeURIComponent(`Your application to The Voice`)
        const body=encodeURIComponent(`Hi ${name||''},

Thank you for applying to write for The Voice.

After careful review, we're unable to approve your application at this time.

Feedback: ${reason}

You're welcome to apply again in the future.

— The Voice Editorial Team`)
        window.open(`mailto:${email}?subject=${subj}&body=${body}`)
      }
    }catch(e){alert('Rejection failed: '+e.message)}
  }

  const dismissReport=async(id)=>{
    await deleteDoc(doc(db,'reports',id))
    setData(d=>({...d,reports:(d.reports||[]).filter(r=>r.id!==id)}))
  }

  const dismissTip=async(id)=>{
    await deleteDoc(doc(db,'tips',id))
    setData(d=>({...d,tips:(d.tips||[]).filter(t=>t.id!==id)}))
  }

  const setBreakingBanner=async()=>{
    await setDoc(doc(db,'settings','breaking'),{value:breaking,updatedAt:serverTimestamp()})
    alert('Breaking news banner updated!')
  }

  const tabList=[
    {key:'pending',label:'Pending',count:stats?.pending||0},
    {key:'published',label:'Published',count:stats?.total||0},
    {key:'users',label:'Members',count:stats?.members||0},
    {key:'reports',label:'Reports'},
    {key:'tips',label:'Tips'},
    {key:'letters',label:'Letters'},
    {key:'newsletter',label:'Newsletter'},
    {key:'applications',label:'Applications'},
    {key:'tools',label:'Tools'},
    {key:'epaper',label:'E-Paper'},
    {key:'analytics',label:'Analytics'},
  ]

  const items = data[tab] || []

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerLeft}><Shield size={20}/><div><h1>Editorial Desk</h1><p><strong>{profile?.email}</strong></p></div></div>
          {stats?.pending>0&&<span className={styles.badge}>{stats.pending} pending</span>}
        </div>

        {/* Stats - shown from cache immediately */}
        {stats&&(
          <div className={styles.statsGrid}>
            <div className={styles.statCard}><FileText size={18}/><div><strong>{stats.total}</strong><span>Published</span></div></div>
            <div className={styles.statCard}><Eye size={18}/><div><strong>{stats.totalViews}</strong><span>Views</span></div></div>
            <div className={styles.statCard}><TrendingUp size={18}/><div><strong>{stats.totalLikes}</strong><span>Likes</span></div></div>
            <div className={styles.statCard}><Users size={18}/><div><strong>{stats.members}</strong><span>Members</span></div></div>
          </div>
        )}

        <div className={styles.tabs}>
          {tabList.map(t=>(
            <button key={t.key} className={`${styles.tab} ${tab===t.key?styles.active:''}`} onClick={()=>switchTab(t.key)}>
              {t.label}{t.count>0&&<span className={styles.tabBadge}>{t.count}</span>}
            </button>
          ))}
        </div>

        {error&&<div className={styles.error} style={{padding:'0.75rem 1rem',background:'#fef0f0',border:'1px solid #fcc',color:'var(--red)',fontSize:'13px',marginBottom:'0.75rem'}}>{error}<button onClick={()=>setError('')} style={{marginLeft:'1rem',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>✕</button></div>}
        {tabLoading ? (
          <div className={styles.tabLoader}>
            <div className={styles.spinner}/>
            <span>Loading {tab}...</span>
          </div>
        ) : (
          <>
            {/* PENDING */}
            {tab==='pending'&&(
              <div>
                <div className={styles.issueRow}>
                  <span className={styles.issueLabel}>Assign issue on approve:</span>
                  <input className={styles.issueInput} value={issueVol} onChange={e=>setIssueVol(e.target.value)} placeholder="Vol"/>
                  <input className={styles.issueInput} value={issueNum} onChange={e=>setIssueNum(e.target.value)} placeholder="Issue #"/>
                </div>
                <div className={styles.list}>
                  {items.length===0?<div className={styles.empty}><CheckCircle size={28}/><p>All clear.</p></div>
                  :items.map(a=>(
                    <div key={a.id} className={styles.card}>
                      {a.coverImage&&<img src={a.coverImage} alt="" className={styles.cardThumb} loading="lazy"/>}
                      <div className={styles.cardBody}>
                        <div className={styles.cardMeta}>
                          <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                          {a.subGenre&&<span className={styles.catTag} style={{color:'#666',borderColor:'#ccc',fontSize:'9px'}}>{a.subGenre}</span>}
                          <span className={styles.cardBy}>By {a.authorName}</span>
                          <span className={styles.cardDate}>{a.submittedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                        </div>
                        <h3 className={styles.cardHed}>{a.title}</h3>
                        {a.summary&&<p className={styles.cardDek}>{a.summary}</p>}
                        <div className={styles.correctionRow}>
                          <input className={styles.correctionInput} value={correction[a.id]||''} onChange={e=>setCorrection(c=>({...c,[a.id]:e.target.value}))} placeholder="Add correction notice..."/>
                          <button className={styles.correctionBtn} onClick={()=>addCorrection(a.id)}>Add</button>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <a href={`/article/${a.id}`} target="_blank" rel="noreferrer" className={styles.viewBtn} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',fontSize:'12px',fontWeight:700,border:'1.5px solid var(--border)',color:'var(--mid)',textDecoration:'none',marginBottom:'0.25rem'}}><Eye size={12}/> Read</a>
                        <button className={styles.approveBtn} onClick={()=>approve(a.id)}><CheckCircle size={13}/> Approve Now</button>
                        <button className={styles.approveBtn} style={{background:'none',color:'#185FA5',border:'1.5px solid #185FA5'}} onClick={()=>{
                          const d=prompt('Schedule publish date/time (YYYY-MM-DD HH:MM):')
                          if(d)approve(a.id,d)
                        }}>Schedule</button>
                        <button className={styles.rejectBtn} onClick={()=>reject(a.id)}><XCircle size={13}/> Reject</button>
                        {a.authorEmail&&<button className={styles.mailBtn} onClick={()=>window.open(`mailto:${a.authorEmail}?subject=Re: "${a.title}"&body=Hi,\n\nRegarding your article submission.`)}><Mail size={12}/></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLISHED */}
            {tab==='published'&&(
              <div className={styles.list}>
                {items.length===0?<div className={styles.empty}><p>No published articles yet.</p></div>
                :items.map(a=>(
                  <div key={a.id} className={styles.card}>
                    {a.coverImage&&<img src={a.coverImage} alt="" className={styles.cardThumb} loading="lazy"/>}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                        {a.editorsPick&&<span className={styles.edPickBadge}>⭐ Pick</span>}
                        {a.factChecked&&<span className={styles.factBadge}>✓ Checked</span>}
                      </div>
                      <h3 className={styles.cardHed}>{a.title}</h3>
                      <div className={styles.pubStats}>
                        <span><Eye size={11}/>{a.views||0}</span>
                        <span>❤ {a.likes||0}</span>
                        <span className={styles.cardBy}>By {a.authorName}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={`${styles.pickBtn} ${a.editorsPick?styles.pickOn:''}`} onClick={()=>toggleEditorsPick(a.id,a.editorsPick)}><Star size={12}/>{a.editorsPick?'Unpick':'Pick'}</button>
                      <button className={`${styles.pinBtn} ${pinnedId===a.id?styles.pinOn:''}`} onClick={()=>togglePin(a.id)} title="Pin as homepage hero">{pinnedId===a.id?'📌 Hero':'Pin Hero'}</button>
                      <button className={`${styles.factBtn} ${a.factChecked?styles.factOn:''}`} onClick={()=>toggleFactChecked(a.id,a.factChecked)}>✓{a.factChecked?'Uncheck':'Fact-check'}</button>
                      <button className={styles.rejectBtn} onClick={()=>unpublish(a.id)}>Unpublish</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* USERS */}
            {tab==='users'&&(
              <div className={styles.userList}>
                {items.map(u=>(
                  <div key={u.id} className={styles.userRow}>
                    <div className={styles.userInfo}>
                      {u.photo?<img src={u.photo} alt="" className={styles.userAvatar} loading="lazy"/>:<span className={styles.userInit}>{(u.name||'U')[0]}</span>}
                      <div><strong>{u.name}</strong><span>{u.email}</span></div>
                    </div>
                    <div className={styles.userActions}>
                      <select className={styles.roleSelect} value={u.role||'reader'} onChange={e=>updateRole(u.id,e.target.value)} disabled={u.email===profile?.email}>
                        <option value="reader">Reader</option>
                        <option value="writer">Writer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className={styles.mailBtn} onClick={()=>window.open(`mailto:${u.email}`)}><Mail size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REPORTS */}
            {tab==='reports'&&(
              <div className={styles.list}>
                {items.length===0?<div className={styles.empty}><p>No reports.</p></div>
                :items.map(r=>(
                  <div key={r.id} className={`${styles.card} ${styles.reportCard}`}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><AlertTriangle size={13} color="#f59e0b"/><span className={styles.cardBy}>{r.reporterName||'Anonymous'}</span><span className={styles.cardDate}>{r.createdAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>
                      <h3 className={styles.cardHed}>{r.articleTitle}</h3>
                      <p className={styles.cardDek}><strong>Reason:</strong> {r.reason}</p>
                    </div>
                    <div className={styles.cardActions}>
                      <a href={`/article/${r.articleId}`} target="_blank" rel="noreferrer" className={styles.viewBtn}><Eye size={12}/> View</a>
                      <button className={styles.approveBtn} style={{background:'none',color:'var(--mid)',border:'1.5px solid var(--border)'}} onClick={()=>dismissReport(r.id)}>Resolve</button>
                      <button className={styles.rejectBtn} onClick={async()=>{
                        if(!confirm('Delete this article?'))return
                        await deleteDoc(doc(db,'articles',r.articleId)).catch(()=>{})
                        await dismissReport(r.id)
                      }}><Trash2 size={12}/> Remove Article</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TIPS */}
            {tab==='tips'&&(
              <div className={styles.list}>
                {items.length===0?<div className={styles.empty}><p>No tips yet.</p></div>
                :items.map(t=>(
                  <div key={t.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><Send size={12}/><span className={styles.cardBy}>{t.anonymous?'Anonymous':'From: '+t.name}</span><span className={styles.cardDate}>{t.createdAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>
                      <h3 className={styles.cardHed}>{t.subject}</h3>
                      <p className={styles.cardDek}>{t.message}</p>
                      {!t.anonymous&&t.email&&<p className={styles.wordInfo}>Contact: {t.email}</p>}
                    </div>
                    <div className={styles.cardActions}><button className={styles.rejectBtn} onClick={()=>dismissTip(t.id)}>Dismiss</button></div>
                  </div>
                ))}
              </div>
            )}

            {/* APPLICATIONS */}
            {tab==='applications'&&(
              <div className={styles.list}>
                {items.length===0?<div className={styles.empty}><p>No applications yet.</p></div>
                :items.map(a=>(
                  <div key={a.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><span className={styles.cardBy}>{a.name}</span><span className={styles.cardDate}>{a.status==='approved'?'✅ Approved':'Pending'}</span></div>
                      <h3 className={styles.cardHed}>{a.email}</h3>
                      <p className={styles.cardDek}>{a.motivation}</p>
                    </div>
                    {a.status!=='approved'&&(
                      <div className={styles.cardActions}>
                        <button className={styles.approveBtn} onClick={()=>approveApplication(a.id,a.userId,a.email,a.name)}><CheckCircle size={13}/> Approve & Email</button>
                        <button className={styles.rejectBtn} onClick={()=>rejectApplication(a.id,a.email,a.name)}><XCircle size={13}/> Reject</button>
                        <button className={styles.mailBtn} onClick={()=>window.open(`mailto:${a.email}`)}><Mail size={13}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TOOLS */}
            {/* LETTERS */}
            {tab==='letters'&&(
              <div className={styles.list}>
                {items.length===0?<div className={styles.empty}><p>No letters yet.</p></div>
                :items.map(l=>(
                  <div key={l.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardBy}>{l.name||'Anonymous'}</span>
                        {l.email&&<span className={styles.cardBy}>· {l.email}</span>}
                        <span className={styles.cardDate}>{l.createdAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                      </div>
                      <h3 className={styles.cardHed}>{l.subject}</h3>
                      <p className={styles.cardDek}>{l.body?.substring(0,200)}{l.body?.length>200?'...':''}</p>
                    </div>
                    <div className={styles.cardActions}>
                      {l.status!=='approved'
                        ?<button className={styles.approveBtn} onClick={async()=>{
                          await updateDoc(doc(db,'letters',l.id),{status:'approved'})
                          setData(d=>({...d,letters:(d.letters||[]).map(x=>x.id===l.id?{...x,status:'approved'}:x)}))
                        }}><CheckCircle size={13}/> Publish</button>
                        :<span style={{fontSize:'11px',color:'#0F6E56',fontWeight:700}}>✓ Published</span>
                      }
                      {l.email&&<button className={styles.mailBtn} onClick={()=>window.open(`mailto:${l.email}?subject=Re: ${l.subject}`)}><Mail size={13}/></button>}
                      <button className={styles.rejectBtn} onClick={async()=>{await deleteDoc(doc(db,'letters',l.id));setData(d=>({...d,letters:(d.letters||[]).filter(x=>x.id!==l.id)}))}}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NEWSLETTER */}
            {tab==='newsletter'&&(
              <div>
                <div className={styles.issueRow} style={{marginBottom:'1rem'}}>
                  <span className={styles.issueLabel}>{items.length} subscribers</span>
                  <button className={styles.correctionBtn} onClick={()=>{
                    const emails=items.map(s=>s.email).join(',')
                    window.open(`mailto:${emails}?subject=The Voice Weekly`)
                  }}>Email all subscribers</button>
                </div>
                <div className={styles.userList}>
                  {items.map(s=>(
                    <div key={s.id} className={styles.userRow}>
                      <div className={styles.userInfo}><div><strong>{s.email}</strong><span>{s.subscribedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div></div>
                      <button className={styles.rejectBtn} style={{fontSize:'10px',padding:'4px 10px'}} onClick={async()=>{await deleteDoc(doc(db,'newsletter',s.id));setData(d=>({...d,newsletter:(d.newsletter||[]).filter(x=>x.id!==s.id)}))}}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==='tools'&&(
              <div className={styles.toolsGrid}>
                <div className={styles.toolCard}>
                  <h3><Bell size={16}/> Breaking Banner</h3>
                  <p>Sets the scrolling headline on the homepage.</p>
                  <input className={styles.toolInput} value={breaking} onChange={e=>setBreaking(e.target.value)} placeholder="e.g. NEET 2026 re-exam date announced..."/>
                  <button className={styles.toolBtn} onClick={setBreakingBanner}>Update</button>
                </div>
                <div className={styles.toolCard}>
                  <h3><Bell size={16}/> Push Notification</h3>
                  <p>Send a push notification to all subscribers immediately.</p>
                  <input className={styles.toolInput} value={pushTitle}
                    onChange={e=>setPushTitle(e.target.value)}
                    placeholder="Notification title..."/>
                  <textarea className={styles.toolTextarea} value={broadcastMsg}
                    onChange={e=>setBroadcastMsg(e.target.value)}
                    placeholder="Notification body text..."/>
                  <button className={styles.toolBtn} onClick={async()=>{
                    if(!pushTitle.trim()||!broadcastMsg.trim())return alert('Title and body required')
                    try {
                      const {auth}=await import('../lib/firebase')
                      const token=await auth.currentUser?.getIdToken()
                      const res=await fetch('/api/send-notification',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({title:pushTitle,body:broadcastMsg,url:'/'})})
                      const d=await res.json()
                      alert(`Sent: ${d.sent} subscribers`)
                      setPushTitle(''); setBroadcastMsg('')
                    } catch(e){alert('Error: '+e.message)}
                  }}>Send to All</button>
                </div>
                <div className={styles.toolCard}>
                  <h3><Mail size={16}/> Email Users</h3>
                  <p>Opens your mail client with all user emails.</p>
                  <textarea className={styles.toolTextarea} value={emailMsg} onChange={e=>setEmailMsg(e.target.value)} placeholder="Your message..."/>
                  <button className={styles.toolBtn} onClick={()=>window.open(`mailto:${(data.users||[]).map(u=>u.email).join(',')}?subject=The Voice Update&body=${encodeURIComponent(emailMsg)}`)}>Open in Mail</button>
                </div>
                <div className={styles.toolCard}>
                  <h3>📰 Weekly Digest</h3>
                  <p>Auto-generates every Sunday. Click below to generate now, or send the email to all subscribers.</p>
                  <button className={styles.toolBtn} style={{marginBottom:'0.5rem'}} onClick={async()=>{
                    const secret=prompt('Enter CRON_SECRET (from Vercel env vars):')
                    if(!secret)return
                    try{
                      const r=await fetch('/api/digest',{method:'POST',headers:{authorization:`Bearer ${secret}`}})
                      const d=await r.json()
                      alert(d?.success?`✓ Digest generated — ${d.articleCount} articles included.`:d?.message||d?.error||'Generation failed.')
                    }catch{ alert('Network error — check connection.') }
                  }}>Generate Now</button>
                  <button className={styles.toolBtn} onClick={()=>{
                    const digestUrl=`${window.location.origin}/digest`
                    const subject=`The Voice Weekly Digest — ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}`
                    const body=`Hi,

This week's digest is ready. Read the top stories from The Voice:

${digestUrl}

— The Voice Editorial Team`
                    window.open(`mailto:${(data.users||[]).map(u=>u.email).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
                  }}>Open Digest Email</button>
                </div>
              </div>
            )}
            {tab==='analytics'&&(
              <div>
                <div style={{fontWeight:700,fontSize:'13px',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'1.5rem',borderBottom:'1.5px solid var(--border)',paddingBottom:'0.5rem'}}>Site Analytics</div>

                {/* Summary stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',border:'1px solid var(--border)',marginBottom:'2rem'}}>
                  {[
                    {label:'Total Published',val:stats?.total||0},
                    {label:'Total Views',val:(data.published||[]).reduce((s,a)=>s+(a.views||0),0)},
                    {label:'Total Likes',val:(data.published||[]).reduce((s,a)=>s+(a.likes||0),0)},
                    {label:'Subscribers',val:stats?.newsletter||0},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:'1.25rem',borderRight:i<3?'1px solid var(--border)':'none',textAlign:'center'}}>
                      <div style={{fontFamily:'var(--serif)',fontSize:'28px',fontWeight:800,letterSpacing:'-0.02em'}}>{s.val.toLocaleString()}</div>
                      <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--mid)',marginTop:'4px'}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Top articles by views */}
                <div style={{fontWeight:700,fontSize:'12px',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'0.75rem',color:'var(--mid)'}}>Top Articles by Views</div>
                <div style={{border:'1px solid var(--border)'}}>
                  {(data.published||[])
                    .slice().sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10)
                    .map((a,i)=>{
                      const maxV=Math.max(...(data.published||[]).map(x=>x.views||0),1)
                      return(
                        <div key={a.id} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.75rem 1rem',borderBottom:i<9?'1px solid var(--border)':'none'}}>
                          <span style={{fontFamily:'var(--serif)',fontSize:'22px',fontWeight:800,color:'var(--border)',width:28,flexShrink:0}}>{i+1}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'13px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                            <div style={{height:4,background:'var(--border)',marginTop:6,overflow:'hidden'}}>
                              <div style={{height:'100%',background:'var(--red)',width:`${Math.round(((a.views||0)/maxV)*100)}%`,transition:'width 0.4s'}}/>
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:'14px',fontWeight:700}}>{(a.views||0).toLocaleString()}</div>
                            <div style={{fontSize:'10px',color:'var(--mid)'}}>views</div>
                          </div>
                        </div>
                      )
                    })
                  }
                  {(data.published||[]).length===0&&<div style={{padding:'2rem',textAlign:'center',color:'var(--mid)',fontSize:'13px'}}>Load the Published tab first to see analytics.</div>}
                </div>

                {/* Top articles by likes */}
                <div style={{fontWeight:700,fontSize:'12px',letterSpacing:'0.08em',textTransform:'uppercase',margin:'1.5rem 0 0.75rem',color:'var(--mid)'}}>Top Articles by Likes</div>
                <div style={{border:'1px solid var(--border)'}}>
                  {(data.published||[])
                    .slice().sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,5)
                    .map((a,i)=>(
                      <div key={a.id} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.65rem 1rem',borderBottom:i<4?'1px solid var(--border)':'none'}}>
                        <span style={{fontFamily:'var(--serif)',fontSize:'20px',fontWeight:800,color:'var(--border)',width:24,flexShrink:0}}>{i+1}</span>
                        <div style={{flex:1,fontSize:'13px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                        <div style={{fontSize:'14px',fontWeight:700,flexShrink:0,color:'var(--red)'}}>{a.likes||0} ♥</div>
                      </div>
                    ))
                  }
                  {(data.published||[]).length===0&&<div style={{padding:'1.5rem',textAlign:'center',color:'var(--mid)',fontSize:'13px'}}>Load the Published tab first.</div>}
                </div>
              </div>
            )}
            {tab==='epaper'&&(
              <div>
                <div className={styles.toolCard} style={{maxWidth:'560px',marginBottom:'2rem'}}>
                  <h3><Upload size={16}/> Publish New Issue</h3>
                  <p>Upload a PDF e-paper. It will appear on the homepage and E-Paper page.</p>
                  <input className={styles.toolInput} placeholder="Issue title (e.g. The Voice — June 2026)"
                    value={epForm.title} onChange={e=>setEpForm(f=>({...f,title:e.target.value}))}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',margin:'0.5rem 0'}}>
                    <input className={styles.toolInput} style={{margin:0}} placeholder="Volume no." type="number"
                      value={epForm.vol} onChange={e=>setEpForm(f=>({...f,vol:e.target.value}))}/>
                    <input className={styles.toolInput} style={{margin:0}} placeholder="Issue no." type="number"
                      value={epForm.num} onChange={e=>setEpForm(f=>({...f,num:e.target.value}))}/>
                  </div>
                  <textarea className={styles.toolTextarea} placeholder="Short description (optional)"
                    value={epForm.description} onChange={e=>setEpForm(f=>({...f,description:e.target.value}))}/>
                  <label className={styles.fileLabel}>
                    <span>PDF File *</span>
                    <input type="file" accept=".pdf,application/pdf" onChange={e=>setEpForm(f=>({...f,pdfFile:e.target.files[0]||null}))}/>
                    {epForm.pdfFile&&<em>{epForm.pdfFile.name}</em>}
                  </label>
                  <label className={styles.fileLabel}>
                    <span>Cover Thumbnail (optional image)</span>
                    <input type="file" accept="image/*" onChange={e=>setEpForm(f=>({...f,thumbFile:e.target.files[0]||null}))}/>
                    {epForm.thumbFile&&<em>{epForm.thumbFile.name}</em>}
                  </label>
                  <button className={styles.toolBtn} disabled={epUploading||!epForm.title||!epForm.pdfFile}
                    onClick={async()=>{
                      if(!epForm.pdfFile||!epForm.title)return
                      setEpUploading(true)
                      try{
                        const {CLOUDINARY_CLOUD,CLOUDINARY_PRESET}=await import('../lib/firebase')
                        const toBase64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})
                        const pdfB64=await toBase64(epForm.pdfFile)
                        const pdfResp=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`,{
                          method:'POST',headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({file:pdfB64,upload_preset:CLOUDINARY_PRESET,resource_type:'raw'})
                        })
                        const pdfData=await pdfResp.json()
                        if(!pdfData.secure_url)throw new Error('PDF upload failed: '+JSON.stringify(pdfData))
                        let thumbUrl=''
                        if(epForm.thumbFile){
                          const thumbB64=await toBase64(epForm.thumbFile)
                          const thumbResp=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{
                            method:'POST',headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({file:thumbB64,upload_preset:CLOUDINARY_PRESET})
                          })
                          const thumbData=await thumbResp.json()
                          thumbUrl=thumbData.secure_url||''
                        }
                        await addDoc(collection(db,'epapers'),{
                          title:epForm.title,
                          vol:epForm.vol||'',
                          num:epForm.num||'',
                          description:epForm.description||'',
                          pdfUrl:pdfData.secure_url,
                          thumbUrl,
                          publishedAt:serverTimestamp(),
                        })
                        setEpForm({title:'',vol:'',num:'',description:'',pdfFile:null,thumbFile:null})
                        const snap=await getDocs(query(collection(db,'epapers'),orderBy('publishedAt','desc')))
                        setEpapers(snap.docs.map(d=>({id:d.id,...d.data()})))
                        alert('E-paper published!')
                      }catch(e){alert('Upload failed: '+e.message)}
                      setEpUploading(false)
                    }}>
                    {epUploading?'Uploading…':'Publish Issue'}
                  </button>
                </div>
                <div style={{fontWeight:700,fontSize:'13px',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'1rem',borderBottom:'1.5px solid var(--border)',paddingBottom:'0.5rem'}}>Published Issues</div>
                {epapers===null?(
                  <button className={styles.toolBtn} onClick={async()=>{
                    const snap=await getDocs(query(collection(db,'epapers'),orderBy('publishedAt','desc')))
                    setEpapers(snap.docs.map(d=>({id:d.id,...d.data()})))
                  }}>Load Issues</button>
                ):epapers.length===0?(
                  <p style={{color:'var(--mid)',fontSize:'13px'}}>No issues published yet.</p>
                ):(
                  <div style={{display:'grid',gap:'0.75rem'}}>
                    {epapers.map(ep=>(
                      <div key={ep.id} className={styles.toolCard} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.85rem 1rem'}}>
                        {ep.thumbUrl&&<img src={ep.thumbUrl} alt="" style={{width:48,height:60,objectFit:'cover',flexShrink:0,border:'1px solid var(--border)'}}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'13px',marginBottom:'2px'}}>{ep.title}</div>
                          {ep.vol&&<div style={{fontSize:'11px',color:'var(--mid)'}}>Vol. {ep.vol} · No. {ep.num}</div>}
                        </div>
                        <a href={ep.pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.toolBtn} style={{padding:'5px 12px',fontSize:'11px',textDecoration:'none'}}>View PDF</a>
                        <button className={styles.rejectBtn} style={{padding:'5px 10px',fontSize:'11px'}} onClick={async()=>{
                          if(!confirm('Delete this issue?'))return
                          await deleteDoc(doc(db,'epapers',ep.id))
                          setEpapers(eps=>eps.filter(e=>e.id!==ep.id))
                        }}><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
