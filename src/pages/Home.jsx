import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import ArticleCard from '../components/ArticleCard'
import PageWrapper from '../components/PageWrapper'
import HomePoll from '../components/HomePoll'
import NewsletterSignup from '../components/NewsletterSignup'
import styles from './Home.module.css'

const CAT_LABELS = {
  school: 'School & College',
  science: 'Science & Tech',
  sports: 'Sports',
  arts: 'Arts & Culture',
  world: 'World',
  opinion: 'Opinion',
}
const CAT_COLORS = {
  school: '#185FA5',
  science: '#0F6E56',
  sports: '#854F0B',
  arts: '#993556',
  world: '#444441',
  opinion: '#c0392b',
}

function readTime(body = '') {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200))
}
function ago(ts) {
  if (!ts) return 'Just now'
  const d = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (d < 60) return 'Just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function todayStr() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Simple in-memory cache
let homeCache = null
let homeCacheTime = 0
const CACHE_TTL = 2 * 60 * 1000

function CatBadge({ cat, light = false }) {
  const color = CAT_COLORS[cat] || '#888'
  const label = CAT_LABELS[cat] || cat
  if (light) {
    return (
      <span className={styles.cat} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.45)' }}>
        {label}
      </span>
    )
  }
  return (
    <span className={styles.cat} style={{ color, borderColor: color }}>{label}</span>
  )
}

function MetaRow({ article, light = false }) {
  const color = light ? 'rgba(255,255,255,0.55)' : undefined
  const authorColor = light ? 'rgba(255,255,255,0.85)' : undefined
  return (
    <div className={styles.meta} style={color ? { color } : undefined}>
      <span style={authorColor ? { color: authorColor, fontWeight: 600 } : { fontWeight: 600, color: 'var(--black)' }}>
        {article.authorName}
      </span>
      <span className={styles.metaDot}>·</span>
      <span>{ago(article.publishedAt)}</span>
      <span className={styles.metaDot}>·</span>
      <span>{readTime(article.body)} min read</span>
    </div>
  )
}

