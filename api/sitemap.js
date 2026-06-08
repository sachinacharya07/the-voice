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

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/trending', priority: '0.8', changefreq: 'daily' },
  { url: '/digest', priority: '0.7', changefreq: 'weekly' },
  { url: '/originals', priority: '0.7', changefreq: 'weekly' },
  { url: '/explained', priority: '0.7', changefreq: 'weekly' },
  { url: '/bplus', priority: '0.6', changefreq: 'weekly' },
  { url: '/epaper', priority: '0.6', changefreq: 'monthly' },
  { url: '/about', priority: '0.5', changefreq: 'monthly' },
  { url: '/apply', priority: '0.5', changefreq: 'monthly' },
]

const CATEGORIES = ['school','science','sports','arts','world','opinion']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')

  try {
    const db = getFirestore()
    const snap = await db.collection('articles')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(500)
      .get()

    const articles = snap.docs.map(d => {
      const data = d.data()
      const ts = data.publishedAt?.toDate?.()
      return {
        id: d.id,
        lastmod: ts ? ts.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }
    })

    const urlset = [
      ...STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),
      ...CATEGORIES.map(cat => `
  <url>
    <loc>${SITE}/category/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`),
      ...articles.map(a => `
  <url>
    <loc>${SITE}/article/${a.id}</loc>
    <lastmod>${a.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`),
    ].join('')

    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`)
  } catch (err) {
    console.error('Sitemap error:', err)
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
  }
}
