import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { uid } = useParams()
  const [profile, setProfile] = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDoc(doc(db,'users',uid)),
      getDocs(query(collection(db,'articles'),where('authorId','==',uid),where('status','==','published'),orderBy('publishedAt','desc')))
    ]).then(([userSnap, artSnap]) => {
      if (userSnap.exists()) setProfile(userSnap.data())
      setArticles(artSnap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
  }, [uid])

  if (loading) return <PageWrapper><div style={{textAlign:'center',padding:'4rem',color:'var(--mid)'}}>Loading...</div></PageWrapper>
  if (!profile) return <PageWrapper><div style={{textAlign:'center',padding:'4rem',color:'var(--mid)'}}>User not found.</div></PageWrapper>

  const totalLikes = articles.reduce((s,a)=>s+(a.likes||0),0)
  const totalViews = articles.reduce((s,a)=>s+(a.views||0),0)

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.profileHero}>
          {profile.photo
            ? <img src={profile.photo} alt="" className={styles.avatar} />
            : <span className={styles.avatarInit}>{(profile.name||'U')[0]}</span>}
          <div className={styles.profileInfo}>
            <h1>{profile.name}</h1>
            <p className={styles.role}>{profile.role || 'Reader'}</p>
            <div className={styles.stats}>
              <div className={styles.stat}><strong>{articles.length}</strong><span>Articles</span></div>
              <div className={styles.stat}><strong>{totalLikes}</strong><span>Likes</span></div>
              <div className={styles.stat}><strong>{totalViews}</strong><span>Views</span></div>
            </div>
          </div>
        </div>

        {articles.length > 0 && (
          <>
            <div className={styles.sectionHead}><h2>Articles by {profile.name}</h2></div>
            <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
          </>
        )}
        {articles.length === 0 && (
          <div className={styles.empty}>No published articles yet.</div>
        )}
      </div>
    </PageWrapper>
  )
}
