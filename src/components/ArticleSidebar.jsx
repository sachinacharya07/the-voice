import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import NewsletterSignup from './NewsletterSignup'
import styles from './ArticleSidebar.module.css'

function ago(ts) {
  if (!ts) return ''
  const d = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function ArticleSidebar({ currentId, category }) {
  const [mostRead, setMostRead] = useState([])
  const [latest,  setLatest]   = useState([])
  const [related, setRelated]  = useState([])

  useEffect(() => {
    // Most read
    getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('views','desc'),limit(5)))
      .then(s => setMostRead(s.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.id!==currentId).slice(0,4)))
      .catch(() => {})

    // Latest
    getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'),limit(6)))
      .then(s => setLatest(s.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.id!==currentId).slice(0,4)))
      .catch(() => {})

    // Related (same category)
    if (category) {
      getDocs(query(collection(db,'articles'),where('status','==','published'),where('category','==',category),orderBy('publishedAt','desc'),limit(6)))
        .then(s => setRelated(s.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.id!==currentId).slice(0,3)))
        .catch(() => {})
    }
  }, [currentId, category])

  return (
    <aside className={styles.sidebar}>
      {/* Newsletter compact */}
      <NewsletterSignup compact/>

      {/* Most Read */}
      {mostRead.length > 0 && (
        <div className={styles.widget}>
          <div className={styles.widgetHead}><span>Most Read</span></div>
          <div className={styles.list}>
            {mostRead.map((a, i) => (
              <Link key={a.id} to={`/article/${a.id}`} className={styles.item}>
                <span className={styles.rank}>{i + 1}</span>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{a.title}</p>
                  <span className={styles.itemMeta}>{a.views || 0} views</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <div className={styles.widget}>
          <div className={styles.widgetHead}><span>Latest</span></div>
          <div className={styles.list}>
            {latest.map(a => (
              <Link key={a.id} to={`/article/${a.id}`} className={styles.item}>
                {a.coverImage && <img src={a.coverImage} alt="" className={styles.thumb} loading="lazy"/>}
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{a.title}</p>
                  <span className={styles.itemMeta}>{ago(a.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className={styles.widget}>
          <div className={styles.widgetHead}><span>More Like This</span></div>
          <div className={styles.list}>
            {related.map(a => (
              <Link key={a.id} to={`/article/${a.id}`} className={styles.item}>
                {a.coverImage && <img src={a.coverImage} alt="" className={styles.thumb} loading="lazy"/>}
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{a.title}</p>
                  <span className={styles.itemMeta}>By {a.authorName}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
