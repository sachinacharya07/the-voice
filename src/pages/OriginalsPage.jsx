import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function OriginalsPage(){
  const [articles,setArticles]=useState([])
  const [all,setAll]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'),limit(50)))
      .then(snap=>{
        const arts=snap.docs.map(d=>({id:d.id,...d.data()}))
        const tagged=arts.filter(a=>a.isOriginal)
        setArticles(tagged.length>0?tagged:arts)
        setAll(arts)
      })
      .finally(()=>setLoading(false))
  },[])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.catHead}>
          <span className={styles.catLabel} style={{background:'#0d0d0d',color:'#fff'}}>
            Exclusive
          </span>
          <h1 className={styles.catTitle}>The Voice Originals</h1>
          <p className={styles.catDesc}>In-depth investigations, long-form features, and exclusive reporting.</p>
        </div>
        {loading?(
          <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
        ):articles.length===0?(
          <p className={styles.empty}>No articles yet.</p>
        ):(
          <div className={styles.grid}>
            {articles.map(a=><ArticleCard key={a.id} article={a}/>)}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
