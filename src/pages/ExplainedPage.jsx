import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function ExplainedPage(){
  const [articles,setArticles]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    // Only fetch articles explicitly tagged for this section
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      where('isExplained','==',true),
      orderBy('publishedAt','desc'),
      limit(50)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>{
      // Firestore may need an index — falls back gracefully
      setArticles([])
    })
    .finally(()=>setLoading(false))
  },[])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.catHead}>
          <span className={styles.catLabel} style={{background:'#185FA5',color:'#fff'}}>
            Q&A
          </span>
          <h1 className={styles.catTitle}>Explained</h1>
          <p className={styles.catDesc}>Simple answers to complex questions — with timelines, illustrations, and context.</p>
        </div>
        {loading?(
          <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
        ):articles.length===0?(
          <p className={styles.empty}>No Explained articles yet. Writers can tag articles as Explained from the Write page.</p>
        ):(
          <div className={styles.grid}>
            {articles.map(a=><ArticleCard key={a.id} article={a}/>)}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
