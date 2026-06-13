import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export default async function handler(req, res) {
  // Allow GET and POST only
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // Only allow Vercel cron or admin calls with secret
  const authHeader = req.headers.authorization || ''
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  const cronSecret = process.env.CRON_SECRET
  const isAdmin = cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isVercelCron && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const db = getFirestore()

    // Get articles from last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const snap = await db.collection('articles')
      .where('status', '==', 'published')
      .where('publishedAt', '>=', since)
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get()

    const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (articles.length === 0) {
      return res.status(200).json({ message: 'No articles this week, digest not created' })
    }

    // Sort by views for "top stories"
    const topStories = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)

    // Group by category
    const byCategory = articles.reduce((acc, a) => {
      if (!acc[a.category]) acc[a.category] = []
      acc[a.category].push(a)
      return acc
    }, {})

    // Build digest document
    const weekStart = since.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
    const weekEnd = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const digestData = {
      title: `The Voice Weekly — ${weekStart}–${weekEnd}`,
      weekOf: since,
      generatedAt: FieldValue.serverTimestamp(),
      topStories: topStories.map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        authorName: a.authorName || '',
        category: a.category || '',
        views: a.views || 0,
        coverImage: a.coverImage || null,
      })),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([cat, arts]) => [
          cat,
          arts.slice(0, 3).map(a => ({ id: a.id, title: a.title, authorName: a.authorName || '' }))
        ])
      ),
      articleCount: articles.length,
      status: 'published',
    }

    // Save to Firestore (overwrites current week's digest)
    const digestId = `week-${since.toISOString().split('T')[0]}`
    await db.collection('digests').doc(digestId).set(digestData)

    res.status(200).json({ success: true, digestId, articleCount: articles.length })
  } catch (err) {
    res.status(500).json({ error: 'Digest generation failed' })
  }
}
