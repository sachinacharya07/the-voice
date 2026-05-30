import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!q) { setLoading(false); return }
    getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc')))
      .then(snap => {
        const all = snap.docs.map(d=>({id:d.id,...d.data()}))
        const lower = q.toLowerCase()
        setResults(all.filter(a =>
          a.title?.toLowerCase().includes(lower) ||
          a.summary?.toLowerCase().includes(lower) ||
          a.body?.toLowerCase().includes(lower) ||
          a.authorName?.toLowerCase().includes(lower)
        ))
        setLoading(false)
      })
  }, [q])

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{ borderColor: '#888' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 700 }}>
            {q ? `Results for "${q}"` : 'Search'}
          </span>
          {!loading && <p className={styles.count}>{results.length} {results.length === 1 ? 'result' : 'results'}</p>}
        </div>
        {loading ? <div className={styles.grid}>{[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
          : results.length === 0 ? <div className={styles.empty}>No articles found for "{q}"</div>
          : <div className={styles.grid}>{results.map(a=><ArticleCard key={a.id} article={a}/>)}</div>}
      </div>
    </PageWrapper>
  )
}
