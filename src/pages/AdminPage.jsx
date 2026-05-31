import { useEffect, useState, useCallback } from 'react'
import { collection, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, limit, setDoc } from 'firebase/firestore'
import { CheckCircle, XCircle, Eye, Users, FileText, TrendingUp, Shield, Star, AlertTriangle, Send, Bell, Mail } from 'lucide-react'
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
  const [stats, setStats]     = useState(null)
  const [correction, setCorrection] = useState({})
  const [breaking, setBreaking]     = useState('')
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [issueVol, setIssueVol] = useState('')
  const [issueNum, setIssueNum] = useState('')

  // Load stats once on mount (lightweight count queries)
  useEffect(()=>{
    Promise.all([
      getDocs(query(collection(db,'articles'),where('status','==','published'),limit(200))),
      getDocs(query(collection(db,'articles'),where('status','==','pending'),limit(50))),
      getDocs(collection(db,'users')),
    ]).then(([pub,pend,usrs])=>{
      const pubArr=pub.docs.map(d=>d.data())
      setStats({
        total:pubArr.length,
        pending:pend.size,
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
    } catch(e) { console.error(e) }
    setTabLoading(false)
  },[data])

  useEffect(()=>{ loadTab(tab) },[tab])

  const switchTab=(t)=>{ setTab(t) }

  // After mutation, clear cache for affected tab and reload
  const refresh=(t)=>setData(d=>{ const n={...d}; delete n[t]; return n })

  const approve=async(id)=>{
    const issueData=(issueVol&&issueNum)?{issue:{vol:issueVol,num:issueNum}}:{}
    await updateDoc(doc(db,'articles',id),{status:'published',publishedAt:serverTimestamp(),...issueData})
    refresh('pending'); refresh('published')
    setStats(s=>s?{...s,pending:Math.max(0,s.pending-1),total:s.total+1}:s)
    loadTab('pending')
  }

  const reject=async(id)=>{
    if(!window.confirm('Reject and delete this submission?'))return
    await deleteDoc(doc(db,'articles',id))
    setData(d=>({...d,pending:(d.pending||[]).filter(a=>a.id!==id)}))
    setStats(s=>s?{...s,pending:Math.max(0,s.pending-1)}:s)
  }

  const unpublish=async(id)=>{
    if(!window.confirm('Unpublish this article?'))return
    await updateDoc(doc(db,'articles',id),{status:'unpublished'})
    setData(d=>({...d,published:(d.published||[]).filter(a=>a.id!==id)}))
    setStats(s=>s?{...s,total:Math.max(0,s.total-1)}:s)
  }

  const toggleEditorsPick=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{editorsPick:!current})
    setData(d=>({...d,published:(d.published||[]).map(a=>a.id===id?{...a,editorsPick:!current}:a)}))
  }

  const toggleFactChecked=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{factChecked:!current})
    setData(d=>({...d,published:(d.published||[]).map(a=>a.id===id?{...a,factChecked:!current}:a)}))
  }

  const addCorrection=async(id)=>{
    if(!correction[id]?.trim())return
    await updateDoc(doc(db,'articles',id),{correction:correction[id].trim()})
    setCorrection(c=>({...c,[id]:''}))
    setData(d=>({...d,pending:(d.pending||[]).map(a=>a.id===id?{...a,correction:correction[id]}:a)}))
  }

  const updateRole=async(uid,role)=>{
    await updateDoc(doc(db,'users',uid),{role})
    setData(d=>({...d,users:(d.users||[]).map(u=>u.id===uid?{...u,role}:u)}))
  }

  const approveApplication=async(id,uid)=>{
    await updateDoc(doc(db,'users',uid),{role:'writer'})
    await updateDoc(doc(db,'applications',id),{status:'approved'})
    setData(d=>({...d,applications:(d.applications||[]).map(a=>a.id===id?{...a,status:'approved'}:a)}))
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
    {key:'applications',label:'Applications'},
    {key:'tools',label:'Tools'},
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
                        <button className={styles.approveBtn} onClick={()=>approve(a.id)}><CheckCircle size={13}/> Approve</button>
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
                      <a href={`/article/${r.articleId}`} target="_blank" rel="noreferrer" className={styles.viewBtn}><Eye size={12}/></a>
                      <button className={styles.rejectBtn} onClick={()=>dismissReport(r.id)}>Dismiss</button>
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
                        <button className={styles.approveBtn} onClick={()=>approveApplication(a.id,a.userId)}><CheckCircle size={13}/> Approve</button>
                        <button className={styles.mailBtn} onClick={()=>window.open(`mailto:${a.email}`)}><Mail size={13}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TOOLS */}
            {tab==='tools'&&(
              <div className={styles.toolsGrid}>
                <div className={styles.toolCard}>
                  <h3><Bell size={16}/> Breaking Banner</h3>
                  <p>Sets the scrolling headline on the homepage.</p>
                  <input className={styles.toolInput} value={breaking} onChange={e=>setBreaking(e.target.value)} placeholder="e.g. NEET 2026 re-exam date announced..."/>
                  <button className={styles.toolBtn} onClick={setBreakingBanner}>Update</button>
                </div>
                <div className={styles.toolCard}>
                  <h3><Mail size={16}/> Email Users</h3>
                  <p>Opens your mail client with all user emails.</p>
                  <textarea className={styles.toolTextarea} value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Your message..."/>
                  <button className={styles.toolBtn} onClick={()=>window.open(`mailto:${(data.users||[]).map(u=>u.email).join(',')}?subject=The Voice Update&body=${encodeURIComponent(broadcastMsg)}`)}>Open in Mail</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
