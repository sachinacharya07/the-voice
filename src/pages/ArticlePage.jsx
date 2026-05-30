import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, orderBy, getDocs, serverTimestamp, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore'
import { Heart, Bookmark, Clock, MessageSquare, ArrowLeft, Trash2, Share2, Printer, Edit, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
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
  const [submitting, setSubmitting] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showBackTop, setShowBackTop] = useState(false)
  const [copied, setCopied] = useState(false)
  const [textSize, setTextSize] = useState(17)
  const articleRef = useRef()

  useEffect(() => {
    const ref = doc(db,'articles',id)
    getDoc(ref).then(snap => {
      if(!snap.exists()){navigate('/');return}
      const data={id:snap.id,...snap.data()}
      setArticle(data)
      setLikeCount(data.likes||0)
      setReactions(data.reactions||{})
      if(user){
        setLiked((data.likedBy||[]).includes(user.uid))
        setBookmarked((data.bookmarkedBy||[]).includes(user.uid))
        setMyReaction(data.userReactions?.[user.uid]||null)
      }
      setLoading(false)
      updateDoc(ref,{views:increment(1)}).catch(()=>{})
    })
    getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc'))).then(snap=>{
      setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
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
    if(liked){await updateDoc(ref,{likes:increment(-1),likedBy:arrayRemove(user.uid)});setLikeCount(c=>c-1);setLiked(false)}
    else{await updateDoc(ref,{likes:increment(1),likedBy:arrayUnion(user.uid)});setLikeCount(c=>c+1);setLiked(true)}
  }

  const toggleBookmark=async()=>{
    if(!user)return navigate('/auth')
    const ref=doc(db,'articles',id)
    if(bookmarked){await updateDoc(ref,{bookmarkedBy:arrayRemove(user.uid)});setBookmarked(false)}
    else{await updateDoc(ref,{bookmarkedBy:arrayUnion(user.uid)});setBookmarked(true)}
  }

  const addReaction=async(key)=>{
    if(!user)return navigate('/auth')
    const ref=doc(db,'articles',id)
    const prev=myReaction
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
  }

  const submitComment=async()=>{
    if(!user||!comment.trim())return
    setSubmitting(true)
    await addDoc(collection(db,'articles',id,'comments'),{
      text:comment.trim(),authorId:user.uid,
      authorName:profile?.name||user.email,
      authorPhoto:user.photoURL||null,
      createdAt:serverTimestamp()
    })
    setComment('')
    const snap=await getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc')))
    setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    setSubmitting(false)
  }

  const deleteComment=async(cid)=>{
    await deleteDoc(doc(db,'articles',id,'comments',cid))
    setComments(cs=>cs.filter(c=>c.id!==cid))
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

  const canEdit = user && (isAdmin || user.uid === article?.authorId || profile?.role === 'editor' || profile?.role === 'writer')

  if(loading)return<PageWrapper><div className={styles.loading}>Loading...</div></PageWrapper>
  if(!article)return null

  const color=CAT_COLORS[article.category]||'#888'
  const label=CAT_LABELS[article.category]||article.category

  return (
    <PageWrapper>
      {/* Progress bar */}
      <div className={styles.progressBar} style={{width:`${scrollProgress}%`}} />

      <div ref={articleRef}>
        {/* Banner */}
        <div className={styles.banner} style={article.coverImage?{}:{background:'#0d0d0d',minHeight:'320px'}}>
          {article.coverImage&&<img src={article.coverImage} alt={article.title} className={styles.bannerImg}/>}
          <div className={styles.bannerOverlay}/>
          <div className={styles.bannerContent}>
            <button className={styles.backBtn} onClick={()=>navigate(-1)}><ArrowLeft size={14}/> Back</button>
            <div className={styles.bannerTopRow}>
              <span className={styles.catTag} style={{color,borderColor:color}}>{label}</span>
              <div className={styles.bannerBadges}>
                {article.editorsPick&&<span className={styles.editorBadge}>⭐ Editor's Pick</span>}
                {article.factChecked&&<span className={styles.factBadge}><CheckCircle size={11}/> Fact Checked</span>}
              </div>
            </div>
            <h1 className={styles.title}>{article.title}</h1>
            {article.summary&&<p className={styles.summary}>{article.summary}</p>}
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
              {article.coAuthorName&&<><span className={styles.sep}>·</span><span className={styles.coAuthor}>& {article.coAuthorName}</span></>}
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
            {article.body.split('\n').filter(Boolean).map((para,i)=>(
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* In-article images */}
          {article.inlineImages&&article.inlineImages.length>0&&(
            <div className={styles.inlineImages}>
              {article.inlineImages.map((img,i)=>(
                <figure key={i} className={styles.inlineFig}>
                  <img src={img.url} alt={img.caption||''}/>
                  {img.caption&&<figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
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
              {comments.map(c=>(
                <div key={c.id} className={styles.commentItem}>
                  {c.authorPhoto?<img src={c.authorPhoto} alt="" className={styles.commentAvatar}/>
                    :<span className={styles.commentInit}>{(c.authorName||'A')[0]}</span>}
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <strong>{c.authorName}</strong>
                      <span>{ago(c.createdAt)}</span>
                      {(isAdmin||user?.uid===c.authorId)&&(
                        <button className={styles.deleteComment} onClick={()=>deleteComment(c.id)}><Trash2 size={12}/></button>
                      )}
                    </div>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length===0&&<div className={styles.noComments}>No responses yet. Be the first.</div>}
            </div>
          </div>
        </article>
      </div>

      {/* Back to top */}
      {showBackTop&&(
        <button className={styles.backToTop} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
      )}
    </PageWrapper>
  )
}
