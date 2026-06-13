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

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ArticleSidebar({ currentId, category }) {
  const [latest,   setLatest]   = useState([])
  const [moreLike, setMoreLike] = useState([])
  const [mostRead, setMostRead] = useState([])

  useEffect(() => {
    // Fetch a larger pool to work with
    Promise.all([
      getDocs(query(collection(db,'articles'), where('status','==','published'), orderBy('publishedAt','desc'), limit(20))),
      getDocs(query(collection(db,'articles'), where('status','==','published'), orderBy('views','desc'), limit(6))),
    ]).then(([allSnap, popularSnap]) => {
      const all = allSnap.docs.map(d => ({id:d.id,...d.data()})).filter(a => a.id !== currentId)
      const popular = popularSnap.docs.map(d => ({id:d.id,...d.data()})).filter(a => a.id !== currentId)

      // Latest: most recent 4
      const latestList = all.slice(0, 4)
      setLatest(latestList)

      // Most read
      setMostRead(popular.slice(0, 4))

      // More Like This: same category first, then shuffle rest
      // Crucially: exclude articles already in latestList
      const latestIds = new Set(latestList.map(a => a.id))
      const sameCategory = all.filter(a => a.category === category && !latestIds.has(a.id))
      const otherCategory = all.filter(a => a.category !== category && !latestIds.has(a.id))

      // Shuffle both pools for randomness on each page load
      const shuffledSame  = shuffle(sameCategory)
      const shuffledOther = shuffle(otherCategory)

      // Take same-category first, fill remainder with others
      const moreLikeList = [...shuffledSame, ...shuffledOther].slice(0, 4)

      // If still empty (only 1 article exists), show shuffled all
      if (moreLikeList.length === 0) {
        setMoreLike(shuffle(all).slice(0, 4))
      } else {
        setMoreLike(moreLikeList)
      }
    }).catch(() => {})
  }, [currentId, category])

  return (
    <aside className={styles.sidebar}>
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

      {/* More Like This — different from Latest, shuffled each load */}
      {moreLike.length > 0 && (
        <div className={styles.widget}>
          <div className={styles.widgetHead}><span>More Like This</span></div>
          <div className={styles.list}>
            {moreLike.map(a => (
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
