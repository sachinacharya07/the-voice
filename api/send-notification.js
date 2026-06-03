// Vercel serverless function — POST /api/send-notification
// Called from admin panel to send push to all subscribers

const webpush = require('web-push')
const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

// VAPID config
const VAPID_PUBLIC  = 'BN5mU9Cdw3invMuKF11AWrY-reayQH11LXWdwI8oFKTeWjyHl7meISb5NWFvOrfbC_676WT6hQuBAHNA5XR1yGY'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL   = 'mailto:the.voice.of.students01@gmail.com'
const ADMIN_EMAIL   = 'tisa.helpdesk@gmail.com'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

// Init Firebase Admin (only once)
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

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth check — verify admin token from Firebase Auth
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { getAuth } = require('firebase-admin/auth')
    const token = authHeader.split('Bearer ')[1]
    const decoded = await getAuth().verifyIdToken(token)
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden — admin only' })
    }
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { title, body, url, image } = req.body
  if (!title || !body) return res.status(400).json({ error: 'title and body required' })

  const payload = JSON.stringify({
    title,
    body,
    url:   url   || '/',
    image: image || null,
    icon:  '/icon-192.png',
    tag:   'the-voice-' + Date.now()
  })

  // Get all subscriptions from Firestore
  const db = getDb()
  const snap = await db.collection('pushSubscriptions').get()

  let sent = 0, failed = 0, removed = 0

  const sends = snap.docs.map(async docSnap => {
    const { subscription, userId } = docSnap.data()
    if (!subscription) return

    try {
      await webpush.sendNotification(subscription, payload)
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — remove it
        await db.collection('pushSubscriptions').doc(docSnap.id).delete()
        removed++
      } else {
        failed++
      }
    }
  })

  await Promise.allSettled(sends)
  return res.status(200).json({ sent, failed, removed, total: snap.size })
}
