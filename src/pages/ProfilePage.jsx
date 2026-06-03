import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import styles from './ProfilePage.module.css'
import NotificationSettings from '../components/NotificationSettings'

export default function ProfilePage() {
  const { uid } = useParams()
  const [profile, setProfile]   = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(()=>{
    if(!uid){ setLoading(false); return }
    Promise.all([
      getDoc(doc(db,'users',uid)),
      getDocs(query(
        collection(db,'articles'),
        where('authorId','==',uid),
        where('status','==','published'),
        orderBy('publishedAt','desc'),
        limit(30)
      ))
    ])
    .then(([userSnap,artSnap])=>{
      if(userSnap.exists()) setProfile(userSnap.data())
      setArticles(artSnap.docs.map(d=>({id:d.id,...d.data()})))
    })
    .catch(()=>setError('Failed to load profile.'))
    .finally(()=>setLoading(false))
  },[uid])

  if(loading) return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.skeleton} style={{height:'120px',marginBottom:'2rem'}}/>
        <div className={styles.grid}>{[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton} style={{height:'240px'}}/>)}</div>
      </div>
    </PageWrapper>
  )

  if(error||!profile) return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.empty}>{error||'User not found.'}</div>
      </div>
    </PageWrapper>
  )

  const totalLikes = articles.reduce((s,a)=>s+(a.likes||0),0)
  const totalViews = articles.reduce((s,a)=>s+(a.views||0),0)

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.profileHero}>
          {profile.photo
            ?<img src={profile.photo} alt={profile.name} className={styles.avatar} referrerPolicy="no-referrer"/>
            :<span className={styles.avatarInit}>{(profile.name||'U')[0]}</span>}
          <div className={styles.profileInfo}>
            <h1>{profile.name}</h1>
            <p className={styles.role}>{profile.role||'Reader'}</p>
            <div className={styles.stats}>
              <div className={styles.stat}><strong>{articles.length}</strong><span>Articles</span></div>
              <div className={styles.stat}><strong>{totalLikes}</strong><span>Likes</span></div>
              <div className={styles.stat}><strong>{totalViews}</strong><span>Views</span></div>
            </div>
          </div>
        </div>
        {articles.length>0&&(
          <>
            <div className={styles.sectionHead}><h2>Articles by {profile.name}</h2></div>
            <div className={styles.grid}>{articles.map(a=><ArticleCard key={a.id} article={a}/>)}</div>
          </>
        )}
        {articles.length===0&&<div className={styles.empty}>No published articles yet.</div>}

        <div className={styles.sectionHead} style={{marginTop:'2.5rem'}}><h2>Notification Settings</h2></div>
        <NotificationSettings/>
      </div>
    </PageWrapper>
  )
}
// Note: NotificationSettings import added at top of file separately
