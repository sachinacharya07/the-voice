import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PageWrapper from '../components/PageWrapper'
import styles from './EpaperPage.module.css'

function fmtDate(ts){
  if(!ts)return''
  return ts.toDate().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})
}

export default function EpaperPage(){
  const [epapers,setEpapers]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    getDocs(query(collection(db,'epapers'),orderBy('publishedAt','desc')))
      .then(snap=>setEpapers(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  },[])

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.masthead}>
          <span className={styles.badge}>PDF Archive</span>
          <h1>E-Paper</h1>
          <p>Download past issues of The Voice in high-quality PDF format.</p>
        </div>
        {loading?(
          <div className={styles.grid}>
            {[...Array(6)].map((_,i)=><div key={i} className={styles.skeleton}/>)}
          </div>
        ):epapers.length===0?(
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2>No issues yet</h2>
            <p>E-papers will appear here once the editorial team publishes them.</p>
          </div>
        ):(
          <div className={styles.grid}>
            {epapers.map(ep=>(
              <div key={ep.id} className={styles.card}>
                <div className={styles.thumb}>
                  {ep.thumbUrl
                    ? <img src={ep.thumbUrl} alt={ep.title}/>
                    : (
                      <div className={styles.thumbPlaceholder}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <span>PDF</span>
                      </div>
                    )
                  }
                  <div className={styles.thumbOverlay}>
                    <a href={ep.pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.previewBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Preview
                    </a>
                  </div>
                </div>
                <div className={styles.body}>
                  {ep.vol&&ep.num&&<div className={styles.vol}>Vol. {ep.vol} · No. {ep.num}</div>}
                  <h2 className={styles.title}>{ep.title||'The Voice'}</h2>
                  <p className={styles.date}>{fmtDate(ep.publishedAt)}</p>
                  {ep.description&&<p className={styles.desc}>{ep.description}</p>}
                  <a href={ep.pdfUrl} target="_blank" rel="noopener noreferrer" download className={styles.downloadBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
