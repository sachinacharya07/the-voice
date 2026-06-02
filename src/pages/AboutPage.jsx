import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import styles from './AboutPage.module.css'

// Smooth scroll to anchor on load
function useScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }, [hash])
}

export default function AboutPage() {
  useScrollToHash()

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
            <p>The Voice started with a simple belief — students deserve a space where they can report, question, and be heard without anyone telling them what they can or can't say.</p>
            <p>We cover what actually matters to students across India. Exam paper leaks. Campus politics. Science breakthroughs nobody's talking about. Cultural movements that don't make it to prime time. Sports stories that deserve more than a footnote. And opinion pieces that say what everyone is thinking but nobody's writing.</p>
            <p>Every article on The Voice is written by a student, reviewed by a student editor, and read by people who deserve the truth straight — not filtered through institutional interests or advertiser pressure.</p>
          </section>

          {/* Values */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>What We Stand For</h2>
            <div className={styles.rule}/>
            <div className={styles.valuesGrid}>
              {[
                { word: 'Truth', desc: 'We report what is, not what\'s convenient. Every claim gets verified, every source gets protected, and every mistake gets corrected — publicly.' },
                { word: 'Courage', desc: 'We ask the uncomfortable questions. We cover the stories that make institutions nervous. We don\'t kill a piece because it\'s inconvenient for someone powerful.' },
                { word: 'Impact', desc: 'Journalism that changes nothing is just noise. Every story we publish is chosen because it matters — to students, to campuses, to the country.' },
                { word: 'Inclusion', desc: 'Not every student story sounds the same. We go out of our way to find voices from places, disciplines, and communities that rarely get a platform.' },
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
            <p>We get things wrong sometimes. When that happens, we don't quietly edit and hope nobody notices — we say so, clearly.</p>
            <ul className={styles.policyList}>
              <li><strong>Minor errors</strong> (a misspelled name, a wrong date) — corrected with a brief editor's note at the bottom of the article.</li>
              <li><strong>Significant errors</strong> that change the meaning of a story — corrected with a visible "Correction" notice at the top, explaining exactly what was wrong and what the right information is.</li>
              <li><strong>Unfixable errors</strong> — articles that can't be corrected without fundamentally misleading readers are retracted, with a clear notice explaining why.</li>
              <li>To flag an error, email us at <a href="mailto:the.voice.of.students01@gmail.com">the.voice.of.students01@gmail.com</a> with the article link and the specific issue.</li>
            </ul>
            <p>We don't delete corrections after publishing them. Our track record — including the times we've got it wrong — is part of what makes us credible.</p>
          </section>

          {/* Editorial independence */}
          <section className={styles.section}>
            <h2 className={styles.sectionHead}>Editorial Independence</h2>
            <div className={styles.rule}/>
            <p>The Voice has no advertisers, no institutional backers, and no political affiliation. Nobody funds us, which means nobody gets to tell us what to write.</p>
            <p>Writers submit articles for editorial review. The editorial team approves, requests changes, or rejects submissions based on one thing only — whether the story is accurate, newsworthy, and well-written. No story gets killed because it makes someone uncomfortable. That's not a policy we invented. It's just what journalism is supposed to be.</p>
          </section>

          {/* Contact */}
          <section className={styles.section} id="contact">
            <h2 className={styles.sectionHead}>Get in Touch</h2>
            <div className={styles.rule}/>
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <h4>General Enquiries</h4>
                <p>Questions about The Voice, our coverage, or how we work.</p>
                <a href="mailto:the.voice.of.students01@gmail.com" className={styles.emailLink}>the.voice.of.students01@gmail.com</a>
              </div>
              <div className={styles.contactCard}>
                <h4>Submit a News Tip</h4>
                <p>Know something we should be covering? Send it anonymously or with your name — your call.</p>
                <Link to="/tip" className={styles.contactBtn}>Send a Tip →</Link>
              </div>
              <div className={styles.contactCard}>
                <h4>Write for Us</h4>
                <p>You have something to say. We have a platform. Let's talk.</p>
                <Link to="/apply" className={styles.contactBtn}>Apply to Write →</Link>
              </div>
              <div className={styles.contactCard}>
                <h4>Letters to the Editor</h4>
                <p>Disagree with something we wrote? Good. Write to us and we might publish it.</p>
                <Link to="/letters" className={styles.contactBtn}>Write a Letter →</Link>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <div className={styles.footerNote}>
            <div className={styles.footerRule}/>
            <p>The Voice was founded in 2026. Built and maintained by Sachin Acharya.</p>
            <p>© {new Date().getFullYear()} The Voice. All rights reserved.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
