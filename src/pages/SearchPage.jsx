import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PageWrapper from '../components/PageWrapper'
import styles from './SearchPage.module.css'

// ── constants ────────────────────────────────────────────
const CAT_LABELS = { school:'School & College', science:'Science & Tech', sports:'Sports', arts:'Arts & Culture', world:'World', opinion:'Opinion' }
const CAT_COLORS = { school:'#185FA5', science:'#0F6E56', sports:'#854F0B', arts:'#993556', world:'#444441', opinion:'#c0392b' }

// ── scoring ──────────────────────────────────────────────
function scoreArticle(a, words) {
  let score = 0
  const hit = (str = '', w, weight) => {
    if (!str) return
    const s = str.toLowerCase()
    words.forEach(w2 => { if (s.includes(w2)) score += weight })
  }
  words.forEach(w => {
    hit(a.title,   w, 10)
    hit((a.tags||[]).join(' '), w, 8)
    hit(a.summary, w, 5)
    hit(a.authorName, w, 4)
    // body: count occurrences, cap contribution
    if (a.body) {
      const body = a.body.toLowerCase()
      let i = 0, count = 0
      while ((i = body.indexOf(w, i)) !== -1) { count++; i++ }
      score += Math.min(count, 6) * 1
    }
  })
  // recency bonus — articles within 30 days get +2
  if (a.publishedAt) {
    const age = (Date.now() - a.publishedAt.toDate().getTime()) / (1000 * 86400)
    if (age < 30) score += 2
  }
  return score
}

// ── highlight ────────────────────────────────────────────
function highlight(text = '', words = []) {
  if (!text || !words.length) return text
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i} className={styles.mark}>{p}</mark> : p
  )
}

// ── excerpt ──────────────────────────────────────────────
function excerpt(body = '', words = [], maxLen = 160) {
  if (!body) return ''
  const lower = body.toLowerCase()
  const firstHit = words.reduce((best, w) => {
    const idx = lower.indexOf(w)
    return idx !== -1 && idx < best ? idx : best
  }, body.length)
  const start = Math.max(0, firstHit - 40)
  const raw = body.slice(start, start + maxLen)
  return (start > 0 ? '…' : '') + raw + (raw.length === maxLen ? '…' : '')
}

function ago(ts) {
  if (!ts) return ''
  const d = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return ts.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}
function readTime(body=''){return Math.max(1,Math.ceil((body||'').trim().split(/\s+/).length/200))}