export default function Home() {
  const [articles, setArticles] = useState(homeCache || [])
  const [loading, setLoading] = useState(!homeCache)

  useEffect(() => {
    const now = Date.now()
    if (homeCache && now - homeCacheTime < CACHE_TTL) {
      setArticles(homeCache)
      setLoading(false)
      return
    }
    getDocs(
      query(
        collection(db, 'articles'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(20)
      )
    ).then(snap => {
      const arts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      homeCache = arts
      homeCacheTime = Date.now()
      setArticles(arts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <PageWrapper>
      <div className={styles.skeletonWrap}>
        <div className={styles.skeletonHero} />
        <div className={styles.skeletonGrid}>
          {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    </PageWrapper>
  )

  // Slice layout zones
  const hero      = articles[0]
  const secondary = articles.slice(1, 4)   // right stack of hero
  const midRow    = articles.slice(4, 7)   // 3-col mid row
  const opinions  = articles.filter(a => a.category === 'opinion').slice(0, 3)
  const trending  = articles.slice(0, 5)   // numbered sidebar
  const more      = articles.slice(7, 15)  // grid

  return (
    <PageWrapper>
      {/* ── TICKER ── */}
      {articles.length > 0 && (
        <div className={styles.ticker}>
          <span className={styles.tickerLabel}>Latest</span>
          <span className={styles.tickerText}>{articles[0]?.title}</span>
        </div>
      )}

      <div className={styles.container}>
        {/* ── DATELINE ── */}
        <div className={styles.dateline}>
          <div className={styles.datelineLeft}>
            <span className={styles.datelineDot}>◆</span>
            <span>{todayStr()}</span>
          </div>
          <span className={styles.editionBadge}>The Voice</span>
        </div>

        {articles.length === 0 ? (
          <div className={styles.empty}>
            <h2>No articles yet</h2>
            <p>Be the first to write something.</p>
            <Link to="/write" className={styles.emptyBtn}>Write an article</Link>
          </div>
        ) : (
          <>
            {/* ── HERO + SECONDARY STACK ── */}
            {hero && (
              <section className={styles.heroSection}>
                {/* Main hero */}
                <Link to={`/article/${hero.id}`} className={styles.heroLeft}>
                  {hero.coverImage ? (
                    <div className={styles.heroImg}>
                      <img src={hero.coverImage} alt={hero.title} loading="eager" />
                      <div className={styles.heroGradient} />
                      <div className={styles.heroOverlayText}>
                        <CatBadge cat={hero.category} light />
                        <h1 className={styles.heroHed}>{hero.title}</h1>
                        {hero.summary && <p className={styles.heroDek}>{hero.summary}</p>}
                        <MetaRow article={hero} light />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.heroNoImg}>
                      <CatBadge cat={hero.category} />
                      <h1 className={styles.heroHedDark}>{hero.title}</h1>
                      {hero.summary && <p className={styles.heroDekDark}>{hero.summary}</p>}
                      <MetaRow article={hero} />
                    </div>
                  )}
                </Link>

                {/* Right secondary stack */}
                <div className={styles.secondaryStack}>
                  {secondary.map(a => (
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.stackCard}>
                      <div className={styles.stackAccent} />
                      {a.coverImage && (
                        <div className={styles.stackImg}>
                          <img src={a.coverImage} alt="" loading="lazy" />
                        </div>
                      )}
                      <span className={styles.cat} style={{ color: CAT_COLORS[a.category], borderColor: CAT_COLORS[a.category] }}>
                        {CAT_LABELS[a.category]}
                      </span>
                      <h3 className={styles.stackHed}>{a.title}</h3>
                      <div className={styles.stackMeta}>{ago(a.publishedAt)} · {readTime(a.body)} min</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── MID ROW: 3 articles + opinion sidebar ── */}
            {midRow.length > 0 && (
              <div className={styles.midRow}>
                {midRow.map(a => (
                  <div key={a.id} className={styles.midCol}>
                    <Link to={`/article/${a.id}`} className={styles.midLink}>
                      {a.coverImage && (
                        <div className={styles.midImg}>
                          <img src={a.coverImage} alt="" loading="lazy" />
                        </div>
                      )}
                      <span className={styles.cat} style={{ color: CAT_COLORS[a.category], borderColor: CAT_COLORS[a.category] }}>
                        {CAT_LABELS[a.category]}
                      </span>
                      <h2 className={styles.midHed}>{a.title}</h2>
                      {a.summary && <p className={styles.midDek}>{a.summary}</p>}
                      <div className={styles.midMeta}>{a.authorName} · {ago(a.publishedAt)}</div>
                    </Link>
                  </div>
                ))}
                {/* Opinion sidebar — fills 4th col, shows opinion articles or falls back to most recent */}
                <div className={styles.opinionSidebar}>
                  <div className={styles.sidebarHead}>Opinion</div>
                  {(opinions.length > 0 ? opinions : articles.slice(7, 10)).map(a => (
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.opinionItem}>
                      <div className={styles.opinionHed}>{a.title}</div>
                      <div className={styles.opinionAuthor}>{a.authorName}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── POLL ── */}
            <HomePoll />

            {/* ── MORE STORIES + TRENDING SIDEBAR ── */}
            {more.length > 0 && (
              <div className={styles.contentRow}>
                <div className={styles.mainFeed}>
                  <div className={styles.sectionHead}><h2>More Stories</h2></div>
                  <div className={styles.grid}>
                    {more.map(a => <ArticleCard key={a.id} article={a} />)}
                  </div>
                </div>
                <div className={styles.rightRail}>
                  <div className={styles.trendHead}>Trending</div>
                  {trending.map((a, i) => (
                    <Link key={a.id} to={`/article/${a.id}`} className={styles.trendItem}>
                      <span className={styles.trendNum}>{i + 1}</span>
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

      {/* Newsletter — full width */}
      {articles.length > 0 && <NewsletterSignup />}
    </PageWrapper>
  )
}
