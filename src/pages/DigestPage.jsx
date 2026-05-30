import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PageWrapper from '../components/PageWrapper'
import styles from './DigestPage.module.css'

const CAT_LABELS={school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion'}
const CAT_COLORS={school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b'}

function ago(ts){
  if(!ts)return'Just now'
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
}

export default function DigestPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7*24*60*60*1000)

  useEffect(()=>{
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      orderBy('publishedAt','desc'),
      limit(20)
    )).then(snap=>{
      setArticles(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
  },[])

  const thisWeek = articles.filter(a=>{
    if(!a.publishedAt)return false
    return a.publishedAt.toDate()>=weekStart
  })
  const topLiked = [...articles].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3)
  const byCategory = {}
  thisWeek.forEach(a=>{if(!byCategory[a.category])byCategory[a.category]=[];byCategory[a.category].push(a)})

  const week = `${weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${now.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.masthead}>
          <div className={styles.vol}>This Week in The Voice</div>
          <h1>Weekly Digest</h1>
          <p>{week}</p>
        </div>

        {loading?<div className={styles.loading}>Loading...</div>:(
          <>
            {thisWeek.length===0?(
              <div className={styles.empty}>No articles published this week yet.</div>
            ):(
              <>
                {/* Top story */}
                {thisWeek[0]&&(
                  <section className={styles.topStory}>
                    <div className={styles.sectionLabel}>Top Story</div>
                    <Link to={`/article/${thisWeek[0].id}`} className={styles.topCard}>
                      {thisWeek[0].coverImage&&<img src={thisWeek[0].coverImage} alt="" className={styles.topImg}/>}
                      <div className={styles.topBody}>
                        <span className={styles.cat} style={{color:CAT_COLORS[thisWeek[0].category]}}>{CAT_LABELS[thisWeek[0].category]}</span>
                        <h2>{thisWeek[0].title}</h2>
                        <p>{thisWeek[0].summary}</p>
                        <div className={styles.byline}>By {thisWeek[0].authorName} · {ago(thisWeek[0].publishedAt)}</div>
                      </div>
                    </Link>
                  </section>
                )}

                {/* This week by category */}
                {Object.entries(byCategory).map(([cat,arts])=>(
                  <section key={cat} className={styles.catSection}>
                    <div className={styles.catHead} style={{borderColor:CAT_COLORS[cat]}}>
                      <span style={{color:CAT_COLORS[cat]}}>{CAT_LABELS[cat]}</span>
                    </div>
                    <div className={styles.catList}>
                      {arts.map(a=>(
                        <Link key={a.id} to={`/article/${a.id}`} className={styles.digestItem}>
                          <div className={styles.digestBody}>
                            <h3>{a.title}</h3>
                            <span>By {a.authorName} · {ago(a.publishedAt)}</span>
                          </div>
                          {a.coverImage&&<img src={a.coverImage} alt="" className={styles.digestThumb}/>}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}

                {/* Most liked */}
                {topLiked.length>0&&(
                  <section className={styles.catSection}>
                    <div className={styles.catHead} style={{borderColor:'var(--red)'}}>
                      <span style={{color:'var(--red)'}}>Most Liked This Week</span>
                    </div>
                    <div className={styles.catList}>
                      {topLiked.map((a,i)=>(
                        <Link key={a.id} to={`/article/${a.id}`} className={styles.digestItem}>
                          <span className={styles.rank}>#{i+1}</span>
                          <div className={styles.digestBody}>
                            <h3>{a.title}</h3>
                            <span>❤ {a.likes||0} likes · By {a.authorName}</span>
                          </div>
                          {a.coverImage&&<img src={a.coverImage} alt="" className={styles.digestThumb}/>}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
