import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const SITE = process.env.ALLOWED_ORIGIN || 'https://the-voicee-lac.vercel.app'
const DEFAULT_IMG = `${SITE}/og-default.jpg`

// Full HTML attribute escaping — prevents XSS in og meta tags
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#x60;')
}

// Safe URL — only allow http/https, reject everything else
function safeUrl(url) {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return SITE
    return esc(url)
  } catch { return SITE }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).send('Method not allowed')
  }
  const id = req.query.id
  // Validate id — must be alphanumeric Firestore document ID
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return res.status(400).send('Invalid id')
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  try {
    const db = getFirestore()
    const snap = await db.collection('articles').doc(id).get()
    if (!snap.exists) return res.status(404).send('Not found')

    const a = snap.data()
    if (a.status !== 'published') return res.status(404).send('Not found')

    const title  = esc((a.title || 'The Voice').slice(0, 200))
    const desc   = esc((a.summary || a.body?.slice(0, 160) || 'Independent Student Journalism').slice(0, 200))
    const imgRaw = a.coverImage || DEFAULT_IMG
    const img    = safeUrl(imgRaw)
    const urlRaw = `${SITE}/article/${id}`
    const url    = safeUrl(urlRaw)
    const author = esc(a.authorName || 'The Voice')
    const cat    = esc(a.category || '')

    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title} — The Voice</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="The Voice"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="${img}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${url}"/>
  <meta property="article:author" content="${author}"/>
  <meta property="article:section" content="${cat}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@thevoicee01"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${img}"/>
  <script>window.location.replace(${JSON.stringify(urlRaw)})</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">article</a>…</p>
</body>
</html>`)
  } catch (err) {
    res.status(500).send('Error')
  }
}
