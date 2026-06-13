import { useState, useEffect } from 'react'
import { addDoc, collection, serverTimestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './LettersPage.module.css'

function ago(ts) {
  if (!ts) return ''
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function LettersPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ subject:'', body:'', name:'', email:'' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [letters, setLetters] = useState([])
  const [loadingLetters, setLoadingLetters] = useState(true)

  useEffect(() => {
    getDocs(query(
      collection(db,'letters'),
      where('status','==','approved'),
      orderBy('createdAt','desc'),
      limit(20)
    ))
    .then(snap => setLetters(snap.docs.map(d => ({id:d.id,...d.data()}))))
    .catch(() => {})
    .finally(() => setLoadingLetters(false))
  }, [])

  const submit = async () => {
    if (!form.subject.trim() || !form.body.trim()) { alert('Subject and letter are required.'); return }
    // Rate limit: max 2 letters per session
    const letterCount = parseInt(sessionStorage.getItem('letter_count')||'0')
    if(letterCount >= 2){ alert('You have already submitted a letter recently.'); return }
    if (form.body.trim().length > 3000) { alert('Letter must be under 3000 characters.'); return }
    setSubmitting(true)
    try {
      await addDoc(collection(db,'letters'), {
        subject: form.subject.trim().slice(0,200),
        body: form.body.trim().slice(0,3000),
        name: form.name.trim().slice(0,80) || profile?.name || 'Anonymous',
        email: form.email.trim() || user?.email || null,
        userId: user?.uid || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      sessionStorage.setItem('letter_count', String(letterCount+1))
      setSubmitted(true)
    } catch { alert('Submission failed. Please try again.') }
    setSubmitting(false)
  }

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        {/* Masthead */}
        <div className={styles.masthead}>
          <h1>Letters to the Editor</h1>
          <p>We welcome responses, disagreements, and reflections from our readers. Selected letters are published here after review.</p>
        </div>

        {/* Published letters */}
        {loadingLetters ? (
          <div className={styles.lettersList}>
            {[...Array(2)].map((_,i)=><div key={i} className={styles.skeleton}/>)}
          </div>
        ) : letters.length > 0 ? (
          <div className={styles.lettersList}>
            {letters.map(l => (
              <div key={l.id} className={styles.letterCard}>
                <div className={styles.letterMeta}>
                  <strong>{l.name}</strong>
                  <span>·</span>
                  <span>{ago(l.createdAt)}</span>
                </div>
                <h3 className={styles.letterSubject}>{l.subject}</h3>
                <p className={styles.letterBody}>{l.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noLetters}>No letters published yet.</div>
        )}

        {/* Submit form */}
        <div className={styles.formSection}>
          <h2>Submit a Letter</h2>
          {submitted ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <h3>Letter received</h3>
              <p>Thank you for writing to us. We review all letters and publish a selection each week.</p>
              <button onClick={()=>{setSubmitted(false);setForm({subject:'',body:'',name:'',email:''})}} className={styles.writeAgain}>Write another</button>
            </div>
          ) : (
            <div className={styles.form}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Your name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    placeholder={profile?.name||'Optional'} maxLength={80}/>
                </div>
                <div className={styles.field}>
                  <label>Email <span>(not published)</span></label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    placeholder={user?.email||'Optional'} maxLength={254}/>
                </div>
              </div>
              <div className={styles.field}>
                <label>Subject *</label>
                <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}
                  placeholder="What is your letter about?" maxLength={200}/>
              </div>
              <div className={styles.field}>
                <label>Your letter * <span>{form.body.length}/3000</span></label>
                <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}
                  placeholder="Write your response, feedback, or reflection…" rows={7} maxLength={3000}/>
              </div>
              <p className={styles.note}>Letters may be edited for length and clarity. By submitting you agree to potential publication.</p>
              <button onClick={submit} disabled={submitting||!form.subject.trim()||!form.body.trim()} className={styles.submitBtn}>
                {submitting?'Sending…':'Send Letter'}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
