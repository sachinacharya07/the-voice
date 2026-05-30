import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAIL } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import PageWrapper from '../components/PageWrapper'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'reader' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const u = result.user
      const ref = doc(db, 'users', u.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: u.uid, name: u.displayName, email: u.email,
          photo: u.photoURL, role: u.email === ADMIN_EMAIL ? 'admin' : 'reader',
          createdAt: serverTimestamp()
        })
      }
      navigate('/')
    } catch (e) {
      setError(e.message.replace('Firebase: ', ''))
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!form.email || !form.password) return setError('Fill in all fields')
    setLoading(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password)
      navigate('/')
    } catch (e) {
      setError(e.message.replace('Firebase: ', '').replace(/\(.*\)/,'').trim())
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) return setError('Fill in all fields')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true); setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(cred.user, { displayName: form.name })
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, name: form.name, email: form.email,
        photo: null, role: form.email === ADMIN_EMAIL ? 'admin' : form.role,
        createdAt: serverTimestamp()
      })
      navigate('/')
    } catch (e) {
      setError(e.message.replace('Firebase: ', '').replace(/\(.*\)/,'').trim())
    }
    setLoading(false)
  }

  return (
    <PageWrapper style={{ background: 'var(--white)' }}>
      <div className={styles.wrap}>
        <div className={styles.left}>
          <div>
            <h1 className={styles.logo}>The Voice</h1>
            <p className={styles.desc}>Independent student journalism. Your stories, your campus, your world.</p>
          </div>
          <div className={styles.leftQuote}>
            <p>"The press is the best instrument for enlightening the mind of man."</p>
            <span>— Thomas Jefferson</span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formWrap}>
            <div className={styles.tabs}>
              <button className={`${styles.tabBtn} ${tab==='login'?styles.on:''}`} onClick={()=>{setTab('login');setError('')}}>Sign in</button>
              <button className={`${styles.tabBtn} ${tab==='register'?styles.on:''}`} onClick={()=>{setTab('register');setError('')}}>Create account</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Google */}
            <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>

            <div className={styles.divider}><span>or</span></div>

            {tab === 'register' && (
              <div className={styles.field}>
                <label>Full name</label>
                <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your name" />
              </div>
            )}
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@school.edu" />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                placeholder={tab==='register'?'Min. 6 characters':'••••••••'}
                onKeyDown={e=>e.key==='Enter'&&(tab==='login'?handleLogin():handleRegister())}
              />
            </div>
            {tab === 'register' && (
              <div className={styles.field}>
                <label>I want to</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="reader">Read articles</option>
                  <option value="writer">Write & submit articles</option>
                </select>
              </div>
            )}

            <button className={styles.submitBtn} onClick={tab==='login'?handleLogin:handleRegister} disabled={loading}>
              {loading ? 'Please wait...' : tab==='login' ? 'Sign in →' : 'Create account →'}
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
