import { useEffect, useRef } from 'react'
import styles from './PageWrapper.module.css'

export default function PageWrapper({ children, style }) {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.add(styles.enter)
    const t = setTimeout(() => el.classList.add(styles.visible), 10)
    return () => clearTimeout(t)
  }, [])
  return (
    <main ref={ref} className={styles.wrap} style={style}>
      {children}
    </main>
  )
}
