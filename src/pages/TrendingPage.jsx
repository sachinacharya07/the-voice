import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function TrendingPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      orderBy('likes','desc'),
      limit(20)
    )).then(snap => {
      setArticles(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
  }, [])

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{ borderColor: '#c0392b' }}>
          <span style={{ fontFamily:'var(--serif)',fontSize:'28px',fontWeight:700,background:'#c0392b',color:'white',padding:'4px 16px',borderRadius:'3px' }}>
            Trending
          </span>
          <p className={styles.count}>Most liked articles</p>
        </div>
        {loading ? <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
          : articles.length === 0 ? <div className={styles.empty}>No articles yet.</div>
          : <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>}
      </div>
    </PageWrapper>
  )
}
