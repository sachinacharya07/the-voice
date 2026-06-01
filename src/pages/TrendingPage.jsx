import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function TrendingPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(()=>{
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      orderBy('likes','desc'),
      limit(20)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>setError('Failed to load. Check your connection.'))
    .finally(()=>setLoading(false))
  },[])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{borderColor:'#c0392b'}}>
          <span className={styles.catTag} style={{background:'#c0392b'}}>Trending</span>
          <p className={styles.count}>Most liked articles</p>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {loading
          ? <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
          : articles.length===0
            ? <div className={styles.empty}>No articles yet.</div>
            : <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        }
      </div>
    </PageWrapper>
  )
}
