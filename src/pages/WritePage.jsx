import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ImagePlus, X, Loader } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../lib/cloudinary'
import PageWrapper from '../components/PageWrapper'
import styles from './WritePage.module.css'

const CATEGORIES = [
  { value: 'school', label: 'School & College' },
  { value: 'science', label: 'Science & Technology' },
  { value: 'sports', label: 'Sports' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'world', label: 'World News' },
  { value: 'opinion', label: 'Opinion & Editorial' },
]

export default function WritePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [form, setForm] = useState({ title: '', category: 'school', summary: '', body: '' })
  const [coverImage, setCoverImage] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    setCoverPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage(file)
      setCoverImage(url)
    } catch {
      setError('Image upload failed. Try again.')
      setCoverPreview(null)
    }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Headline and article body are required.'); return }
    if (uploading) { setError('Please wait for image to finish uploading.'); return }
    setSubmitting(true)
    setError('')
    try {
      await addDoc(collection(db, 'articles'), {
        title: form.title.trim(),
        category: form.category,
        summary: form.summary.trim(),
        body: form.body.trim(),
        coverImage: coverImage || null,
        authorId: user.uid,
        authorName: profile?.name || user.displayName || user.email,
        authorPhoto: user.photoURL || null,
        status: 'pending',
        likes: 0,
        views: 0,
        likedBy: [],
        bookmarkedBy: [],
        submittedAt: serverTimestamp(),
        publishedAt: null,
      })
      setSuccess(true)
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  if (success) return (
    <PageWrapper>
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2>Submitted!</h2>
          <p>Your article is under editorial review. It'll go live once approved.</p>
          <div className={styles.successActions}>
            <button onClick={() => navigate('/')} className={styles.btnBlack}>Back to home</button>
            <button onClick={() => { setSuccess(false); setForm({ title:'',category:'school',summary:'',body:'' }); setCoverImage(null); setCoverPreview(null) }} className={styles.btnOutline}>Write another</button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )

  return (
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1>Submit an article</h1>
          <p>All submissions go through editorial review before publishing.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Cover image */}
        <div className={styles.section}>
          <label className={styles.label}>Cover image</label>
          {coverPreview ? (
            <div className={styles.previewWrap}>
              <img src={coverPreview} alt="Cover preview" className={styles.preview} />
              {uploading && (
                <div className={styles.uploadingOverlay}>
                  <Loader size={24} className={styles.spinner} />
                  <span>Uploading...</span>
                </div>
              )}
              {!uploading && (
                <button className={styles.removeImg} onClick={() => { setCoverImage(null); setCoverPreview(null) }}>
                  <X size={16} /> Remove
                </button>
              )}
            </div>
          ) : (
            <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
              <ImagePlus size={20} />
              <span>Upload cover image</span>
              <small>JPG, PNG, WEBP · max 10MB</small>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Headline *</label>
          <input className={styles.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="A sharp, clear headline" />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Section *</label>
          <select className={styles.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Summary <span className={styles.optional}>(shown on cards & hero)</span></label>
          <input className={styles.input} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="1–2 sentences about the story" />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Article body *</label>
          <textarea className={styles.textarea} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your full story here. Each new paragraph = new line." />
          <div className={styles.wordCount}>{form.body.trim().split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.ceil(form.body.trim().split(/\s+/).length / 200))} min read</div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnBlack} onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? 'Submitting...' : 'Submit for review'}
          </button>
          <button className={styles.btnOutline} onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </PageWrapper>
  )
}
