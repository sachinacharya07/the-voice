import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, orderBy, where, limit, getDocs, serverTimestamp, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore'
import { Heart, Bookmark, Clock, MessageSquare, ArrowLeft, Trash2, Share2, Printer, Edit, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import ArticleSidebar from '../components/ArticleSidebar'
import NewsletterSignup from '../components/NewsletterSignup'
import styles from './ArticlePage.module.css'

const CAT_LABELS = { school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b' }
const REACTIONS = [
  { key:'fire', emoji:'🔥', label:'Fire' },
  { key:'wow', emoji:'😮', label:'Wow' },
  { key:'sad', emoji:'😢', label:'Sad' },
  { key:'angry', emoji:'😡', label:'Angry' },
]

function readTime(body=''){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/200))}
function ago(ts){
  if(!ts)return'Just now'
  const d=Math.floor((Date.now()-ts.toDate().getTime())/1000)
  if(d<60)return'Just now'
  if(d<3600)return`${Math.floor(d/60)}m ago`
  if(d<86400)return`${Math.floor(d/3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
}


// ── extract YouTube video ID ────────────────────────────
function getYouTubeId(text) {
  const m = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/)
  return m ? m[1] : null
}

// ── detect if a line is a bare URL ──────────────────────
function isBareUrl(text) {
  return /^https?:\/\/[^\s]+$/.test(text.trim())
}

// ── render inline markdown: bold, italic, links ────────────
function renderInlineLinks(text) {
  // tokenize **bold**, _italic_, URLs
  const re = /(\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s]+)/g
  const parts = text.split(re)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2,-2)}</strong>
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1,-1)}</em>
    if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{color:'var(--red)',textDecoration:'underline',textUnderlineOffset:'3px'}}>{part}</a>
    return part
  })
}

// ── main body renderer ───────────────────────────────────
function renderBody(body, inlineImages) {
  const lines = body.split('\n').filter(Boolean)
  const elements = []
  let imgIdx = 0

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    // [image:N] marker — insert Nth inline image
    const imgMarker = trimmed.match(/^\[image:(\d+)\]$/i)
    if (imgMarker) {
      const n = parseInt(imgMarker[1]) - 1
      const img = inlineImages[n]
      if (img) {
        elements.push(
          <figure key={`img-${i}`} style={{margin:'2rem 0',textAlign:'center'}}>
            <img src={img.url} alt={img.caption||''} style={{maxWidth:'100%',width:'100%',height:'auto',display:'block'}}/>
            {img.caption&&<figcaption style={{fontSize:'12px',color:'var(--mid)',marginTop:'0.5rem',fontStyle:'italic'}}>{img.caption}</figcaption>}
          </figure>
        )
      }
      return
    }

    // Bare YouTube URL → embed
    const ytId = getYouTubeId(trimmed)
    if (isBareUrl(trimmed) && ytId) {
      elements.push(
        <div key={`yt-${i}`} style={{margin:'2rem 0',position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden',background:'#000'}}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="YouTube video"
          />
        </div>
      )
      return
    }

    // Bare non-YouTube URL → styled link card
    if (isBareUrl(trimmed)) {
      const domain = (() => { try { return new URL(trimmed).hostname.replace('www.','') } catch { return trimmed } })()
      elements.push(
        <a key={`link-${i}`} href={trimmed} target="_blank" rel="noopener noreferrer"
          style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',border:'1.5px solid var(--border)',margin:'1.5rem 0',color:'var(--black)',textDecoration:'none',background:'var(--off)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,color:'var(--mid)'}}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span style={{flex:1,minWidth:0}}>
            <span style={{display:'block',fontWeight:700,fontSize:'13px'}}>{domain}</span>
            <span style={{display:'block',fontSize:'11px',color:'var(--mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{trimmed}</span>
          </span>
        </a>
      )
      return
    }

    // Heading ## 
    if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={`h-${i}`} style={{fontFamily:'var(--serif)',fontSize:'1.4em',fontWeight:800,margin:'2rem 0 0.75rem',letterSpacing:'-0.01em'}}>{trimmed.slice(3)}</h2>)
      return
    }
    // Heading ###
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} style={{fontFamily:'var(--serif)',fontSize:'1.15em',fontWeight:700,margin:'1.5rem 0 0.5rem'}}>{trimmed.slice(4)}</h3>)
      return
    }
    // Blockquote > 
    if (trimmed.startsWith('> ')) {
      elements.push(<blockquote key={`bq-${i}`} style={{borderLeft:'3px solid var(--red)',paddingLeft:'1.25rem',margin:'1.5rem 0',fontStyle:'italic',color:'#555',fontFamily:'var(--serif)',fontSize:'1.05em'}}>{trimmed.slice(2)}</blockquote>)
      return
    }
    // Bullet • or - 
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      elements.push(<li key={`li-${i}`} style={{marginLeft:'1.5rem',marginBottom:'0.4rem',lineHeight:1.7}}>{renderInlineLinks(trimmed.slice(2))}</li>)
      return
    }

    // Normal paragraph with inline formatting
    elements.push(<p key={`p-${i}`}>{renderInlineLinks(trimmed)}</p>)

    // Auto-insert inline image after every 3rd paragraph if there are remaining unplaced images
    // Only if writer hasn't used [image:N] markers at all
    const hasMarkers = body.includes('[image:')
    if (!hasMarkers && inlineImages.length > 0) {
      const parasOnly = lines.filter(l => !isBareUrl(l.trim()) && !l.trim().startsWith('## '))
      const paraPos = parasOnly.indexOf(line)
      if ((paraPos + 1) % 3 === 0 && imgIdx < inlineImages.length) {
        const img = inlineImages[imgIdx++]
        elements.push(
          <figure key={`auto-img-${i}`} style={{margin:'2rem 0',textAlign:'center'}}>
            <img src={img.url} alt={img.caption||''} style={{maxWidth:'100%',width:'100%',height:'auto',display:'block'}}/>
            {img.caption&&<figcaption style={{fontSize:'12px',color:'var(--mid)',marginTop:'0.5rem',fontStyle:'italic'}}>{img.caption}</figcaption>}
          </figure>
        )
      }
    }
  })

  return elements
}

export default function ArticlePage() {
  const { id } = useParams()
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [reactions, setReactions] = useState({})
  const [myReaction, setMyReaction] = useState(null)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState(null) // {id, authorName}
  const [replyText, setReplyText] = useState('')
  const [commentLikes, setCommentLikes] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [prevNext, setPrevNext] = useState({prev:null,next:null})
  const [seriesArts, setSeriesArts] = useState([])
  const [copied, setCopied] = useState(false)
  const [headlineCopied, setHeadlineCopied] = useState(false)
  const [textSize, setTextSize] = useState(17)
  const articleRef = useRef()

  useEffect(() => {
    const ref = doc(db,'articles',id)
    getDoc(ref).then(snap => {
      if(!snap.exists()){navigate('/not-found',{replace:true});return}
      const data={id:snap.id,...snap.data()}
      setArticle(data)
      // OG / Twitter meta tags + document title
      document.title = data.title + ' — The Voice'
      const setMeta = (prop, val, attr='name') => {
        let el = document.querySelector(`meta[${attr}="${prop}"]`)
        if(!el){ el=document.createElement('meta'); el.setAttribute(attr,prop); document.head.appendChild(el) }
        el.setAttribute('content', val)
      }
      const url = `${window.location.origin}/article/${id}` // canonical URL, not current path
      const img = data.coverImage || 'https://the-voicee-lac.vercel.app/og-default.jpg'
      setMeta('description', data.summary||data.title)
      setMeta('og:title', data.title, 'property')
      setMeta('og:description', data.summary||data.title, 'property')
      setMeta('og:image', img, 'property')
      setMeta('og:url', url, 'property')
      setMeta('og:type', 'article', 'property')
      setMeta('twitter:card', 'summary_large_image')
      setMeta('twitter:title', data.title)
      setMeta('twitter:description', data.summary||data.title)
      setMeta('twitter:image', img)
      setLikeCount(data.likes||0)
      setReactions(data.reactions||{})
      if(user){
        setLiked((data.likedBy||[]).includes(user.uid))
        setBookmarked((data.bookmarkedBy||[]).includes(user.uid))
        setMyReaction(data.userReactions?.[user.uid]||null)
      }
      setLoading(false)
      // Load prev/next articles using already-imported firebase
      try {
        const prevNextSnap = await getDocs(query(
          collection(db,'articles'),
          where('status','==','published'),
          orderBy('publishedAt','desc'),
          limit(50)
        ))
        const all = prevNextSnap.docs.map(d=>({id:d.id,title:d.data().title}))
        const idx = all.findIndex(a=>a.id===id)
        if(idx !== -1) setPrevNext({
          prev: idx < all.length-1 ? all[idx+1] : null,
          next: idx > 0 ? all[idx-1] : null,
        })
      } catch {}
      // Load series articles
      if(data.seriesName){
        try{
          const seriesSnap = await getDocs(query(
            collection(db,'articles'),
            where('status','==','published'),
            where('seriesName','==',data.seriesName),
            orderBy('publishedAt','asc'),
            limit(10)
          ))
          setSeriesArts(seriesSnap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.id!==id))
        }catch{}
      }
      // Only count view once per browser session per article
      const viewKey = 'viewed_' + id
      if (!sessionStorage.getItem(viewKey)) {
        sessionStorage.setItem(viewKey, '1')
        updateDoc(ref,{views:increment(1)}).catch(()=>{})
      }
    })
    getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc'))).then(snap=>{
      setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
    // Load liked comments from localStorage
    try{const stored=JSON.parse(localStorage.getItem(`clike_${id}`)||'{}');setCommentLikes(stored)}catch{}
  },[id,user])

  useEffect(()=>{
    const onScroll=()=>{
      const el=articleRef.current
      if(!el)return
      const total=el.scrollHeight-window.innerHeight
      const progress=Math.min(100,Math.max(0,(window.scrollY/total)*100))
      setScrollProgress(progress)
      setShowBackTop(window.scrollY>400)
    }
    window.addEventListener('scroll',onScroll)
    return()=>window.removeEventListener('scroll',onScroll)
  },[])

  const toggleLike=async()=>{
    if(!user)return navigate('/auth')
    const ref=doc(db,'articles',id)
    try{
      if(liked){await updateDoc(ref,{likes:increment(-1),likedBy:arrayRemove(user.uid)});setLikeCount(c=>c-1);setLiked(false)}
      else{await updateDoc(ref,{likes:increment(1),likedBy:arrayUnion(user.uid)});setLikeCount(c=>c+1);setLiked(true)}
    }catch{}
  }

  const toggleBookmark=async()=>{
    if(!user)return navigate('/auth')
    const ref=doc(db,'articles',id)
    try{
      if(bookmarked){await updateDoc(ref,{bookmarkedBy:arrayRemove(user.uid)});setBookmarked(false)}
      else{await updateDoc(ref,{bookmarkedBy:arrayUnion(user.uid)});setBookmarked(true)}
    }catch{}
  }

  const addReaction=async(key)=>{
    if(!user)return navigate('/auth')
    const ref=doc(db,'articles',id)
    const prev=myReaction
    try{
      if(prev===key){
        await updateDoc(ref,{[`reactions.${key}`]:increment(-1),[`userReactions.${user.uid}`]:null})
        setReactions(r=>({...r,[key]:Math.max(0,(r[key]||1)-1)}))
        setMyReaction(null)
      } else {
        const updates={[`reactions.${key}`]:increment(1),[`userReactions.${user.uid}`]:key}
        if(prev)updates[`reactions.${prev}`]=increment(-1)
        await updateDoc(ref,updates)
        setReactions(r=>({...r,[key]:(r[key]||0)+1,...(prev?{[prev]:Math.max(0,(r[prev]||1)-1)}:{})}))
        setMyReaction(key)
      }
    }catch{}
  }

  const submitComment=async()=>{
    if(!user||!comment.trim())return
    if(comment.trim().length>1000){alert('Comment must be under 1000 characters.');return}
    setSubmitting(true)
    try{
      await addDoc(collection(db,'articles',id,'comments'),{
        text:comment.trim().slice(0,1000),
        authorId:user.uid,
        authorName:profile?.name||user.email,
        authorPhoto:user.photoURL||null,
        createdAt:serverTimestamp()
      })
      setComment('')
      const snap=await getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc')))
      setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    }catch{
      alert('Failed to post comment. Please try again.')
    }finally{
      setSubmitting(false)
    }
  }

  const submitReply=async()=>{
    if(!user||!replyText.trim()||!replyTo)return
    if(replyText.trim().length>1000){alert('Reply must be under 1000 characters.');return}
    setSubmitting(true)
    try{
      await addDoc(collection(db,'articles',id,'comments'),{
        text:replyText.trim().slice(0,1000),
        authorId:user.uid,
        authorName:profile?.name||user.email,
        authorPhoto:user.photoURL||null,
        createdAt:serverTimestamp(),
        replyTo:replyTo.id,
        replyToName:replyTo.authorName,
      })
      setReplyText(''); setReplyTo(null)
      const snap=await getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc')))
      setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    }catch(e){
      alert('Failed to post reply. Please try again.')
    }finally{
      setSubmitting(false)
    }
  }

  const likeComment=(cid)=>{
    const next={...commentLikes,[cid]:!commentLikes[cid]}
    setCommentLikes(next)
    try{localStorage.setItem(`clike_${id}`,JSON.stringify(next))}catch{}
  }

  const deleteComment=async(cid)=>{
    try{
      await deleteDoc(doc(db,'articles',id,'comments',cid))
      setComments(cs=>cs.filter(c=>c.id!==cid))
    }catch{ alert('Failed to delete comment.') }
  }

  const share=async()=>{
    const url=window.location.href
    if(navigator.share){navigator.share({title:article.title,url})}
    else{navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000)}
  }

  const shareWhatsApp=()=>{
    window.open(`https://wa.me/?text=${encodeURIComponent(article.title+' '+window.location.href)}`)
  }

  const printArticle=()=>window.print()

  const canEdit = user && (
    isAdmin ||
    profile?.role === 'editor' ||
    user.uid === article?.authorId  // own article - any role can edit
  )

  if(loading)return<PageWrapper><div className={styles.loading}>Loading...</div></PageWrapper>
  if(!article)return null

  const color=CAT_COLORS[article.category]||'#888'
  const label=CAT_LABELS[article.category]||article.category

  return (
    <PageWrapper>
      {/* Progress bar */}
      <div className={styles.progressBar} style={{width:`${scrollProgress}%`}} />

      {/* Banner — full width */}
      <div ref={articleRef}>
        <div className={styles.banner} style={article.coverImage?{}:{background:'#0d0d0d',minHeight:'320px'}}>
          {article.coverImage&&<img src={article.coverImage} alt={article.title} className={styles.bannerImg}/>}
          <div className={styles.bannerOverlay}/>
          <div className={styles.bannerContent}>
            <button className={styles.backBtn} onClick={()=>navigate(-1)}><ArrowLeft size={14}/> Back</button>
            <div className={styles.bannerTopRow}>
              <span className={styles.catTag} style={{color,borderColor:color}}>{label}</span>
              {article.subGenre&&<span style={{fontSize:'9px',fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.65)',border:'1px solid rgba(255,255,255,0.3)',padding:'2px 8px',marginLeft:'4px'}}>{article.subGenre}</span>}
              <div className={styles.bannerBadges}>
                {article.editorsPick&&<span className={styles.editorBadge}>⭐ Editor's Pick</span>}
                {article.factChecked&&<span className={styles.factBadge}><CheckCircle size={11}/> Fact Checked</span>}
              </div>
            </div>
            <h1 className={styles.title}>{article.title}</h1>
            {article.summary&&<p className={styles.summary}>{article.summary}</p>}
            {article.correction&&(
              <div className={styles.correctionBanner}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span><strong>Correction</strong>{article.correctionDate?` · ${article.correctionDate.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`:''}: {article.correction}</span>
              </div>
            )}
            {/* Pullout quote */}
            {article.pullQuote&&(
              <blockquote className={styles.pullQuote}>"{article.pullQuote}"</blockquote>
            )}
            <div className={styles.metaRow}>
              <Link to={`/profile/${article.authorId}`} className={styles.author}>
                {article.authorPhoto?<img src={article.authorPhoto} alt="" className={styles.authorAvatar}/>
                  :<span className={styles.authorInit}>{(article.authorName||'A')[0]}</span>}
                <span>{article.authorName}</span>
              </Link>
              {article.coAuthorName&&<><span className={styles.sep}>·</span><span className={styles.coAuthor}>& {article.coAuthorId?<Link to={`/profile/${article.coAuthorId}`} style={{color:'inherit'}}>{article.coAuthorName}</Link>:article.coAuthorName}</span></>}
              <span className={styles.sep}>·</span>
              <span>{ago(article.publishedAt)}</span>
              <span className={styles.sep}>·</span>
              <span className={styles.readTime}><Clock size={12}/>{readTime(article.body)} min read</span>
              {article.issue&&<><span className={styles.sep}>·</span><span className={styles.issue}>Vol.{article.issue.vol} Issue {article.issue.num}</span></>}
            </div>
            {/* Tags */}
            {article.tags&&article.tags.length>0&&(
              <div className={styles.tags}>
                {article.tags.map(t=><span key={t} className={styles.tag}>#{t}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <div className={styles.actionsBar}>
          <div className={styles.actionsInner}>
            <button className={`${styles.actionBtn} ${liked?styles.liked:''}`} onClick={toggleLike}>
              <Heart size={15} fill={liked?'currentColor':'none'}/><span>{likeCount}</span>
            </button>
            <button className={`${styles.actionBtn} ${bookmarked?styles.saved:''}`} onClick={toggleBookmark}>
              <Bookmark size={15} fill={bookmarked?'currentColor':'none'}/><span>{bookmarked?'Saved':'Save'}</span>
            </button>
            <button className={styles.actionBtn} onClick={share}>
              <Share2 size={15}/><span>{copied?'Copied!':'Share'}</span>
            </button>
            <button className={styles.actionBtn} onClick={shareWhatsApp}>
              <span>📱</span><span>WhatsApp</span>
            </button>
            <button className={styles.actionBtn} onClick={printArticle}>
              <Printer size={15}/><span>Print</span>
            </button>
            {canEdit&&(
              <Link to={`/edit/${id}`} className={`${styles.actionBtn} ${styles.editBtn}`}>
                <Edit size={15}/><span>Edit</span>
              </Link>
            )}
            <div className={styles.textSize}>
              <button onClick={()=>setTextSize(s=>Math.max(14,s-1))}>A-</button>
              <button onClick={()=>setTextSize(s=>Math.min(22,s+1))}>A+</button>
            </div>
            <span className={styles.commentCount}><MessageSquare size={14}/>{comments.length}</span>
          </div>
        </div>

        {/* Correction notice */}
        {article.correction&&(
          <div className={styles.correction}>
            <AlertTriangle size={14}/> <strong>Correction:</strong> {article.correction}
          </div>
        )}

        {/* Article body */}
        <article className={styles.article}>
          <div className={styles.body} style={{fontSize:`${textSize}px`}}>
            {renderBody(article.body, article.inlineImages||[])}
          </div>

          {/* Series navigation */}
          {seriesArts.length>0&&(
            <div style={{border:'1px solid var(--border)',padding:'1.25rem',margin:'2rem 0 0',background:'var(--off)'}}>
              <div style={{fontSize:'9px',fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--red)',marginBottom:'0.85rem'}}>
                In this series: {article.seriesName}
              </div>
              {seriesArts.map(a=>(
                <Link key={a.id} to={`/article/${a.id}`}
                  style={{display:'block',padding:'0.6rem 0',borderBottom:'1px solid var(--border)',color:'var(--black)',fontSize:'13.5px',fontFamily:'var(--serif)',fontWeight:600,lineHeight:1.35,transition:'color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--black)'}>
                  {a.title}
                </Link>
              ))}
            </div>
          )}

          {/* Prev / Next navigation */}
          {(prevNext.prev||prevNext.next)&&(
            <nav style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',background:'var(--border)',margin:'2rem 0 0',border:'1px solid var(--border)'}}>
              {prevNext.prev?(
                <Link to={`/article/${prevNext.prev.id}`} style={{padding:'1rem',background:'var(--white)',display:'flex',flexDirection:'column',gap:'4px',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--off)'}
                  onMouseLeave={e=>e.currentTarget.style.background='var(--white)'}>
                  <span style={{fontSize:'9px',fontWeight:800,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--mid)'}}>← Older</span>
                  <span style={{fontFamily:'var(--serif)',fontSize:'14px',fontWeight:700,color:'var(--black)',lineHeight:1.35}}>{prevNext.prev.title}</span>
                </Link>
              ):<div style={{background:'var(--off)'}}/>}
              {prevNext.next?(
                <Link to={`/article/${prevNext.next.id}`} style={{padding:'1rem',background:'var(--white)',display:'flex',flexDirection:'column',gap:'4px',textAlign:'right',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--off)'}
                  onMouseLeave={e=>e.currentTarget.style.background='var(--white)'}>
                  <span style={{fontSize:'9px',fontWeight:800,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--mid)'}}>Newer →</span>
                  <span style={{fontFamily:'var(--serif)',fontSize:'14px',fontWeight:700,color:'var(--black)',lineHeight:1.35}}>{prevNext.next.title}</span>
                </Link>
              ):<div style={{background:'var(--off)'}}/>}
            </nav>
          )}

          {/* Sources */}
          {article.sources&&article.sources.length>0&&(
            <div className={styles.sources}>
              <h4><BookOpen size={14}/> Sources</h4>
              <ol>{article.sources.filter(Boolean).map((s,i)=><li key={i}>{s}</li>)}</ol>
            </div>
          )}

          {/* Reactions */}
          <div className={styles.reactionsRow}>
            <span className={styles.reactLabel}>React:</span>
            {REACTIONS.map(r=>(
              <button key={r.key} className={`${styles.reactionBtn} ${myReaction===r.key?styles.reacted:''}`}
                onClick={()=>addReaction(r.key)}>
                {r.emoji} {reactions[r.key]>0&&<span>{reactions[r.key]}</span>}
              </button>
            ))}
          </div>

          {/* Comments */}
          <div className={styles.comments}>
            <div className={styles.commentsHead}>
              <h3>Responses <span>({comments.length})</span></h3>
            </div>
            {user?(
              <div className={styles.commentForm}>
                {user.photoURL?<img src={user.photoURL} alt="" className={styles.commentAvatar}/>
                  :<span className={styles.commentInit}>{(profile?.name||'U')[0]}</span>}
                <div className={styles.commentInput}>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="What do you think?" rows={3}/>
                  <button onClick={submitComment} disabled={submitting||!comment.trim()} className={styles.submitComment}>
                    {submitting?'Posting...':'Post'}
                  </button>
                </div>
              </div>
            ):(
              <div className={styles.signInPrompt}><Link to="/auth">Sign in</Link> to leave a response</div>
            )}
            <div className={styles.commentList}>
              {comments.length===0&&<div className={styles.noComments}>No responses yet. Be the first.</div>}
              {/* Top-level comments first */}
              {comments.filter(cm=>!cm.replyTo).map(cm=>(
                <div key={cm.id} className={styles.commentThread}>
                  <div className={styles.commentItem}>
                    {cm.authorPhoto?<img src={cm.authorPhoto} alt="" className={styles.commentAvatar} loading="lazy" decoding="async"/>
                      :<span className={styles.commentInit}>{(cm.authorName||'A')[0]}</span>}
                    <div className={styles.commentBody}>
                      <div className={styles.commentMeta}>
                        <strong>{cm.authorName}</strong>
                        <span>{ago(cm.createdAt)}</span>
                        {(isAdmin||user?.uid===cm.authorId)&&(
                          <button className={styles.deleteComment} onClick={()=>deleteComment(cm.id)}><Trash2 size={12}/></button>
                        )}
                      </div>
                      <p>{cm.text}</p>
                      <div className={styles.commentActions}>
                        <button className={`${styles.commentAction} ${commentLikes[cm.id]?styles.commentLiked:''}`}
                          onClick={()=>likeComment(cm.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={commentLikes[cm.id]?"var(--red)":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                          {commentLikes[cm.id]?'Liked':'Like'}
                        </button>
                        {user&&<button className={styles.commentAction} onClick={()=>setReplyTo(replyTo?.id===cm.id?null:{id:cm.id,authorName:cm.authorName})}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
                          Reply
                        </button>}
                      </div>
                    </div>
                  </div>
                  {/* Replies */}
                  {comments.filter(r=>r.replyTo===cm.id).map(reply=>(
                    <div key={reply.id} className={styles.replyItem}>
                      {reply.authorPhoto?<img src={reply.authorPhoto} alt="" className={styles.commentAvatar} style={{width:28,height:28}} loading="lazy" decoding="async"/>
                        :<span className={styles.commentInit} style={{width:28,height:28,fontSize:'10px'}}>{(reply.authorName||'A')[0]}</span>}
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <strong>{reply.authorName}</strong>
                          <span style={{color:'var(--red)',fontSize:'10px'}}>↩ {reply.replyToName}</span>
                          <span>{ago(reply.createdAt)}</span>
                          {(isAdmin||user?.uid===reply.authorId)&&(
                            <button className={styles.deleteComment} onClick={()=>deleteComment(reply.id)}><Trash2 size={12}/></button>
                          )}
                        </div>
                        <p>{reply.text}</p>
                        <div className={styles.commentActions}>
                          <button className={`${styles.commentAction} ${commentLikes[reply.id]?styles.commentLiked:''}`}
                            onClick={()=>likeComment(reply.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={commentLikes[reply.id]?"var(--red)":"none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                            {commentLikes[reply.id]?'Liked':'Like'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Reply form */}
                  {replyTo?.id===cm.id&&user&&(
                    <div className={styles.replyForm}>
                      <span className={styles.commentInit} style={{width:28,height:28,fontSize:'10px',flexShrink:0}}>{(profile?.name||'U')[0]}</span>
                      <div className={styles.commentInput}>
                        <textarea value={replyText} onChange={e=>setReplyText(e.target.value)}
                          placeholder={`Reply to ${cm.authorName}…`} rows={2} autoFocus/>
                        <div style={{display:'flex',gap:'0.5rem',marginTop:'0.4rem'}}>
                          <button onClick={submitReply} disabled={submitting||!replyText.trim()} className={styles.submitComment}>
                            {submitting?'Posting…':'Reply'}
                          </button>
                          <button onClick={()=>{setReplyTo(null);setReplyText('')}} className={styles.cancelReply}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Newsletter banner */}
        <div className={styles.articleNewsletterWrap}>
          <NewsletterSignup/>
        </div>
      </div>

      {/* Sidebar */}
      <ArticleSidebar currentId={id} category={article.category}/>

      {/* Back to top */}
      {showBackTop&&(
        <button className={styles.backToTop} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
      )}
    </PageWrapper>
  )
}
