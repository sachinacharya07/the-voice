const CACHE_NAME = 'the-voice-v1'
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.svg']

// Install - cache static assets
self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

// Activate - clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch - network first, cache fallback for navigation
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/').then(r => r || fetch(e.request))
      )
    )
    return
  }
  // For other requests - network only (don't cache Firestore/Cloudinary)
  if (e.request.url.includes('firestore') || 
      e.request.url.includes('cloudinary') ||
      e.request.url.includes('googleapis')) {
    return
  }
})

// Push notifications
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = {} }
  const title = data.title || 'The Voice'
  const options = {
    body:    data.body    || 'New article published',
    icon:    data.icon    || '/icon-192.png',
    badge:   '/icon-192.png',
    image:   data.image   || null,
    tag:     data.tag     || 'the-voice-notification',
    renotify: true,
    data:    { url: data.url || '/' },
    actions: [
      { action: 'read',    title: 'Read now' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action === 'dismiss') return
  const url = e.notification.data?.url || '/'
  const fullUrl = self.location.origin + url
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(self.location.origin))
      if (existing) {
        existing.focus()
        if ('navigate' in existing) existing.navigate(fullUrl)
        return
      }
      return clients.openWindow(fullUrl)
    })
  )
})
