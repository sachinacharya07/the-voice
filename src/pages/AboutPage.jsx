import { Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import styles from './AboutPage.module.css'

export default function AboutPage() {
  return (
    <PageWrapper>
      <div className={styles.wrap}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroRule}/>
          <h1 className={styles.heroLogo}>THE VOICE</h1>
          <div className={styles.heroRedRule}/>
          <p className={styles.heroTag}>Independent Student Journalism · Est. 2026</p>
        </div>

        <div className={styles.content}>
          {/* Mission */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Our Mission</h2>
            <div className={styles.rule}/>
            <p>The Voice is an independent student-run news platform committed to honest, fearless journalism. We exist to give students a space to report, question, and be heard — without editorial interference, without corporate interests, and without compromise.</p>
            <p>From exam paper leaks to campus politics, from science breakthroughs to arts and culture, we cover what matters to students across India. Every article published on The Voice is written by a student, reviewed by a student editor, and read by students who deserve the truth.</p>
            <p>We believe that good journalism is not a privilege. It is a right. And every student who picks up a pen — or a keyboard — deserves a platform worthy of their voice.</p>
          </section>

          {/* Values */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>What We Stand For</h2>
            <div className={styles.rule}/>
            <div className={styles.valuesGrid}>
              {[
                { word: 'Truth', desc: 'We report what is, not what is convenient. Every claim is verified, every source is protected, and every correction is published transparently.' },
                { word: 'Courage', desc: 'We ask the hard questions. We hold institutions accountable. We do not back down from stories that make people uncomfortable.' },
                { word: 'Impact', desc: 'Journalism that does not change anything is noise. Every story we publish is chosen because it matters — to students, to campuses, to the country.' },
                { word: 'Inclusion', desc: 'Every student has a story. We actively seek out voices from underrepresented communities, disciplines, and regions.' },
              ].map(v => (
                <div key={v.word} className={styles.valueCard}>
                  <h3>{v.word}</h3>
                  <p>{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Corrections policy */}
          <section className={styles.section} id="corrections">
            <h2 className={styles.sectionHead}>Corrections Policy</h2>
            <div className={styles.rule}/>
            <p>The Voice is committed to accuracy. When we get something wrong, we say so — clearly and without burying the correction.</p>
            <ul className={styles.policyList}>
              <li>Minor factual errors (spelling of a name, wrong date) are corrected silently with an editor's note appended to the article.</li>
              <li>Significant errors that change the meaning of a story are corrected with a visible "Correction" notice at the top of the article, stating what was wrong and what the correct information is.</li>
              <li>Articles that cannot be corrected without fundamentally misleading readers are retracted entirely, with a notice explaining why.</li>
              <li>To request a correction, email us at <a href="mailto:tisa.helpdesk@gmail.com">tisa.helpdesk@gmail.com</a> with the article link and the specific error.</li>
            </ul>
            <p>We do not delete corrections after the fact. Our record of getting things right — and admitting when we don't — is part of our credibility.</p>
          </section>

          {/* Editorial independence */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Editorial Independence</h2>
            <div className={styles.rule}/>
            <p>The Voice is entirely student-run and editorially independent. We have no advertisers, no institutional backers, and no political affiliations. No article is published because of who funds us — because nobody does. We exist to serve our readers and our readers alone.</p>
            <p>Writers submit articles for editorial review. The editorial team approves, requests changes, or rejects submissions based solely on accuracy, newsworthiness, and quality of writing. No story is killed because it is inconvenient for any individual, institution, or organisation.</p>
          </section>

          {/* Contact */}
          <section className={styles.section} id="contact">
            <h2 className={styles.sectionHead}>Contact Us</h2>
            <div className={styles.rule}/>
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <h4>General Enquiries</h4>
                <p>For questions about The Voice, our coverage, or our policies.</p>
                <a href="mailto:tisa.helpdesk@gmail.com" className={styles.emailLink}>tisa.helpdesk@gmail.com</a>
              </div>
              <div className={styles.contactCard}>
                <h4>Submit a News Tip</h4>
                <p>Got a story we should know about? Send it anonymously or with your name.</p>
                <Link to="/tip" className={styles.contactBtn}>Send a Tip →</Link>
              </div>
              <div className={styles.contactCard}>
                <h4>Write for Us</h4>
                <p>Are you a student with something to say? We want to hear from you.</p>
                <Link to="/apply" className={styles.contactBtn}>Apply to Write →</Link>
              </div>
              <div className={styles.contactCard}>
                <h4>Letters to the Editor</h4>
                <p>Disagree with something we wrote? We publish responses to our coverage.</p>
                <Link to="/letters" className={styles.contactBtn}>Write a Letter →</Link>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <div className={styles.footerNote}>
            <div className={styles.footerRule}/>
            <p>The Voice was founded in 2026. It is built and maintained by Sachin Acharya under the TISA platform.</p>
            <p>© {new Date().getFullYear()} The Voice. All rights reserved.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
