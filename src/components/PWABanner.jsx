import { useState, useEffect } from 'react'
import { usePWA } from '../context/PWAContext'
import { useAuth } from '../context/AuthContext'
import { X, Download, Bell, BellOff } from 'lucide-react'
import styles from './PWABanner.module.css'

export default function PWABanner() {
  const { installPrompt, isInstalled, pushSupported, pushEnabled, promptInstall, enablePush, disablePush } = usePWA()
  const { user } = useAuth()
  const [showInstall, setShowInstall] = useState(false)
  const [showPush, setShowPush]       = useState(false)
  const [pushStatus, setPushStatus]   = useState('idle') // idle|loading|done|denied

  useEffect(() => {
    // Show install banner after 3s if not installed and prompt available
    if (!isInstalled && installPrompt) {
      const t = setTimeout(() => setShowInstall(true), 3000)
      return () => clearTimeout(t)
    }
  }, [isInstalled, installPrompt])

  useEffect(() => {
    // Show push banner after 8s if logged in, push supported, not yet enabled
    if (user && pushSupported && !pushEnabled) {
      const t = setTimeout(() => setShowPush(true), 8000)
      return () => clearTimeout(t)
    }
  }, [user, pushSupported, pushEnabled, isInstalled])

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) setShowInstall(false)
  }

  const handlePush = async () => {
    setPushStatus('loading')
    const result = await enablePush(user?.uid)
    if (result === true) {
      setPushStatus('done')
      setTimeout(() => setShowPush(false), 2000)
    } else if (result === 'denied') {
      setPushStatus('blocked')
    } else {
      setPushStatus('error')
    }
  }

  const handleDisablePush = async () => {
    await disablePush(user?.uid)
    setShowPush(false)
  }

  return (
    <>
      {/* Install banner */}
      {showInstall && (
        <div className={styles.banner}>
          <div className={styles.bannerLeft}>
            <img src="/icon-192.png" alt="" className={styles.appIcon} />
            <div>
              <strong>Add The Voice to your home screen</strong>
              <span>Read faster, offline support, full-screen experience</span>
            </div>
          </div>
          <div className={styles.bannerRight}>
            <button className={styles.installBtn} onClick={handleInstall}>
              <Download size={14}/> Install
            </button>
            <button className={styles.dismissBtn} onClick={() => setShowInstall(false)}>
              <X size={16}/>
            </button>
          </div>
        </div>
      )}

      {/* Push notification banner */}
      {showPush && !showInstall && (
        <div className={`${styles.banner} ${styles.pushBanner}`}>
          <div className={styles.bannerLeft}>
            <Bell size={20} className={styles.bellIcon}/>
            <div>
              <strong>Stay up to date</strong>
              <span>Get notified when new articles and breaking news drop</span>
            </div>
          </div>
          <div className={styles.bannerRight}>
            {pushStatus === 'done'    && <span className={styles.doneMsg}>✓ Notifications on</span>}
            {pushStatus === 'blocked' && <span className={styles.deniedMsg}>Blocked in browser settings</span>}
            {pushStatus === 'error'   && <span className={styles.deniedMsg}>Failed — try refreshing</span>}
            {(pushStatus === 'idle' || pushStatus === 'loading') && (
              <button className={styles.installBtn} onClick={handlePush} disabled={pushStatus === 'loading'}>
                <Bell size={14}/> {pushStatus === 'loading' ? 'Enabling...' : 'Enable'}
              </button>
            )}
            <button className={styles.dismissBtn} onClick={() => setShowPush(false)}>
              <X size={16}/>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
