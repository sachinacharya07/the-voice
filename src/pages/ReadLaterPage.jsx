import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function ReadLaterPage() {
  const { user } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(()=>{
    if(!user){ setLoading(false); return }
    getDocs(query(
      collection(db,'articles'),
      where('bookmarkedBy','array-contains',user.uid),
      where('status','==','published'),
      limit(50)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>setError('Failed to load saved articles.'))
    .finally(()=>setLoading(false))
  },[user])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{borderColor:'#0d0d0d'}}>
          <span className={styles.catTag} style={{background:'#0d0d0d'}}>Saved</span>
          {!loading && <p className={styles.count}>{articles.length} saved article{articles.length!==1?'s':''}</p>}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {loading
          ? <div className={styles.grid}>{[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
          : articles.length===0
            ? <div className={styles.empty}>No saved articles yet. Tap the bookmark icon on any article.</div>
            : <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        }
      </div>
    </PageWrapper>
  )
}
