import { usePWA } from '../context/PWAContext'
import { useAuth } from '../context/AuthContext'
import { Bell, BellOff, Download } from 'lucide-react'
import { useState } from 'react'
import styles from './NotificationSettings.module.css'

export default function NotificationSettings() {
  const { isInstalled, pushSupported, pushEnabled, installPrompt, promptInstall, enablePush, disablePush } = usePWA()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const toggle = async () => {
    setLoading(true); setMsg('')
    if (pushEnabled) {
      await disablePush(user?.uid)
      setMsg('Notifications disabled.')
    } else {
      const result = await enablePush(user?.uid)
      if (result === true) setMsg('✓ Notifications enabled!')
      else if (result === 'denied') setMsg('Blocked — enable notifications in browser Settings → Site Settings.')
      else setMsg('Something went wrong. Try refreshing the page.')
    }
    setLoading(false)
  }

  if (!pushSupported) return (
    <div className={styles.card}>
      <p className={styles.unsupported}>Push notifications aren't supported on this browser.</p>
    </div>
  )

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.info}>
          {pushEnabled ? <Bell size={18} className={styles.iconOn}/> : <BellOff size={18} className={styles.iconOff}/>}
          <div>
            <strong>{pushEnabled ? 'Notifications on' : 'Notifications off'}</strong>
            <span>{pushEnabled ? 'You\'ll be notified of new articles and breaking news.' : 'Turn on to get alerts for new articles and breaking news.'}</span>
          </div>
        </div>
        <button className={`${styles.toggleBtn} ${pushEnabled ? styles.on : ''}`}
          onClick={toggle} disabled={loading}>
          {loading ? '...' : pushEnabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      {msg && <p className={styles.msg}>{msg}</p>}
      {!isInstalled && installPrompt && (
        <div className={styles.installRow}>
          <Download size={14}/>
          <span>Install the app for the best notification experience.</span>
          <button className={styles.installBtn} onClick={promptInstall}>Install</button>
        </div>
      )}
    </div>
  )
}
