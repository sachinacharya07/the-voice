// Vercel serverless — POST /api/article-published
// Called from admin when approving an article to auto-notify subscribers
import webpush from 'web-push'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const VAPID_PUBLIC  = 'DC0kTIGIPpAvOS0-4lJaFUkaQzVR7fnll6I846BdApGrPGxo7b3AiXCbuyHe00j83hr2qWfwvM8JJt8myWGVUw'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL   = 'mailto:the.voice.of.students01@gmail.com'
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || 'tisa.helpdesk@gmail.com'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  }
  return getFirestore()
}

export default async function handler(req, res) {
  const origin  = req.headers.origin || ''
  const allowed = process.env.ALLOWED_ORIGIN || `https://${process.env.VERCEL_URL}`
  res.setHeader('Access-Control-Allow-Origin', origin === allowed ? origin : allowed)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth check — verify admin Firebase token
  try {
    const token = req.headers.authorization?.split('Bearer ')[1]
    if (!token) return res.status(401).json({ error: 'No token' })
    const decoded = await getAuth().verifyIdToken(token)
    if (decoded.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin only' })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { articleId, title, summary, coverImage, category } = req.body || {}
  if (!articleId || typeof articleId !== 'string' || articleId.length > 128)
    return res.status(400).json({ error: 'Invalid articleId' })
  if (!title || typeof title !== 'string' || title.length > 300)
    return res.status(400).json({ error: 'Invalid title' })

  const catLabels = {
    school:'School & College', science:'Science & Tech',
    sports:'Sports', arts:'Arts & Culture', world:'World', opinion:'Opinion'
  }
  const payload = JSON.stringify({
    title,
    body:  summary || `New ${catLabels[category] || 'article'} just published on The Voice`,
    url:   `/article/${articleId}`,
    image: coverImage || null,
    icon:  '/icon-192.png',
    tag:   `article-${articleId}`
  })

  const db   = getDb()
  const snap = await db.collection('pushSubscriptions').get()
  let sent = 0, removed = 0

  await Promise.allSettled(
    snap.docs.map(async d => {
      const { subscription } = d.data()
      if (!subscription) return
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.collection('pushSubscriptions').doc(d.id).delete()
          removed++
        }
      }
    })
  )

  return res.status(200).json({ sent, removed })
}
