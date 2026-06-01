import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import HomePoll from '../components/HomePoll'
import NewsletterSignup from '../components/NewsletterSignup'
import styles from './Home.module.css'

const CAT_LABELS={school:'School & College',science:'Science & Tech',sports:'Sports',arts:'Arts & Culture',world:'World',opinion:'Opinion'}
const CAT_COLORS={school:'#185FA5',science:'#0F6E56',sports:'#854F0B',arts:'#993556',world:'#444441',opinion:'#c0392b'}

function readTime(body=''){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/200))}
function ago(ts){
  if(!ts)return'Just now'
  const d=Math.floor((Date.now()-ts.toDate().getTime())/1000)
  if(d<60)return'Just now'
  if(d<3600)return`${Math.floor(d/60)}m ago`
  if(d<86400)return`${Math.floor(d/3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})
}

// Simple in-memory cache so navigating back doesn't re-fetch
let homeCache = null
let homeCacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export default function Home() {
  const [articles, setArticles] = useState(homeCache || [])
  const [loading, setLoading]   = useState(!homeCache)

  useEffect(()=>{
    const now = Date.now()
    if(homeCache && (now - homeCacheTime) < CACHE_TTL) {
      setArticles(homeCache)
      setLoading(false)
      return
    }
    getDocs(query(
      collection(db,'articles'),
      where('status','==','published'),
      orderBy('publishedAt','desc'),
      limit(16)
    )).then(snap=>{
      const arts = snap.docs.map(d=>({id:d.id,...d.data()}))
      homeCache = arts
      homeCacheTime = Date.now()
      setArticles(arts)
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[])

  if(loading) return(
    <PageWrapper>
      <div className={styles.skeletonWrap}>
        <div className={styles.skeletonHero}/>
        <div className={styles.skeletonGrid}>
          {[...Array(4)].map((_,i)=><div key={i} className={styles.skeleton}/>)}
        </div>
      </div>
    </PageWrapper>
  )

  const hero      = articles[0]
  const secondary = articles.slice(1,4)
  const rest      = articles.slice(4)

  return(
    <PageWrapper>
      {articles.length>0&&(
        <div className={styles.ticker}>
          <span className={styles.tickerLabel}>Latest</span>
          <span className={styles.tickerText}>{articles[0]?.title}</span>
        </div>
      )}

      <div className={styles.container}>
        {articles.length===0?(
          <div className={styles.empty}>
            <h2>No articles yet</h2>
            <p>Be the first to write something.</p>
            <Link to="/write" className={styles.emptyBtn}>Write an article</Link>
          </div>
        ):(
          <>
            {hero&&(
              <section className={styles.heroSection}>
                <Link to={`/article/${hero.id}`} className={styles.heroCard}>
                  {hero.coverImage?(
                    <div className={styles.heroImg}>
                      <img src={hero.coverImage} alt={hero.title} loading="lazy"/>
                      <div className={styles.heroOverlay}/>
                      <div className={styles.heroTextOverlay}>
                        <span className={styles.cat} style={{color:CAT_COLORS[hero.category],borderColor:CAT_COLORS[hero.category]}}>{CAT_LABELS[hero.category]}</span>
                        <h1 className={styles.heroHed}>{hero.title}</h1>
                        {hero.summary&&<p className={styles.heroDek}>{hero.summary}</p>}
                        <div className={styles.heroMeta}>
                          <span>By <strong>{hero.authorName}</strong></span>
                          <span>·</span><span>{ago(hero.publishedAt)}</span>
                          <span>·</span><span>{readTime(hero.body)} min</span>
                        </div>
                      </div>
                    </div>
                  ):(
                    <div className={styles.heroNoImg}>
                      <span className={styles.cat} style={{color:CAT_COLORS[hero.category],borderColor:CAT_COLORS[hero.category]}}>{CAT_LABELS[hero.category]}</span>
                      <h1 className={styles.heroHedDark}>{hero.title}</h1>
                      {hero.summary&&<p className={styles.heroDekDark}>{hero.summary}</p>}
                      <div className={styles.heroMetaDark}>
                        <span>By <strong>{hero.authorName}</strong></span>
                        <span>·</span><span>{ago(hero.publishedAt)}</span>
                      </div>
                    </div>
                  )}
                </Link>
                <div className={styles.secondaryStack}>
                  {secondary.map(a=>(
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.stackCard}>
                      {a.coverImage&&<div className={styles.stackImg}><img src={a.coverImage} alt="" loading="lazy"/></div>}
                      <div className={styles.stackBody}>
                        <span className={styles.catSmall} style={{color:CAT_COLORS[a.category]}}>{CAT_LABELS[a.category]}</span>
                        <h3 className={styles.stackHed}>{a.title}</h3>
                        <div className={styles.stackMeta}>{ago(a.publishedAt)} · {readTime(a.body)} min</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <HomePoll/>

            <NewsletterSignup/>

            {rest.length>0&&(
              <section>
                <div className={styles.sectionHead}><h2>More Stories</h2></div>
                <div className={styles.grid}>
                  {rest.map(a=><ArticleCard key={a.id} article={a}/>)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
