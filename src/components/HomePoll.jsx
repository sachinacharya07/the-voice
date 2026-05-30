import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, increment, arrayUnion, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import styles from './HomePoll.module.css'

export default function HomePoll() {
  const { user } = useAuth()
  const [poll, setPoll] = useState(null)
  const [voted, setVoted] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    getDoc(doc(db,'settings','poll')).then(snap=>{
      if(snap.exists()){
        const d=snap.data()
        setPoll(d)
        if(user&&d.voters?.includes(user.uid)){
          setVoted(d.voters?.indexOf(user.uid)>=0?'voted':'')
        }
      }
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[user])

  const vote=async(optionIndex)=>{
    if(!user||voted)return
    const ref=doc(db,'settings','poll')
    await updateDoc(ref,{
      [`options.${optionIndex}.votes`]:increment(1),
      voters:arrayUnion(user.uid)
    })
    setPoll(p=>({...p,options:p.options.map((o,i)=>i===optionIndex?{...o,votes:(o.votes||0)+1}:o),voters:[...(p.voters||[]),user.uid]}))
    setVoted('voted')
  }

  if(loading||!poll)return null

  const total=poll.options?.reduce((s,o)=>s+(o.votes||0),0)||0
  const hasVoted=voted==='voted'||(user&&poll.voters?.includes(user.uid))

  return(
    <div className={styles.poll}>
      <div className={styles.pollLabel}>Quick Poll</div>
      <h3>{poll.question}</h3>
      <div className={styles.options}>
        {poll.options?.map((o,i)=>{
          const pct=total>0?Math.round(((o.votes||0)/total)*100):0
          return(
            <button key={i} className={`${styles.option} ${hasVoted?styles.voted:''}`}
              onClick={()=>vote(i)} disabled={hasVoted}>
              <div className={styles.optionBar} style={{width:hasVoted?`${pct}%`:'0%'}}/>
              <span className={styles.optionLabel}>{o.label}</span>
              {hasVoted&&<span className={styles.pct}>{pct}%</span>}
            </button>
          )
        })}
      </div>
      <div className={styles.pollMeta}>{total} votes{!user&&<span> · <a href="/auth">Sign in to vote</a></span>}</div>
    </div>
  )
}
