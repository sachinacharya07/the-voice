import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { X } from 'lucide-react'
import styles from './ReportModal.module.css'

const REASONS = [
  'Inaccurate information',
  'Inappropriate content',
  'Plagiarism',
  'Spam or misleading',
  'Other'
]

export default function ReportModal({ article, onClose }) {
  const { user, profile } = useAuth()
  const [reason, setReason]       = useState('')
  const [status, setStatus]       = useState('idle') // idle | submitting | success | error

  const submit = async () => {
    if (!reason) return
    setStatus('submitting')
    try {
      await addDoc(collection(db, 'reports'), {
        articleId:    article.id,
        articleTitle: article.title,
        reason,
        reporterId:   user?.uid || null,
        reporterName: profile?.name || 'Anonymous',
        createdAt:    serverTimestamp()
      })
      setStatus('success')
      setTimeout(onClose, 1800)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Report Article</h3>
          <button onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>

        {status === 'success' && <div className={styles.success}>Report submitted. Thank you.</div>}
        {status === 'error'   && <div className={styles.errMsg}>Something went wrong. Try again.</div>}

        {status !== 'success' && (
          <>
            <p className={styles.sub}>Why are you reporting "<strong>{article.title}</strong>"?</p>
            <div className={styles.options}>
              {REASONS.map(r => (
                <button key={r}
                  className={`${styles.option} ${reason === r ? styles.selected : ''}`}
                  onClick={() => setReason(r)}>{r}
                </button>
              ))}
            </div>
            <button className={styles.submit} onClick={submit}
              disabled={!reason || status === 'submitting'}>
              {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
