import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './CategoryPage.module.css'

const CAT_LABELS={school:'School & College',science:'Science & Technology',sports:'Sports',arts:'Arts & Culture',world:'World News',opinion:'Opinion & Editorial'}
const CAT_COLORS={school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b'}

export default function CategoryPage() {
  const { cat } = useParams()
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(()=>{
    setLoading(true); setArticles([]); setError('')
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      where('category','==',cat),
      orderBy('publishedAt','desc'),
      limit(30)
    ))
    .then(snap=>setArticles(snap.docs.map(d=>({id:d.id,...d.data()}))))
    .catch(()=>setError('Failed to load articles. Check your connection.'))
    .finally(()=>setLoading(false))
  },[cat])

  const color = CAT_COLORS[cat]||'#888'
  const label = CAT_LABELS[cat]||cat

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.hero} style={{borderColor:color}}>
          <span className={styles.catTag} style={{background:color}}>{label}</span>
          {!loading && <p className={styles.count}>{articles.length} article{articles.length!==1?'s':''}</p>}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {loading
          ? <div className={styles.grid}>{[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
          : articles.length===0
            ? <div className={styles.empty}>No articles in this section yet.</div>
            : <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
        }
      </div>
    </PageWrapper>
  )
}
