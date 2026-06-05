import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function BPlusPage(){
  const [articles,setArticles]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'),limit(30)))
      .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .finally(()=>setLoading(false))
  },[])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.catHead}>
          <span className={styles.catLabel} style={{background:'#0F6E56',color:'#fff'}}>Good News</span>
          <h1 className={styles.catTitle}>B+</h1>
          <p className={styles.catDesc}>Positive stories, feel-good news, and reasons to smile — because not everything is doom and gloom.</p>
        </div>
        {loading?(
          <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
        ):articles.length===0?(
          <p className={styles.empty}>No B+ stories yet.</p>
        ):(
          <div className={styles.grid}>
            {articles.map(a=><ArticleCard key={a.id} article={a}/>)}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