// ── result card ──────────────────────────────────────────
function ResultCard({ article, words }) {
  const color = CAT_COLORS[article.category] || '#888'
  const label = CAT_LABELS[article.category] || article.category
  const snip  = excerpt(article.body, words)
  return (
    <Link to={`/article/${article.id}`} className={styles.card}>
      {article.coverImage && (
        <div className={styles.cardImg}>
          <img src={article.coverImage} alt="" loading="lazy"/>
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cat} style={{color, borderColor:color}}>{label}</span>
          {article.isOriginal && <span className={styles.badge} style={{background:'#0d0d0d'}}>Originals</span>}
          {article.isExplained && <span className={styles.badge} style={{background:'#185FA5'}}>Explained</span>}
          {article.isBplus && <span className={styles.badge} style={{background:'#0F6E56'}}>B+</span>}
        </div>
        <h2 className={styles.cardHed}>{highlight(article.title, words)}</h2>
        {article.summary && (
          <p className={styles.cardSummary}>{highlight(article.summary, words)}</p>
        )}
        {snip && !article.summary && (
          <p className={styles.cardSnip}>{highlight(snip, words)}</p>
        )}
        <div className={styles.cardMeta}>
          <span className={styles.author}>{article.authorName}</span>
          <span className={styles.dot}>·</span>
          <span>{ago(article.publishedAt)}</span>
          <span className={styles.dot}>·</span>
          <span>{readTime(article.body)} min read</span>
        </div>
        {(article.tags||[]).length > 0 && (
          <div className={styles.tags}>
            {article.tags.map(t => (
              <span key={t} className={`${styles.tag} ${words.includes(t.toLowerCase()) ? styles.tagHit : ''}`}>#{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── main ─────────────────────────────────────────────────
let articlesCache = null
let cacheTime = 0
const CACHE_TTL = 3 * 60 * 1000

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialQ = searchParams.get('q') || ''

  const [inputVal, setInputVal]   = useState(initialQ)
  const [results,  setResults]    = useState([])
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [catFilter,setCatFilter]  = useState('')
  const [sortBy,   setSortBy]     = useState('relevance') // 'relevance' | 'date' | 'popular'
  const [allArts,  setAllArts]    = useState([])

  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  // ── load article index once ───────────────────────────
  const loadIndex = useCallback(async () => {
    const now = Date.now()
    if (articlesCache && (now - cacheTime) < CACHE_TTL) return articlesCache
    const snap = await getDocs(query(
      collection(db, 'articles'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(500)
    ))
    const arts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    articlesCache = arts
    cacheTime = now
    return arts
  }, [])

  // ── run search ────────────────────────────────────────
  const runSearch = useCallback(async (q, cat, sort) => {
    if (!q.trim()) { setResults([]); setAllArts([]); return }
    setLoading(true); setError('')
    try {
      const arts = await loadIndex()
      const words = q.toLowerCase().split(/\s+/).filter(Boolean)

      let filtered = arts
      if (cat) filtered = filtered.filter(a => a.category === cat)

      // score and filter (must match at least one word in title/summary/tags)
      const scored = filtered
        .map(a => ({ a, score: scoreArticle(a, words) }))
        .filter(({ a, score }) => {
          if (score === 0) return false
          const combined = `${a.title} ${a.summary||''} ${(a.tags||[]).join(' ')} ${a.authorName||''}`.toLowerCase()
          return words.some(w => combined.includes(w))
        })

      if (sort === 'relevance') {
        scored.sort((a, b) => b.score - a.score)
      } else if (sort === 'date') {
        scored.sort((a, b) => (b.a.publishedAt?.toDate() || 0) - (a.a.publishedAt?.toDate() || 0))
      } else if (sort === 'popular') {
        scored.sort((a, b) => (b.a.views || 0) - (a.a.views || 0))
      }

      setResults(scored.map(({ a }) => a))
      setAllArts(arts)
    } catch {
      setError('Search failed. Please try again.')
    }
    setLoading(false)
  }, [loadIndex])

  // ── debounced input handler ───────────────────────────
  const handleInput = (val) => {
    setInputVal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams(val.trim() ? { q: val.trim() } : {}, { replace: true })
      runSearch(val, catFilter, sortBy)
    }, 280)
  }

  // ── run on mount + when URL q changes ─────────────────
  useEffect(() => {
    const q = searchParams.get('q') || ''
    setInputVal(q)
    if (q) runSearch(q, catFilter, sortBy)
    if (inputRef.current) inputRef.current.focus()
  }, []) // eslint-disable-line

  // ── re-run when filters/sort change ──────────────────
  useEffect(() => {
    const q = inputVal.trim()
    if (q) runSearch(q, catFilter, sortBy)
  }, [catFilter, sortBy]) // eslint-disable-line

  const words   = inputVal.toLowerCase().split(/\s+/).filter(Boolean)
  const hasQ    = inputVal.trim().length > 0

  // ── category counts from current results ─────────────
  const catCounts = results.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})

  return (
    <PageWrapper>
      <div className={styles.wrap}>

        {/* ── search bar ── */}
        <div className={styles.searchBox}>
          <div className={styles.inputRow}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref={inputRef}
              className={styles.input}
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              placeholder="Search articles, topics, authors, tags…"
              autoComplete="off"
              spellCheck="false"
            />
            {inputVal && (
              <button className={styles.clearBtn} onClick={() => { setInputVal(''); setResults([]); setSearchParams({}) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* ── controls + count ── */}
        {hasQ && (
          <div className={styles.controls}>
            <div className={styles.countLine}>
              {loading ? 'Searching…' : (
                <>{results.length} result{results.length !== 1 ? 's' : ''} for <strong>"{inputVal.trim()}"</strong></>
              )}
            </div>
            <div className={styles.filters}>
              <select className={styles.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All sections</option>
                {Object.entries(CAT_LABELS).map(([v,l]) => (
                  <option key={v} value={v}>{l}{catCounts[v] ? ` (${catCounts[v]})` : ''}</option>
                ))}
              </select>
              <select className={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="relevance">Most relevant</option>
                <option value="date">Most recent</option>
                <option value="popular">Most viewed</option>
              </select>
            </div>
          </div>
        )}

        {/* ── error ── */}
        {error && <div className={styles.error}>{error}</div>}

        {/* ── states ── */}
        {!hasQ && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p>Type to search across all published articles</p>
            <div className={styles.suggestions}>
              {['CBSE','science','opinion','sports','arts'].map(s => (
                <button key={s} className={styles.chip} onClick={() => handleInput(s)}>#{s}</button>
              ))}
            </div>
          </div>
        )}

        {hasQ && !loading && results.length === 0 && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p>No articles found for <strong>"{inputVal.trim()}"</strong></p>
            {catFilter && <p className={styles.subHint}>Try clearing the section filter</p>}
          </div>
        )}

        {/* ── loading skeletons ── */}
        {loading && (
          <div className={styles.list}>
            {[...Array(4)].map((_,i) => <div key={i} className={styles.skeleton}/>)}
          </div>
        )}

        {/* ── results ── */}
        {!loading && results.length > 0 && (
          <div className={styles.list}>
            {results.map(a => <ResultCard key={a.id} article={a} words={words}/>)}
          </div>
        )}

      </div>
    </PageWrapper>
  )
}
