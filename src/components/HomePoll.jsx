import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import styles from './HomePoll.module.css'

export default function HomePoll() {
  const { user } = useAuth()
  const [poll, setPoll]     = useState(null)
  const [voted, setVoted]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    getDoc(doc(db,'settings','poll'))
      .then(snap=>{
        if(snap.exists()){
          const d = snap.data()
          setPoll(d)
          if(user) setVoted((d.voters||[]).includes(user.uid))
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  },[user])

  const vote = async(idx) => {
    if(!user || voted || !poll) return
    try {
      await updateDoc(doc(db,'settings','poll'),{
        [`options.${idx}.votes`]: increment(1),
        voters: arrayUnion(user.uid)
      })
      setPoll(p=>({
        ...p,
        options: p.options.map((o,i)=>i===idx?{...o,votes:(o.votes||0)+1}:o),
        voters: [...(p.voters||[]), user.uid]
      }))
      setVoted(true)
    } catch { /* silently fail */ }
  }

  if(loading || !poll || !poll.question || !poll.options?.length) return null

  const total = poll.options.reduce((s,o)=>s+(o.votes||0), 0)
  const hasVoted = voted || (user && (poll.voters||[]).includes(user.uid))

  return(
    <div className={styles.poll}>
      <div className={styles.pollLabel}>Quick Poll</div>
      <h3>{poll.question}</h3>
      <div className={styles.options}>
        {poll.options.map((o,i)=>{
          const pct = total>0 ? Math.round(((o.votes||0)/total)*100) : 0
          return(
            <button key={i}
              className={`${styles.option} ${hasVoted?styles.voted:''}`}
              onClick={()=>vote(i)}
              disabled={hasVoted}
              aria-label={`${o.label}${hasVoted ? `, ${pct}%` : ''}`}
            >
              {hasVoted && <div className={styles.bar} style={{width:`${pct}%`}}/>}
              <span className={styles.optLabel}>{o.label}</span>
              {hasVoted && <span className={styles.pct}>{pct}%</span>}
            </button>
          )
        })}
      </div>
      <div className={styles.meta}>
        {total} vote{total!==1?'s':''}
        {!user && <> · <a href="/auth">Sign in to vote</a></>}
      </div>
    </div>
  )
}
