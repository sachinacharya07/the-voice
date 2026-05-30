import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore'
import { CheckCircle, XCircle, Eye, Users, FileText, TrendingUp, Shield, Star, AlertTriangle, Send, Bell, Mail } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './AdminPage.module.css'

const CAT_LABELS={school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion'}
const CAT_COLORS={school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b'}

export default function AdminPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [published, setPublished] = useState([])
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [tips, setTips] = useState([])
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({total:0,totalViews:0,totalLikes:0,members:0})
  const [loading, setLoading] = useState(true)
  const [correction, setCorrection] = useState({})
  const [breaking, setBreaking] = useState('')
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [issueVol, setIssueVol] = useState('')
  const [issueNum, setIssueNum] = useState('')

  useEffect(()=>{loadAll()},[])

  const loadAll=async()=>{
    setLoading(true)
    const [pendSnap,pubSnap,usersSnap,reportsSnap,tipsSnap,appsSnap]=await Promise.all([
      getDocs(query(collection(db,'articles'),where('status','==','pending'),orderBy('submittedAt','desc'))),
      getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'))),
      getDocs(collection(db,'users')),
      getDocs(query(collection(db,'reports'),orderBy('createdAt','desc'))),
      getDocs(query(collection(db,'tips'),orderBy('createdAt','desc'))),
      getDocs(query(collection(db,'applications'),orderBy('createdAt','desc'))),
    ])
    const pend=pendSnap.docs.map(d=>({id:d.id,...d.data()}))
    const pub=pubSnap.docs.map(d=>({id:d.id,...d.data()}))
    const usrs=usersSnap.docs.map(d=>({id:d.id,...d.data()}))
    setPending(pend);setPublished(pub);setUsers(usrs)
    setReports(reportsSnap.docs.map(d=>({id:d.id,...d.data()})))
    setTips(tipsSnap.docs.map(d=>({id:d.id,...d.data()})))
    setApplications(appsSnap.docs.map(d=>({id:d.id,...d.data()})))
    setStats({total:pub.length,totalViews:pub.reduce((s,a)=>s+(a.views||0),0),totalLikes:pub.reduce((s,a)=>s+(a.likes||0),0),members:usrs.length})
    setLoading(false)
  }

  const approve=async(id)=>{
    const issueData=(issueVol&&issueNum)?{issue:{vol:issueVol,num:issueNum}}:{}
    await updateDoc(doc(db,'articles',id),{status:'published',publishedAt:serverTimestamp(),...issueData})
    loadAll()
  }
  const reject=async(id)=>{
    if(!window.confirm('Reject and delete this submission?'))return
    await deleteDoc(doc(db,'articles',id));loadAll()
  }
  const unpublish=async(id)=>{
    if(!window.confirm('Unpublish this article?'))return
    await updateDoc(doc(db,'articles',id),{status:'unpublished'});loadAll()
  }
  const toggleEditorsPick=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{editorsPick:!current});loadAll()
  }
  const toggleFactChecked=async(id,current)=>{
    await updateDoc(doc(db,'articles',id),{factChecked:!current});loadAll()
  }
  const addCorrection=async(id)=>{
    if(!correction[id]?.trim())return
    await updateDoc(doc(db,'articles',id),{correction:correction[id].trim()})
    setCorrection(c=>({...c,[id]:''}));loadAll()
  }
  const setBreakingBanner=async()=>{
    await addDoc(collection(db,'settings'),{key:'breaking',value:breaking,updatedAt:serverTimestamp()})
    alert('Breaking news banner updated!')
  }
  const updateRole=async(uid,role)=>{
    await updateDoc(doc(db,'users',uid),{role});loadAll()
  }
  const approveApplication=async(id,uid)=>{
    await updateDoc(doc(db,'users',uid),{role:'writer'})
    await updateDoc(doc(db,'applications',id),{status:'approved'})
    loadAll()
  }
  const dismissReport=async(id)=>{
    await deleteDoc(doc(db,'reports',id));loadAll()
  }
  const dismissTip=async(id)=>{
    await deleteDoc(doc(db,'tips',id));loadAll()
  }
  const emailWriter=async(email,articleTitle)=>{
    window.open(`mailto:${email}?subject=Re: Your article "${articleTitle}" on The Voice&body=Hi,%0A%0ARegarding your article "${articleTitle}" submitted to The Voice:%0A%0A`)
  }

  const tabs=[
    {key:'pending',label:'Pending',count:pending.length},
    {key:'published',label:'Published',count:published.length},
    {key:'users',label:'Members',count:users.length},
    {key:'reports',label:'Reports',count:reports.length},
    {key:'tips',label:'Tips',count:tips.length},
    {key:'applications',label:'Applications',count:applications.filter(a=>a.status==='pending').length},
    {key:'tools',label:'Tools'},
  ]

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerLeft}><Shield size={20}/><div><h1>Editorial Desk</h1><p>Signed in as <strong>{profile?.email}</strong></p></div></div>
          {pending.length>0&&<span className={styles.badge}>{pending.length} awaiting review</span>}
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><FileText size={18}/><div><strong>{stats.total}</strong><span>Published</span></div></div>
          <div className={styles.statCard}><Eye size={18}/><div><strong>{stats.totalViews}</strong><span>Total Views</span></div></div>
          <div className={styles.statCard}><TrendingUp size={18}/><div><strong>{stats.totalLikes}</strong><span>Total Likes</span></div></div>
          <div className={styles.statCard}><Users size={18}/><div><strong>{stats.members}</strong><span>Members</span></div></div>
        </div>

        <div className={styles.tabs}>
          {tabs.map(t=>(
            <button key={t.key} className={`${styles.tab} ${tab===t.key?styles.active:''}`} onClick={()=>setTab(t.key)}>
              {t.label}{t.count>0&&<span className={styles.tabBadge}>{t.count}</span>}
            </button>
          ))}
        </div>

        {loading?<div className={styles.loading}>Loading...</div>:(
          <>
            {/* PENDING */}
            {tab==='pending'&&(
              <div>
                {/* Issue assignment */}
                <div className={styles.issueRow}>
                  <span className={styles.issueLabel}>Assign to issue when approving:</span>
                  <input className={styles.issueInput} value={issueVol} onChange={e=>setIssueVol(e.target.value)} placeholder="Vol"/>
                  <input className={styles.issueInput} value={issueNum} onChange={e=>setIssueNum(e.target.value)} placeholder="Issue #"/>
                </div>
                <div className={styles.list}>
                  {pending.length===0?(
                    <div className={styles.empty}><CheckCircle size={32}/><p>All clear — nothing pending.</p></div>
                  ):pending.map(a=>(
                    <div key={a.id} className={styles.card}>
                      {a.coverImage&&<img src={a.coverImage} alt="" className={styles.cardThumb}/>}
                      <div className={styles.cardBody}>
                        <div className={styles.cardMeta}>
                          <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                          <span className={styles.cardBy}>By {a.authorName}</span>
                          {a.coAuthorName&&<span className={styles.cardBy}>& {a.coAuthorName}</span>}
                          <span className={styles.cardDate}>{a.submittedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                        </div>
                        <h3 className={styles.cardHed}>{a.title}</h3>
                        {a.tags?.length>0&&<div className={styles.cardTags}>{a.tags.map(t=><span key={t} className={styles.cardTag}>#{t}</span>)}</div>}
                        {a.summary&&<p className={styles.cardDek}>{a.summary}</p>}
                        <div className={styles.wordInfo}>{Math.max(1,Math.ceil((a.body||'').trim().split(/\s+/).length/200))} min read · {(a.body||'').trim().split(/\s+/).length} words</div>
                        {/* Correction input */}
                        <div className={styles.correctionRow}>
                          <input className={styles.correctionInput} value={correction[a.id]||''} onChange={e=>setCorrection(c=>({...c,[a.id]:e.target.value}))} placeholder="Add correction notice..."/>
                          <button className={styles.correctionBtn} onClick={()=>addCorrection(a.id)}>Add</button>
                        </div>
                      </div>
                      <div className={styles.cardActions}>
                        <button className={styles.approveBtn} onClick={()=>approve(a.id)}><CheckCircle size={14}/> Approve</button>
                        <button className={styles.rejectBtn} onClick={()=>reject(a.id)}><XCircle size={14}/> Reject</button>
                        {a.authorEmail&&<button className={styles.mailBtn} onClick={()=>emailWriter(a.authorEmail,a.title)}><Mail size={13}/> Email</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PUBLISHED */}
            {tab==='published'&&(
              <div className={styles.list}>
                {published.length===0?<div className={styles.empty}><p>No published articles yet.</p></div>
                :published.map(a=>(
                  <div key={a.id} className={styles.card}>
                    {a.coverImage&&<img src={a.coverImage} alt="" className={styles.cardThumb}/>}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.catTag} style={{color:CAT_COLORS[a.category],borderColor:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                        <span className={styles.cardBy}>By {a.authorName}</span>
                        {a.editorsPick&&<span className={styles.edPickBadge}>⭐ Pick</span>}
                        {a.factChecked&&<span className={styles.factBadge}>✓ Checked</span>}
                      </div>
                      <h3 className={styles.cardHed}>{a.title}</h3>
                      <div className={styles.pubStats}>
                        <span><Eye size={11}/>{a.views||0}</span>
                        <span>❤ {a.likes||0}</span>
                        {a.issue&&<span>Vol.{a.issue.vol} #{a.issue.num}</span>}
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={`${styles.pickBtn} ${a.editorsPick?styles.pickOn:''}`} onClick={()=>toggleEditorsPick(a.id,a.editorsPick)}><Star size={13}/> {a.editorsPick?'Unpick':'Pick'}</button>
                      <button className={`${styles.factBtn} ${a.factChecked?styles.factOn:''}`} onClick={()=>toggleFactChecked(a.id,a.factChecked)}>✓ {a.factChecked?'Uncheck':'Fact-check'}</button>
                      <button className={styles.rejectBtn} onClick={()=>unpublish(a.id)}>Unpublish</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* USERS */}
            {tab==='users'&&(
              <div className={styles.userList}>
                {users.map(u=>(
                  <div key={u.id} className={styles.userRow}>
                    <div className={styles.userInfo}>
                      {u.photo?<img src={u.photo} alt="" className={styles.userAvatar}/>:<span className={styles.userInit}>{(u.name||'U')[0]}</span>}
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
                {reports.length===0?<div className={styles.empty}><p>No reports.</p></div>
                :reports.map(r=>(
                  <div key={r.id} className={`${styles.card} ${styles.reportCard}`}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><AlertTriangle size={14} color="#f59e0b"/><span className={styles.cardBy}>Reported by {r.reporterName||'Anonymous'}</span><span className={styles.cardDate}>{r.createdAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>
                      <h3 className={styles.cardHed}>{r.articleTitle}</h3>
                      <p className={styles.cardDek}><strong>Reason:</strong> {r.reason}</p>
                    </div>
                    <div className={styles.cardActions}>
                      <a href={`/article/${r.articleId}`} target="_blank" rel="noreferrer" className={styles.viewBtn}><Eye size={13}/> View</a>
                      <button className={styles.rejectBtn} onClick={()=>dismissReport(r.id)}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TIPS */}
            {tab==='tips'&&(
              <div className={styles.list}>
                {tips.length===0?<div className={styles.empty}><p>No tips submitted yet.</p></div>
                :tips.map(t=>(
                  <div key={t.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><Send size={13}/><span className={styles.cardBy}>{t.anonymous?'Anonymous':'From: '+t.name}</span><span className={styles.cardDate}>{t.createdAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div>
                      <h3 className={styles.cardHed}>{t.subject}</h3>
                      <p className={styles.cardDek}>{t.message}</p>
                      {!t.anonymous&&t.email&&<p className={styles.wordInfo}>Contact: {t.email}</p>}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.rejectBtn} onClick={()=>dismissTip(t.id)}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* APPLICATIONS */}
            {tab==='applications'&&(
              <div className={styles.list}>
                {applications.length===0?<div className={styles.empty}><p>No writer applications.</p></div>
                :applications.map(a=>(
                  <div key={a.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}><span className={styles.cardBy}>{a.name}</span><span className={styles.cardDate}>{a.status==='approved'?'✅ Approved':'Pending'}</span></div>
                      <h3 className={styles.cardHed}>{a.email}</h3>
                      <p className={styles.cardDek}>{a.motivation}</p>
                      {a.samples&&<p className={styles.wordInfo}>Writing samples: {a.samples}</p>}
                    </div>
                    {a.status!=='approved'&&(
                      <div className={styles.cardActions}>
                        <button className={styles.approveBtn} onClick={()=>approveApplication(a.id,a.userId)}><CheckCircle size={14}/> Approve</button>
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
                  <h3><Bell size={16}/> Breaking News Banner</h3>
                  <p>Set the scrolling headline shown at the top of the homepage.</p>
                  <input className={styles.toolInput} value={breaking} onChange={e=>setBreaking(e.target.value)} placeholder="e.g. NEET 2026 re-exam date announced..."/>
                  <button className={styles.toolBtn} onClick={setBreakingBanner}>Update Banner</button>
                </div>
                <div className={styles.toolCard}>
                  <h3><Mail size={16}/> Email All Users</h3>
                  <p>Opens your mail client with all user emails pre-filled.</p>
                  <textarea className={styles.toolTextarea} value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Your message to all readers..."/>
                  <button className={styles.toolBtn} onClick={()=>window.open(`mailto:${users.map(u=>u.email).join(',')}?subject=The Voice Update&body=${encodeURIComponent(broadcastMsg)}`)}>Open in Mail</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
