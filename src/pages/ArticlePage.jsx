import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, orderBy, getDocs, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'
import { Heart, Bookmark, Clock, MessageSquare, ArrowLeft, Trash2 } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './ArticlePage.module.css'

const CAT_LABELS = { school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b' }

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
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const ref = doc(db, 'articles', id)
    getDoc(ref).then(snap => {
      if (!snap.exists()) { navigate('/'); return }
      const data = { id: snap.id, ...snap.data() }
      setArticle(data)
      setLikeCount(data.likes || 0)
      if (user) {
        setLiked((data.likedBy || []).includes(user.uid))
        setBookmarked((data.bookmarkedBy || []).includes(user.uid))
      }
      setLoading(false)
      // increment views
      updateDoc(ref, { views: increment(1) }).catch(() => {})
    })
    // load comments
    getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc'))).then(snap=>{
      setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
  }, [id, user])

  const toggleLike = async () => {
    if (!user) return navigate('/auth')
    const ref = doc(db,'articles',id)
    if (liked) {
      await updateDoc(ref,{likes:increment(-1),likedBy:arrayRemove(user.uid)})
      setLikeCount(c=>c-1); setLiked(false)
    } else {
      await updateDoc(ref,{likes:increment(1),likedBy:arrayUnion(user.uid)})
      setLikeCount(c=>c+1); setLiked(true)
    }
  }

  const toggleBookmark = async () => {
    if (!user) return navigate('/auth')
    const ref = doc(db,'articles',id)
    if (bookmarked) {
      await updateDoc(ref,{bookmarkedBy:arrayRemove(user.uid)})
      setBookmarked(false)
    } else {
      await updateDoc(ref,{bookmarkedBy:arrayUnion(user.uid)})
      setBookmarked(true)
    }
  }

  const submitComment = async () => {
    if (!user || !comment.trim()) return
    setSubmitting(true)
    await addDoc(collection(db,'articles',id,'comments'),{
      text: comment.trim(),
      authorId: user.uid,
      authorName: profile?.name || user.email,
      authorPhoto: user.photoURL || null,
      createdAt: serverTimestamp()
    })
    setComment('')
    const snap = await getDocs(query(collection(db,'articles',id,'comments'),orderBy('createdAt','asc')))
    setComments(snap.docs.map(d=>({id:d.id,...d.data()})))
    setSubmitting(false)
  }

  const deleteComment = async (cid) => {
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db,'articles',id,'comments',cid))
    setComments(cs=>cs.filter(c=>c.id!==cid))
  }

  if (loading) return <PageWrapper><div className={styles.loading}>Loading...</div></PageWrapper>
  if (!article) return null

  const color = CAT_COLORS[article.category] || '#888'
  const label = CAT_LABELS[article.category] || article.category

  return (
    <PageWrapper>
      {/* Banner */}
      <div className={styles.banner} style={article.coverImage ? {} : { background: '#0d0d0d', minHeight: '320px' }}>
        {article.coverImage && <img src={article.coverImage} alt={article.title} className={styles.bannerImg} />}
        <div className={styles.bannerOverlay} />
        <div className={styles.bannerContent}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className={styles.catTag} style={{ color, borderColor: color }}>{label}</span>
          <h1 className={styles.title}>{article.title}</h1>
          {article.summary && <p className={styles.summary}>{article.summary}</p>}
          <div className={styles.metaRow}>
            <Link to={`/profile/${article.authorId}`} className={styles.author}>
              {article.authorPhoto
                ? <img src={article.authorPhoto} alt="" className={styles.authorAvatar} />
                : <span className={styles.authorInit}>{(article.authorName||'A')[0]}</span>}
              <span>{article.authorName}</span>
            </Link>
            <span className={styles.sep}>·</span>
            <span>{ago(article.publishedAt)}</span>
            <span className={styles.sep}>·</span>
            <span className={styles.readTime}><Clock size={12} /> {readTime(article.body)} min read</span>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className={styles.actionsBar}>
        <div className={styles.actionsInner}>
          <button className={`${styles.actionBtn} ${liked ? styles.liked : ''}`} onClick={toggleLike}>
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            <span>{likeCount}</span>
          </button>
          <button className={`${styles.actionBtn} ${bookmarked ? styles.saved : ''}`} onClick={toggleBookmark}>
            <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
          <span className={styles.commentCount}>
            <MessageSquare size={15} /> {comments.length} comments
          </span>
        </div>
      </div>

      {/* Body */}
      <article className={styles.article}>
        <div className={styles.body}>
          {article.body.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {/* Comments */}
        <div className={styles.comments}>
          <div className={styles.commentsHead}>
            <h3>Responses <span>({comments.length})</span></h3>
          </div>

          {user ? (
            <div className={styles.commentForm}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" className={styles.commentAvatar} />
                : <span className={styles.commentInit}>{(profile?.name||'U')[0]}</span>}
              <div className={styles.commentInput}>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="What do you think?"
                  rows={3}
                />
                <button onClick={submitComment} disabled={submitting || !comment.trim()} className={styles.submitComment}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.signInPrompt}>
              <Link to="/auth">Sign in</Link> to leave a response
            </div>
          )}

          <div className={styles.commentList}>
            {comments.map(c => (
              <div key={c.id} className={styles.commentItem}>
                {c.authorPhoto
                  ? <img src={c.authorPhoto} alt="" className={styles.commentAvatar} />
                  : <span className={styles.commentInit}>{(c.authorName||'A')[0]}</span>}
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <strong>{c.authorName}</strong>
                    <span>{ago(c.createdAt)}</span>
                    {(isAdmin || user?.uid === c.authorId) && (
                      <button className={styles.deleteComment} onClick={() => deleteComment(c.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className={styles.noComments}>No responses yet. Be the first.</div>
            )}
          </div>
        </div>
      </article>
    </PageWrapper>
  )
}
