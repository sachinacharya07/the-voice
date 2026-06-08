import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import styles from './BreakingBanner.module.css'

export default function BreakingBanner() {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'breaking'), snap => {
      if (snap.exists()) setText(snap.data().value || '')
    }, () => {})
    return unsub
  }, [])

  if (!text || !visible) return null

  return (
    <div className={styles.banner}>
      <span className={styles.label}>BREAKING</span>
      <span className={styles.text}>{text}</span>
      <button className={styles.close} onClick={() => setVisible(false)} aria-label="Dismiss">×</button>
    </div>
  )
}
