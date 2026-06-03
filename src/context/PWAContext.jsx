import { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

const Ctx = createContext(null)
export const usePWA = () => useContext(Ctx)

// VAPID public key — replace with your own from web-push library
// To generate: npx web-push generate-vapid-keys
// For now using a placeholder — push won't work until replaced
export const VAPID_PUBLIC_KEY = 'BN5mU9Cdw3invMuKF11AWrY-reayQH11LXWdwI8oFKTeWjyHl7meISb5NWFvOrfbC_676WT6hQuBAHNA5XR1yGY'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function PWAProvider({ children }) {
  const [installPrompt, setInstallPrompt]   = useState(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [pushSupported, setPushSupported]   = useState(false)
  const [pushEnabled, setPushEnabled]       = useState(false)
  const [swReady, setSwReady]               = useState(false)

  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true)
    }

    // Capture install prompt
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    // Check push support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.ready.then(reg => {
        setSwReady(true)
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setPushEnabled(true)
        })
      })
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null) }
    return outcome === 'accepted'
  }

  const enablePush = async (userId) => {
    if (!pushSupported || !swReady) return false
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      // Save subscription to Firestore
      if (userId) {
        await setDoc(doc(db, 'pushSubscriptions', userId), {
          subscription: JSON.parse(JSON.stringify(sub)),
          userId,
          updatedAt: serverTimestamp()
        })
      }
      setPushEnabled(true)
      return true
    } catch { return false }
  }

  const disablePush = async (userId) => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      if (userId) await deleteDoc(doc(db, 'pushSubscriptions', userId))
      setPushEnabled(false)
    } catch {}
  }

  return (
    <Ctx.Provider value={{
      installPrompt: !!installPrompt,
      isInstalled,
      pushSupported,
      pushEnabled,
      swReady,
      promptInstall,
      enablePush,
      disablePush
    }}>
      {children}
    </Ctx.Provider>
  )
}
