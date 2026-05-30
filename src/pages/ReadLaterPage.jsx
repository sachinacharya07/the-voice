import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

export default function ReadLaterPage() {
  const { user } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    if(!user)return
    getDocs(query(collection(db,'articles'),where('bookmarkedBy','array-contains',user.uid),where('status','==','published')))
      .then(snap=>{
        setArticles(snap.docs.map(d=>({id:d.id,...d.data()})))
        setLoading(false)
      })
  },[user])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{borderColor:'#888'}}>
          <span style={{fontFamily:'var(--serif)',fontSize:'28px',fontWeight:700,background:'#0d0d0d',color:'white',padding:'4px 16px',borderRadius:'3px'}}>Saved</span>
          <p className={styles.count}>{articles.length} saved articles</p>
        </div>
        {loading?<div className={styles.grid}>{[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
        :articles.length===0?<div className={styles.empty}>You haven't saved any articles yet. Tap the bookmark icon on any article.</div>
        :<div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>}
      </div>
    </PageWrapper>
  )
}
