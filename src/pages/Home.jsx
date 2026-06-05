import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import HomePoll from '../components/HomePoll'
import NewsletterSignup from '../components/NewsletterSignup'
import styles from './Home.module.css'

const CAT_LABELS = { school:'School & College', science:'Science & Tech', sports:'Sports', arts:'Arts & Culture', world:'World', opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5', science:'#0F6E56', sports:'#854F0B', arts:'#993556', world:'#444441', opinion:'#c0392b' }

function readTime(body=''){return Math.max(1,Math.ceil(body.trim().split(/\s+/).length/200))}
function ago(ts){
  if(!ts)return'Just now'
  const d=Math.floor((Date.now()-ts.toDate().getTime())/1000)
  if(d<60)return'Just now'
  if(d<3600)return`${Math.floor(d/60)}m ago`
  if(d<86400)return`${Math.floor(d/3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'short'})
}
function todayStr(){
  return new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
}

let homeCache=null, homeCacheTime=0
const CACHE_TTL=2*60*1000

function CatBadge({cat,light=false}){
  const color=CAT_COLORS[cat]||'#888'
  const label=CAT_LABELS[cat]||cat
  if(light) return <span className={styles.cat} style={{color:'#fff',borderColor:'rgba(255,255,255,0.45)'}}>{label}</span>
  return <span className={styles.cat} style={{color,borderColor:color}}>{label}</span>
}

function SectionStrip({title,badge,badgeColor,seeAllTo,children}){
  return(
    <div className={styles.editorialStrip}>
      <div className={styles.stripHead}>
        <div className={styles.stripTitle}>
          <h2>{title}</h2>
          {badge&&<span className={styles.stripBadge} style={{background:badgeColor||'var(--black)',color:'#fff'}}>{badge}</span>}
        </div>
        <div className={styles.stripDivider}/>
        {seeAllTo&&<Link to={seeAllTo} className={styles.stripSeeAll}>See all →</Link>}
      </div>
      {children}
    </div>
  )
}

export default function Home(){
  const [articles,setArticles]=useState(homeCache||[])
  const [epapers,setEpapers]=useState([])
  const [loading,setLoading]=useState(!homeCache)

  useEffect(()=>{
    const now=Date.now()
    const fetchArticles = homeCache&&(now-homeCacheTime)<CACHE_TTL
      ? Promise.resolve(homeCache)
      : getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('publishedAt','desc'),limit(24)))
          .then(snap=>{
            const arts=snap.docs.map(d=>({id:d.id,...d.data()}))
            homeCache=arts; homeCacheTime=Date.now()
            return arts
          })
    const fetchEpapers=getDocs(query(collection(db,'epapers'),orderBy('publishedAt','desc'),limit(3)))
      .then(snap=>snap.docs.map(d=>({id:d.id,...d.data()})))
      .catch(()=>[])
    const fetchPinned=getDoc(doc(db,'settings','pinnedHero'))
      .then(snap=>snap.exists()?snap.data().articleId:null)
      .catch(()=>null)
    Promise.all([fetchArticles,fetchEpapers,fetchPinned])
      .then(([arts,eps,pinnedId])=>{
        if(pinnedId){
          const idx=arts.findIndex(a=>a.id===pinnedId)
          if(idx>0){ const pinned=arts.splice(idx,1); arts.unshift(pinned[0]) }
        }
        setArticles(arts); setEpapers(eps)
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
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
  const midRow    = articles.slice(4,7)
  const opinions  = articles.filter(a=>a.category==='opinion').slice(0,3)
  const originals = articles.filter(a=>a.isOriginal||a.isLongform).slice(0,3)
    .concat(articles.slice(0,3)).slice(0,3)  // fallback to recent
  const explained = articles.filter(a=>a.isExplained).slice(0,3)
    .concat(articles.slice(0,3)).slice(0,3)
  const bplus     = articles.filter(a=>a.isBplus||a.isPositive).slice(0,4)
    .concat(articles.slice(0,4)).slice(0,4)
  const trending  = articles.slice(0,5)
  const more      = articles.slice(7,15)

  return(
    <PageWrapper>
      {articles.length>0&&(
        <div className={styles.ticker}>
          <span className={styles.tickerLabel}>Latest</span>
          <span className={styles.tickerText}>{articles[0]?.title}</span>
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.dateline}>
          <div className={styles.datelineLeft}>
            <span className={styles.datelineDot}>◆</span>
            <span>{todayStr()}</span>
          </div>
          <span className={styles.editionBadge}>The Voice</span>
        </div>

        {articles.length===0?(
          <div className={styles.empty}>
            <h2>No articles yet</h2>
            <p>Be the first to write something.</p>
            <Link to="/write" className={styles.emptyBtn}>Write an article</Link>
          </div>
        ):(
          <>
            {/* ── HERO + SECONDARY STACK ── */}
            {hero&&(
              <section className={styles.heroSection}>
                <Link to={`/article/${hero.id}`} className={styles.heroLeft}>
                  {hero.coverImage?(
                    <div className={styles.heroImg}>
                      <img src={hero.coverImage} alt={hero.title} loading="eager"/>
                      <div className={styles.heroGradient}/>
                      <div className={styles.heroOverlayText}>
                        <CatBadge cat={hero.category} light/>
                        <h1 className={styles.heroHed}>{hero.title}</h1>
                        {hero.summary&&<p className={styles.heroDek}>{hero.summary}</p>}
                        <div className={styles.heroMetaLight}>
                          <strong>{hero.authorName}</strong>
                          <span>·</span><span>{ago(hero.publishedAt)}</span>
                          <span>·</span><span>{readTime(hero.body)} min read</span>
                        </div>
                      </div>
                    </div>
                  ):(
                    <div className={styles.heroNoImg}>
                      <CatBadge cat={hero.category}/>
                      <h1 className={styles.heroHedDark}>{hero.title}</h1>
                      {hero.summary&&<p className={styles.heroDekDark}>{hero.summary}</p>}
                      <div className={styles.heroMetaDark}>
                        <strong>{hero.authorName}</strong>
                        <span>·</span><span>{ago(hero.publishedAt)}</span>
                      </div>
                    </div>
                  )}
                </Link>
                <div className={styles.secondaryStack}>
                  {secondary.map(a=>(
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.stackCard}>
                      <div className={styles.stackAccent}/>
                      {a.coverImage&&<div className={styles.stackImg}><img src={a.coverImage} alt="" loading="lazy"/></div>}
                      <CatBadge cat={a.category}/>
                      <h3 className={styles.stackHed}>{a.title}</h3>
                      <div className={styles.stackMeta}>{ago(a.publishedAt)} · {readTime(a.body)} min</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── MID ROW ── */}
            {midRow.length>0&&(
              <div className={styles.midRow}>
                {midRow.map(a=>(
                  <div key={a.id} className={styles.midCol}>
                    <Link to={`/article/${a.id}`} className={styles.midLink}>
                      {a.coverImage&&<div className={styles.midImg}><img src={a.coverImage} alt="" loading="lazy"/></div>}
                      <CatBadge cat={a.category}/>
                      <h2 className={styles.midHed}>{a.title}</h2>
                      {a.summary&&<p className={styles.midDek}>{a.summary}</p>}
                      <div className={styles.midMeta}>{a.authorName} · {ago(a.publishedAt)}</div>
                    </Link>
                  </div>
                ))}
                <div className={styles.opinionSidebar}>
                  <div className={styles.sidebarHead}>Opinion</div>
                  {(opinions.length>0?opinions:articles.slice(7,10)).map(a=>(
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.opinionItem}>
                      <div className={styles.opinionHed}>{a.title}</div>
                      <div className={styles.opinionAuthor}>{a.authorName}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── POLL ── */}
            <HomePoll/>

            {/* ── ORIGINALS ── */}
            <SectionStrip title="The Voice Originals" badge="Exclusive" badgeColor="#0d0d0d" seeAllTo="/originals">
              <div className={styles.originalsGrid}>
                {originals[0]&&(
                  <Link to={`/article/${originals[0].id}`} className={styles.origFeatured}>
                    {originals[0].coverImage&&(
                      <div className={styles.origFeatImg}><img src={originals[0].coverImage} alt="" loading="lazy"/></div>
                    )}
                    <div className={styles.origFeatBody}>
                      <CatBadge cat={originals[0].category}/>
                      <h2 className={styles.origFeatHed}>{originals[0].title}</h2>
                      {originals[0].summary&&<p className={styles.origFeatDek}>{originals[0].summary}</p>}
                      <div className={styles.midMeta}>{originals[0].authorName} · {readTime(originals[0].body)} min read</div>
                    </div>
                  </Link>
                )}
                <div className={styles.origStack}>
                  {originals.slice(1).map(a=>(
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.origSmall}>
                      <CatBadge cat={a.category}/>
                      <h3 className={styles.origSmallHed}>{a.title}</h3>
                      <div className={styles.midMeta}>{a.authorName} · {ago(a.publishedAt)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </SectionStrip>

            {/* ── EXPLAINED ── */}
            <SectionStrip title="Explained" badge="Q&A" badgeColor="#185FA5" seeAllTo="/explained">
              <div className={styles.explainedRow}>
                {explained.map(a=>(
                  <Link key={a.id} to={`/article/${a.id}`} className={styles.explainCard}>
                    <div className={styles.explainImg}>
                      {a.coverImage
                        ? <img src={a.coverImage} alt="" loading="lazy"/>
                        : <span className={styles.explainImgPlaceholder}>?</span>
                      }
                      <span className={styles.explainQBadge}>Explained</span>
                    </div>
                    <div className={styles.explainBody}>
                      <CatBadge cat={a.category}/>
                      <h3 className={styles.explainHed}>{a.title}</h3>
                      <div className={styles.explainMeta}>{a.authorName} · {ago(a.publishedAt)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionStrip>

            {/* ── B+ ── */}
            <SectionStrip title="B+" badge="Good News" badgeColor="#0F6E56" seeAllTo="/bplus">
              <div className={styles.bplusRow}>
                {bplus.map(a=>(
                  <Link key={a.id} to={`/article/${a.id}`} className={styles.bplusCard}>
                    {a.coverImage&&<div className={styles.bplusImg}><img src={a.coverImage} alt="" loading="lazy"/></div>}
                    <CatBadge cat={a.category}/>
                    <h3 className={styles.bplusHed}>{a.title}</h3>
                    <div className={styles.bplusMeta}>{a.authorName} · {ago(a.publishedAt)}</div>
                  </Link>
                ))}
              </div>
            </SectionStrip>

            {/* ── E-PAPER ── */}
            <SectionStrip title="E-Paper" badge="PDF" badgeColor="#993556" seeAllTo="/epaper">
              <div className={styles.epaperRow}>
                {epapers.length===0?(
                  <div className={styles.epaperEmpty}>No issues published yet.</div>
                ):epapers.map(ep=>(
                  <a key={ep.id} href={ep.pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.epaperCard}>
                    <div className={styles.epaperThumb}>
                      {ep.thumbUrl
                        ? <img src={ep.thumbUrl} alt=""/>
                        : (
                          <div className={styles.epaperThumbPlaceholder}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            <span>PDF</span>
                          </div>
                        )
                      }
                    </div>
                    <div className={styles.epaperIssue}>{ep.vol&&ep.num?`Vol. ${ep.vol} · No. ${ep.num}`:'Issue'}</div>
                    <div className={styles.epaperTitle}>{ep.title||'The Voice'}</div>
                    <div className={styles.epaperDate}>{ep.publishedAt?.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
                    <span className={styles.epaperDownload}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download PDF
                    </span>
                  </a>
                ))}
              </div>
            </SectionStrip>

            {/* ── MORE STORIES + TRENDING ── */}
            {more.length>0&&(
              <div className={styles.contentRow}>
                <div className={styles.mainFeed}>
                  <div className={styles.sectionHead}><h2>More Stories</h2></div>
                  <div className={styles.grid}>
                    {more.map(a=><ArticleCard key={a.id} article={a}/>)}
                  </div>
                </div>
                <div className={styles.rightRail}>
                  <div className={styles.trendHead}>Trending</div>
                  {trending.map((a,i)=>(
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.trendItem}>
                      <span className={styles.trendNum}>{i+1}</span>
                      <div>
                        <div className={styles.trendHed}>{a.title}</div>
                        <div className={styles.trendMeta}>{ago(a.publishedAt)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {articles.length>0&&<NewsletterSignup/>}
    </PageWrapper>
  )
}
