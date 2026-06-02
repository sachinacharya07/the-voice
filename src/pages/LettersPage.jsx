import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './TipPage.module.css'

export default function LettersPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ subject: '', body: '', name: '', email: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!form.subject.trim() || !form.body.trim()) return
    setSubmitting(true)
    await addDoc(collection(db, 'letters'), {
      subject: form.subject.trim(),
      body: form.body.trim(),
      name: form.name.trim() || profile?.name || 'Anonymous',
      email: form.email.trim() || user?.email || null,
      userId: user?.uid || null,
      status: 'pending',
      createdAt: serverTimestamp()
    })
    setSubmitted(true); setSubmitting(false)
  }

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.icon}>✉️</div>
          <h1>Letters to the Editor</h1>
          <p>Disagree with something we published? Have a response to our coverage? Write to us. Selected letters are published on The Voice with the author's name.</p>
        </div>
        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Letter received!</h2>
            <p>Thank you. Our editors will review your letter and may publish it on The Voice.</p>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.field}>
              <label>Subject / Article you're responding to *</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Re: NEET 2026 article"/>
            </div>
            <div className={styles.field}>
              <label>Your letter *</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your letter here..." rows={7}/>
            </div>
            <div className={styles.nameRow}>
              <div className={styles.field}>
                <label>Your name <span>(will appear if published)</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={profile?.name || 'Your name'}/>
              </div>
              <div className={styles.field}>
                <label>Email <span>(not published)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={user?.email || 'For follow-up only'}/>
              </div>
            </div>
            <button className={styles.btn} onClick={submit} disabled={submitting || !form.subject.trim() || !form.body.trim()}>
              {submitting ? 'Submitting...' : 'Submit Letter'}
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
