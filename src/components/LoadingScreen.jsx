import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.wrap}>
      <div className={styles.logoWrap}>
        <span className={styles.logoThe}>the</span>
        <div className={styles.logo}>Voice</div>
      </div>
      <div className={styles.rule} />
    </div>
  )
}
