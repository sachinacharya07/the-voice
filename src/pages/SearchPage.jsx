import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q')||'').trim()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(()=>{
    if(!q){ setResults([]); return }
    setLoading(true); setError('')
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      orderBy('publishedAt','desc'),
      limit(100)
    ))
    .then(snap=>{
      const all  = snap.docs.map(d=>({id:d.id,...d.data()}))
      const lower = q.toLowerCase()
      setResults(all.filter(a=>
        a.title?.toLowerCase().includes(lower)||
        a.summary?.toLowerCase().includes(lower)||
        a.body?.toLowerCase().includes(lower)||
        a.authorName?.toLowerCase().includes(lower)||
        (a.tags||[]).some(t=>t.toLowerCase().includes(lower))
      ))
    })
    .catch(()=>setError('Search failed. Try again.'))
    .finally(()=>setLoading(false))
  },[q])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{borderColor:'#888'}}>
          <span style={{fontFamily:'var(--serif)',fontSize:'22px',fontWeight:700}}>
            {q ? `"${q}"` : 'Search'}
          </span>
          {!loading && q && <p className={styles.count}>{results.length} result{results.length!==1?'s':''}</p>}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {!q
          ? <div className={styles.empty}>Use the search bar above to find articles.</div>
          : loading
            ? <div className={styles.grid}>{[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
            : results.length===0
              ? <div className={styles.empty}>No articles found for "{q}"</div>
              : <div className={styles.grid}>{results.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        }
      </div>
    </PageWrapper>
  )
}
