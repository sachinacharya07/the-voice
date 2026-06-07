import { Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage(){
  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.inner}>
          <div className={styles.num}>404</div>
          <div className={styles.rule}/>
          <h1 className={styles.hed}>Page not found</h1>
          <p className={styles.dek}>The article or page you're looking for has been removed, moved, or never existed. Check the URL or head back home.</p>
          <div className={styles.actions}>
            <Link to="/" className={styles.btnPrimary}>Back to homepage</Link>
            <Link to="/trending" className={styles.btnSecondary}>See trending</Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
