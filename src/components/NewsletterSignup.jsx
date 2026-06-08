import { useState } from 'react'
import { addDoc, collection, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import styles from './NewsletterSignup.module.css'

export default function NewsletterSignup({ compact = false }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  const subscribe = async (e) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setStatus('loading')
    try {
      await addDoc(collection(db, 'newsletter'), {
        email: email.trim().toLowerCase(),
        subscribedAt: serverTimestamp(),
        source: 'website'
      })
      setStatus('success')
      setEmail('')
      // Open mail client with confirmation instructions
      // This is optional — just show nice message for now
    } catch {
      setStatus('error')
    }
  }

  if (compact) return (
    <div className={styles.compact}>
      <p className={styles.compactTitle}>📬 Get The Voice in your inbox</p>
      {status === 'success'
        ? <p className={styles.successMsg}>✓ Subscribed! Check your inbox Sunday.</p>
        : (
          <form onSubmit={subscribe} className={styles.compactForm}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className={styles.compactInput}/>
            <button type="submit" disabled={status === 'loading'} className={styles.compactBtn}>
              {status === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
        )}
    </div>
  )

  return (
    <div className={styles.banner}>
      <div className={styles.bannerLeft}>
        <h3>Stay informed.</h3>
        <p>Get The Voice Weekly — top stories, editor's picks, and campus news every Sunday.</p>
      </div>
      <div className={styles.bannerRight}>
        {status === 'success' ? (
          <div className={styles.successFull}>
            <span>✓</span> You're subscribed. Watch your inbox.
          </div>
        ) : (
          <form onSubmit={subscribe} className={styles.fullForm}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className={styles.fullInput} required/>
            <button type="submit" disabled={status === 'loading'} className={styles.fullBtn}>
              {status === 'loading' ? 'Subscribing...' : 'Subscribe free'}
            </button>
          </form>
        )}
        {status === 'error' && <p className={styles.errorMsg}>Something went wrong. Try again.</p>}
        <p className={styles.note}>No spam. Unsubscribe any time.</p>
      </div>
    </div>
  )
}
