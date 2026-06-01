import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logo}>THE VOICE</div>
            <div className={styles.redRule}/>
            <p className={styles.tag}>Independent Student Journalism · Est. 2026</p>
          </div>
          <div className={styles.links}>
            <div className={styles.col}>
              <p className={styles.colHead}>Sections</p>
              <Link to="/category/school">School & College</Link>
              <Link to="/category/science">Science & Tech</Link>
              <Link to="/category/sports">Sports</Link>
              <Link to="/category/arts">Arts & Culture</Link>
              <Link to="/category/world">World</Link>
              <Link to="/category/opinion">Opinion</Link>
            </div>
            <div className={styles.col}>
              <p className={styles.colHead}>Discover</p>
              <Link to="/trending">Trending</Link>
              <Link to="/digest">Weekly Digest</Link>
              <Link to="/read-later">Saved Articles</Link>
            </div>
            <div className={styles.col}>
              <p className={styles.colHead}>About</p>
              <Link to="/about">About Us</Link>
              <Link to="/about#corrections">Corrections Policy</Link>
              <Link to="/about#contact">Contact</Link>
              <Link to="/tip">Send a Tip</Link>
              <Link to="/letters">Letters to the Editor</Link>
              <Link to="/apply">Write for Us</Link>
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} The Voice. All rights reserved.</span>
          <span>Built by Sachin Acharya · TISA 2026</span>
          <a href="mailto:tisa.helpdesk@gmail.com">tisa.helpdesk@gmail.com</a>
        </div>
      </div>
    </footer>
  )
}
