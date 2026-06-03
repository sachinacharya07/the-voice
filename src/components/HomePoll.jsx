import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import styles from './HomePoll.module.css'

export default function HomePoll() {
  const { user } = useAuth()
  const [poll, setPoll]   = useState(null)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const pollSnap = await getDoc(doc(db, 'settings', 'poll'))
        if (!pollSnap.exists() || cancelled) return
        const data = pollSnap.data()
        setPoll(data)
        // Check vote in subcollection, not voters array
        if (user) {
          const voteSnap = await getDoc(doc(db, 'settings', 'poll', 'votes', user.uid))
          if (!cancelled) setVoted(voteSnap.exists())
        }
      } catch { /* poll not set up yet — silently skip */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const vote = async (idx) => {
    if (!user || voted || !poll) return
    try {
      // Store vote in subcollection — no unbounded array
      await setDoc(doc(db, 'settings', 'poll', 'votes', user.uid), {
        optionIndex: idx, votedAt: new Date()
      })
      await updateDoc(doc(db, 'settings', 'poll'), {
        [`options.${idx}.votes`]: increment(1)
      })
      setPoll(p => ({
        ...p,
        options: p.options.map((o, i) => i === idx ? { ...o, votes: (o.votes || 0) + 1 } : o)
      }))
      setVoted(true)
    } catch { /* silently fail */ }
  }

  if (loading || !poll || !poll.question || !poll.options?.length) return null

  const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0)

  return (
    <div className={styles.poll}>
      <div className={styles.pollLabel}>Quick Poll</div>
      <h3>{poll.question}</h3>
      <div className={styles.options}>
        {poll.options.map((o, i) => {
          const pct = total > 0 ? Math.round(((o.votes || 0) / total) * 100) : 0
          return (
            <button key={i}
              className={`${styles.option} ${voted ? styles.voted : ''}`}
              onClick={() => vote(i)}
              disabled={voted}
              aria-label={`${o.label}${voted ? `, ${pct}%` : ''}`}
            >
              {voted && <div className={styles.bar} style={{ width: `${pct}%` }} />}
              <span className={styles.optLabel}>{o.label}</span>
              {voted && <span className={styles.pct}>{pct}%</span>}
            </button>
          )
        })}
      </div>
      <div className={styles.meta}>
        {total} vote{total !== 1 ? 's' : ''}
        {!user && <> · <a href="/auth">Sign in to vote</a></>}
      </div>
    </div>
  )
}
