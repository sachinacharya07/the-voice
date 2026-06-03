import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import styles from './TipPage.module.css'

export default function ApplyPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({motivation:'',samples:'',experience:''})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if(!user)return <Navigate to="/auth" replace/>

  const submit=async()=>{
    if(!form.motivation.trim())return
    setSubmitting(true)
    await addDoc(collection(db,'applications'),{
      userId:user.uid,name:profile?.name||user.displayName,email:user.email,
      motivation:form.motivation.trim(),samples:form.samples.trim(),
      experience:form.experience.trim(),status:'pending',
      createdAt:serverTimestamp()
    })
    setSubmitted(true);setSubmitting(false)
  }

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.icon}>✍️</div>
          <h1>Apply to Write</h1>
          <p>Want to contribute to The Voice? Tell us about yourself and why you want to join our team of student journalists.</p>
        </div>
        {submitted?(
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Application submitted!</h2>
            <p>Our editors will review your application and get back to you.</p>
          </div>
        ):(
          <div className={styles.form}>
            <div className={styles.field}>
              <label>Why do you want to write for The Voice? *</label>
              <textarea value={form.motivation} onChange={e=>setForm(f=>({...f,motivation:e.target.value}))} placeholder="Tell us your motivation..." rows={5}/>
            </div>
            <div className={styles.field}>
              <label>Any writing experience?</label>
              <textarea value={form.experience} onChange={e=>setForm(f=>({...f,experience:e.target.value}))} placeholder="Blog posts, school magazine, other publications..." rows={3}/>
            </div>
            <div className={styles.field}>
              <label>Writing samples <span>(links to any previous work)</span></label>
              <input value={form.samples} onChange={e=>setForm(f=>({...f,samples:e.target.value}))} placeholder="e.g. link to your blog, Google Doc, etc."/>
            </div>
            <button className={styles.btn} onClick={submit} disabled={submitting||!form.motivation.trim()}>
              {submitting?'Submitting...':'Submit Application'}
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
