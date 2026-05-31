import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './TipPage.module.css'

export default function TipPage() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({subject:'',message:'',name:'',email:'',anonymous:false})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit=async()=>{
    if(!form.subject.trim()||!form.message.trim())return
    setSubmitting(true)
    await addDoc(collection(db,'tips'),{
      subject:form.subject.trim(),message:form.message.trim(),
      anonymous:form.anonymous,
      name:form.anonymous?null:(form.name||profile?.name||'Unknown'),
      email:form.anonymous?null:(form.email||user?.email||null),
      userId:user?.uid||null,
      createdAt:serverTimestamp()
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.icon}>📬</div>
          <h1>Send a Tip</h1>
          <p>Got a story idea or piece of information the newsroom should know about? Send it anonymously or with your name. All tips go directly to our editors.</p>
        </div>

        {submitted?(
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Tip received!</h2>
            <p>Thank you. Our editors will review it shortly.</p>
          </div>
        ):(
          <div className={styles.form}>
            <div className={styles.field}>
              <label>Subject</label>
              <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="What's the story about?"/>
            </div>
            <div className={styles.field}>
              <label>Your tip or information</label>
              <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Tell us what you know..." rows={6}/>
            </div>
            <div className={styles.anonToggle}>
              <input type="checkbox" id="anon" checked={form.anonymous} onChange={e=>setForm(f=>({...f,anonymous:e.target.checked}))}/>
              <label htmlFor="anon">Submit anonymously (your name and email won't be stored)</label>
            </div>
            {!form.anonymous&&(
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label>Your name <span>(optional)</span></label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={profile?.name||'Your name'}/>
                </div>
                <div className={styles.field}>
                  <label>Your email <span>(optional)</span></label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder={user?.email||'so we can follow up'}/>
                </div>
              </div>
            )}
            <button className={styles.btn} onClick={submit} disabled={submitting||!form.subject.trim()||!form.message.trim()}>
              {submitting?'Sending...':'Send Tip'}
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
