import { motion } from 'framer-motion'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.logoWrap}>
        <span className={styles.logoThe}>the</span>
        <div className={styles.logo}>Voice</div>
      </div>
      <div className={styles.rule} />
    </motion.div>
  )
}
