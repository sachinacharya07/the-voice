import { Link } from 'react-router-dom'
import { Heart, Clock } from 'lucide-react'
import styles from './ArticleCard.module.css'

const CAT_COLORS = {
  school: '#185FA5', science: '#0F6E56', sports: '#854F0B',
  arts: '#993556', world: '#444441', opinion: '#c0392b'
}
const CAT_LABELS = {
  school: 'School & College', science: 'Science & Tech', sports: 'Sports',
  arts: 'Arts & Culture', world: 'World', opinion: 'Opinion'
}

function readTime(body = '') {
  const words = body.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function ArticleCard({ article, featured = false }) {
  const color = CAT_COLORS[article.category] || '#888'
  const label = CAT_LABELS[article.category] || article.category

  return (
    <Link to={`/article/${article.id}`} className={`${styles.card} ${featured ? styles.featured : ''}`}>
      {article.coverImage && (
        <div className={styles.imgWrap}>
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            decoding="async"
            onLoad={e => e.target.classList.add(styles.imgLoaded)}
            className={styles.imgLazy}
          />
        </div>
      )}
      <div className={styles.body}>
        <span className={styles.cat} style={{ color, borderColor: color }}>{label}</span>
        <h2 className={styles.hed}>{article.title}</h2>
        {article.summary && <p className={styles.dek}>{article.summary}</p>}
        <div className={styles.meta}>
          <span className={styles.author}>
            {article.authorPhoto
              ? <img src={article.authorPhoto} alt="" className={styles.authorAvatar} />
              : <span className={styles.authorInitial}>{(article.authorName || 'A')[0]}</span>
            }
            <Link to={`/profile/${article.authorId}`} className={styles.authorName}
              onClick={e => e.stopPropagation()}>{article.authorName}</Link>
          </span>
          <span className={styles.dot}>·</span>
          <span className={styles.time}>{ago(article.publishedAt)}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.readTime}><Clock size={11} />{readTime(article.body)} min</span>
          {article.likes > 0 && (
            <><span className={styles.dot}>·</span>
            <span className={styles.likes}><Heart size={11} />{article.likes}</span></>
          )}
        </div>
      </div>
    </Link>
  )
}

function ago(ts) {
  if (!ts) return 'Just now'
  const d = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (d < 60) return 'Just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
