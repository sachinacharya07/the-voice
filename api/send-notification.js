// Vercel serverless function — POST /api/send-notification
// Called from admin panel to send manual push to all subscribers
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
  const allowedOrigin = process.env.ALLOWED_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  if (!allowedOrigin) {
    return res.status(503).json({ error: 'ALLOWED_ORIGIN not configured' })
  }
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth check — verify admin Firebase token
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const token   = authHeader.split('Bearer ')[1]
    const decoded = await getAuth().verifyIdToken(token)
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin only' })
    }
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Validate input
  const { title, body, url, image } = req.body || {}
  if (!title || typeof title !== 'string' || title.length > 300) {
    return res.status(400).json({ error: 'title required, max 300 chars' })
  }
  if (!body || typeof body !== 'string' || body.length > 500) {
    return res.status(400).json({ error: 'body required, max 500 chars' })
  }
  if (url && (typeof url !== 'string' || url.length > 500)) {
    return res.status(400).json({ error: 'Invalid url' })
  }

  const payload = JSON.stringify({
    title,
    body,
    url:   url   || '/',
    image: image || null,
    icon:  '/icon-192.png',
    tag:   'the-voice-' + Date.now()
  })

  const db   = getDb()
  const snap = await db.collection('pushSubscriptions').get()
  let sent = 0, failed = 0, removed = 0

  await Promise.allSettled(
    snap.docs.map(async docSnap => {
      const { subscription } = docSnap.data()
      if (!subscription) return
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.collection('pushSubscriptions').doc(docSnap.id).delete()
          removed++
        } else {
          failed++
        }
      }
    })
  )

  return res.status(200).json({ sent, failed, removed, total: snap.size })
}
