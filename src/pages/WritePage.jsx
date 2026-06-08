import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
import { ImagePlus, X, Loader, Plus } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../lib/cloudinary'
import PageWrapper from '../components/PageWrapper'
import styles from './WritePage.module.css'

function insertFormat(ta, before, after, placeholder) {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = ta.value.substring(start, end)
  const insertion = before + (selected || placeholder) + after
  const value = ta.value.substring(0, start) + insertion + ta.value.substring(end)
  const cursor = start + before.length + (selected || placeholder).length + after.length
  return { value, cursor }
}

const CATEGORIES = [
  {value:'school',label:'School & College'},{value:'science',label:'Science & Technology'},
  {value:'sports',label:'Sports'},{value:'arts',label:'Arts & Culture'},
  {value:'world',label:'World News'},{value:'opinion',label:'Opinion & Editorial'},
]

export default function WritePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = !!editId
  const fileRef = useRef()
  const inlineFileRef = useRef()
  const bodyRef = useRef()
  const saveTimer = useRef()

  const [form, setForm] = useState({title:'',category:'school',subGenre:'',summary:'',body:'',pullQuote:'',coAuthorName:'',coAuthorEmail:''})
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [sources, setSources] = useState([''])
  const [coverImage, setCoverImage] = useState(null)
  const [sections, setSections] = useState({isOriginal:false,isExplained:false,isBplus:false})
  const [coverPreview, setCoverPreview] = useState(null)
  const [inlineImages, setInlineImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [isDraft, setIsDraft] = useState(false)

  // Load article if editing
  useEffect(()=>{
    if(!editId)return
    getDoc(doc(db,'articles',editId)).then(snap=>{
      if(!snap.exists())return
      const d=snap.data()
      setForm({title:d.title||'',category:d.category||'school',subGenre:d.subGenre||'',summary:d.summary||'',body:d.body||'',pullQuote:d.pullQuote||'',coAuthorName:d.coAuthorName||'',coAuthorEmail:d.coAuthorEmail||''})
      setTags(d.tags||[])
      setSources(d.sources||[''])
      setCoverImage(d.coverImage||null)
      setCoverPreview(d.coverImage||null)
      setInlineImages(d.inlineImages||[])
    })
  },[editId])

  // Auto-save draft every 30s
  useEffect(()=>{
    if(!form.title&&!form.body)return
    clearTimeout(saveTimer.current)
    saveTimer.current=setTimeout(()=>{
      const draft={...form,tags,sources,coverImage,inlineImages,...sections,savedAt:Date.now()}
      localStorage.setItem('voice_draft',JSON.stringify(draft))
      setLastSaved(new Date())
      setIsDraft(true)
    },30000)
    return()=>clearTimeout(saveTimer.current)
  },[form,tags,sources,coverImage,inlineImages])

  // Load draft
  useEffect(()=>{
    if(isEdit)return
    const saved=localStorage.getItem('voice_draft')
    if(saved){
      try{
        const d=JSON.parse(saved)
        if(d.title||d.body){
          if(window.confirm('You have an unsaved draft. Restore it?')){
            setForm({title:d.title||'',category:d.category||'school',subGenre:d.subGenre||'',summary:d.summary||'',body:d.body||'',pullQuote:d.pullQuote||'',coAuthorName:d.coAuthorName||'',coAuthorEmail:d.coAuthorEmail||''})
            setTags(d.tags||[]);setSources(d.sources||['']);setCoverImage(d.coverImage||null);setCoverPreview(d.coverImage||null);setInlineImages(d.inlineImages||[])
            setSections({isOriginal:!!d.isOriginal,isExplained:!!d.isExplained,isBplus:!!d.isBplus})
            setIsDraft(true)
          }
        }
      }catch{}
    }
  },[])

  const handleImageSelect=async(e)=>{
    const file=e.target.files[0];if(!file)return
    if(file.size>10*1024*1024){setError('Image must be under 10MB');return}
    setCoverPreview(URL.createObjectURL(file));setUploading(true);setError('')
    try{const url=await uploadImage(file);setCoverImage(url)}
    catch{setError('Image upload failed.');setCoverPreview(null)}
    setUploading(false)
  }

  const handleInlineImage=async(e)=>{
    const file=e.target.files[0];if(!file)return
    setUploading(true)
    try{
      const url=await uploadImage(file)
      setInlineImages(imgs=>[...imgs,{url,caption:''}])
    }catch{setError('Inline image upload failed.')}
    setUploading(false)
  }

  const addTag=()=>{
    const t=tagInput.trim().replace(/^#/,'').toLowerCase()
    if(t&&!tags.includes(t)&&tags.length<8){setTags(ts=>[...ts,t]);setTagInput('')}
  }

  const handleSubmit=async()=>{
    if(!form.title.trim()||!form.body.trim()){setError('Headline and article body required.');return}
    if(form.title.trim().length>300){setError('Headline must be under 300 characters.');return}
    if(form.body.trim().length>150000){setError('Article body too long (max ~25,000 words).');return}
    if(form.summary.trim().length>600){setError('Summary must be under 600 characters.');return}
    if(uploading){setError('Please wait for image upload to finish.');return}
    setSubmitting(true);setError('')
    const data={
      title:form.title.trim().slice(0,300),category:form.category,subGenre:form.subGenre.trim().replace(/<[^>]*>/g,'').slice(0,80),summary:form.summary.trim().slice(0,600),
      body:form.body.trim(),pullQuote:form.pullQuote.trim(),
      coAuthorName:form.coAuthorName.trim(),coAuthorEmail:form.coAuthorEmail.trim(),
      coverImage:coverImage||null,inlineImages,tags,
      sources:sources.filter(Boolean),
      ...sections,
      authorId:user.uid,authorName:profile?.name||user.displayName||user.email,
      authorPhoto:user.photoURL||null,
    }
    try{
      if(isEdit){
        await updateDoc(doc(db,'articles',editId),data)
        localStorage.removeItem('voice_draft')
        navigate(`/article/${editId}`)
      } else {
        await addDoc(collection(db,'articles'),{
          ...data,status:'pending',likes:0,views:0,likedBy:[],bookmarkedBy:[],
          reactions:{},userReactions:{},submittedAt:serverTimestamp(),publishedAt:null,
        })
        localStorage.removeItem('voice_draft')
        setSuccess(true)
      }
    }catch(e){setError(e.message)}
    setSubmitting(false)
  }

  if(success)return(
    <PageWrapper>
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2>Submitted!</h2>
          <p>Your article is under editorial review. It'll go live once approved.</p>
          <div className={styles.successActions}>
            <button onClick={()=>navigate('/dashboard')} className={styles.btnBlack}>View my dashboard</button>
            <button onClick={()=>{setSuccess(false);setForm({title:'',category:'school',subGenre:'',summary:'',body:'',pullQuote:'',coAuthorName:'',coAuthorEmail:''});setTags([]);setSources(['']);setCoverImage(null);setCoverPreview(null);setInlineImages([]);setSections({isOriginal:false,isExplained:false,isBplus:false})}} className={styles.btnOutline}>Write another</button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )

  const applyFormat = (before, after='', placeholder='text') => {
    const ta = bodyRef.current
    if (!ta) return
    const { value, cursor } = insertFormat(ta, before, after, placeholder)
    setForm(f => ({...f, body: value}))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursor, cursor) }, 0)
  }

  return(
    <PageWrapper>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1>{isEdit?'Edit article':'Submit an article'}</h1>
          <p>{isEdit?'Changes will be saved immediately.':'All submissions go through editorial review before publishing.'}</p>
          {lastSaved&&<span className={styles.autosave}>Draft autosaved at {lastSaved.toLocaleTimeString()}</span>}
        </div>

        {error&&<div className={styles.error}>{error}</div>}

        {/* Cover image */}
        <div className={styles.section}>
          <label className={styles.label}>Cover image</label>
          {coverPreview?(
            <div className={styles.previewWrap}>
              <img src={coverPreview} alt="" className={styles.preview}/>
              {uploading&&<div className={styles.uploadingOverlay}><Loader size={24} className={styles.spinner}/><span>Uploading...</span></div>}
              {!uploading&&<button className={styles.removeImg} onClick={()=>{setCoverImage(null);setCoverPreview(null)}}><X size={16}/> Remove</button>}
            </div>
          ):(
            <button className={styles.uploadBtn} onClick={()=>fileRef.current.click()}>
              <ImagePlus size={20}/><span>Upload cover image</span><small>JPG, PNG, WEBP · max 10MB</small>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageSelect}/>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Headline *</label>
          <input className={styles.input} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="A sharp, clear headline"/>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Section *</label>
          <select className={styles.input} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
            {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Sub-genre <span className={styles.optional}>(optional — e.g. Movie Review, Book Review, Campus Life)</span></label>
          <input className={styles.input} value={form.subGenre} onChange={e=>setForm(f=>({...f,subGenre:e.target.value}))}
            placeholder="e.g. Movie Review, Interview, Photo Essay, Opinion..."/>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Feature in</label>
          <div className={styles.checkRow}>
            {[{key:'isOriginal',label:'The Voice Originals'},{key:'isExplained',label:'Explained'},{key:'isBplus',label:'B+ Good News'}].map(({key,label})=>(
              <label key={key} className={styles.checkLabel}>
                <input type="checkbox" checked={sections[key]} onChange={e=>setSections(s=>({...s,[key]:e.target.checked}))}/>
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Summary</label>
          <input className={styles.input} value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))} placeholder="1–2 sentences about the story"/>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Article body *</label>
          <div className={styles.toolbar}>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('**','**','bold text')} title="Bold"><b>B</b></button>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('_','_','italic text')} title="Italic"><i>I</i></button>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('\n## ','',' Heading')} title="Heading">H2</button>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('\n> ','',' Quote text')} title="Blockquote">❝</button>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('\n• ','',' List item')} title="Bullet">•</button>
            <div className={styles.toolbarSep}/>
            <button type="button" className={styles.toolbarBtn} onClick={()=>applyFormat('\n[image:',']',String(inlineImages.length+1))} title="Insert image marker">📷</button>
            <button type="button" className={styles.toolbarBtn} onClick={()=>{const url=prompt('YouTube or link URL:');if(url)setForm(f=>({...f,body:f.body+'\n'+url}))}} title="Insert link/video">🔗</button>
          </div>
          <textarea ref={bodyRef} className={styles.textarea} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder={"Write your full story here.\n\nTips:\n• Each new line = new paragraph\n• ## Heading for section titles\n• **text** for bold, _text_ for italic\n• > text for blockquote\n• Paste a YouTube URL on its own line to embed it"}/>
          <div className={styles.wordCount}>{form.body.trim().split(/\s+/).filter(Boolean).length} words · ~{Math.max(1,Math.ceil(form.body.trim().split(/\s+/).length/200))} min read</div>
        </div>

        {/* Inline images */}
        <div className={styles.section}>
          <label className={styles.label}>Images inside article</label>
          <p className={styles.hint}>Upload images below, then place them in your article body by typing <code>[image:1]</code>, <code>[image:2]</code> etc. where you want each to appear. If you don't use markers, images are auto-placed every 3 paragraphs.</p>
          <div className={styles.inlineImagesList}>
            {inlineImages.map((img,i)=>(
              <div key={i} className={styles.inlineImgRow}>
                <div className={styles.inlineImgNum}>{i+1}</div>
                <img src={img.url} alt="" className={styles.inlineThumb}/>
                <div className={styles.inlineImgMeta}>
                  <code className={styles.imgMarker}>[image:{i+1}]</code>
                  <input className={styles.captionInput} value={img.caption} onChange={e=>setInlineImages(imgs=>imgs.map((m,j)=>j===i?{...m,caption:e.target.value}:m))} placeholder="Add a caption..."/>
                </div>
                <button className={styles.removeInline} onClick={()=>setInlineImages(imgs=>imgs.filter((_,j)=>j!==i))}><X size={14}/></button>
              </div>
            ))}
          </div>
          <div className={styles.inlineBtns}>
            <button className={styles.addInlineBtn} onClick={()=>inlineFileRef.current.click()} disabled={uploading}>
              <Plus size={14}/> Upload image
            </button>
            <button className={styles.addInlineBtn} onClick={()=>{
              const url=prompt('Paste image URL:')
              if(url&&url.startsWith('http'))setInlineImages(imgs=>[...imgs,{url,caption:''}])
            }}>
              <Plus size={14}/> Paste URL
            </button>
          </div>
          <input ref={inlineFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleInlineImage}/>
          <p className={styles.hint} style={{marginTop:'0.5rem'}}>You can also paste a YouTube URL or any link on its own line in the article body — it will embed automatically.</p>
        </div>

        {/* Pullout quote */}
        <div className={styles.section}>
          <label className={styles.label}>Pullout quote <span className={styles.optional}>(displayed large on banner)</span></label>
          <input className={styles.input} value={form.pullQuote} onChange={e=>setForm(f=>({...f,pullQuote:e.target.value}))} placeholder="A powerful line from the article"/>
        </div>

        {/* Tags */}
        <div className={styles.section}>
          <label className={styles.label}>Tags</label>
          <div className={styles.tagRow}>
            {tags.map(t=>(
              <span key={t} className={styles.tagChip}>#{t}<button onClick={()=>setTags(ts=>ts.filter(x=>x!==t))}><X size={10}/></button></span>
            ))}
            <input className={styles.tagInput} value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();addTag()}}}
              placeholder="Type tag + Enter (e.g. NEET, JEE, Campus)"/>
          </div>
        </div>

        {/* Sources */}
        <div className={styles.section}>
          <label className={styles.label}>Sources <span className={styles.optional}>(shown at bottom of article)</span></label>
          {sources.map((s,i)=>(
            <div key={i} className={styles.sourceRow}>
              <input className={styles.input} value={s} onChange={e=>setSources(ss=>ss.map((x,j)=>j===i?e.target.value:x))} placeholder={`Source ${i+1} (URL or reference)`}/>
              {sources.length>1&&<button className={styles.removeSource} onClick={()=>setSources(ss=>ss.filter((_,j)=>j!==i))}><X size={14}/></button>}
            </div>
          ))}
          <button className={styles.addSourceBtn} onClick={()=>setSources(ss=>[...ss,''])}>+ Add source</button>
        </div>

        {/* Co-author */}
        <div className={styles.section}>
          <label className={styles.label}>Co-author <span className={styles.optional}>(optional)</span></label>
          <div className={styles.coAuthorRow}>
            <input className={styles.input} value={form.coAuthorName} onChange={e=>setForm(f=>({...f,coAuthorName:e.target.value}))} placeholder="Co-author name"/>
            <input className={styles.input} value={form.coAuthorEmail} onChange={e=>setForm(f=>({...f,coAuthorEmail:e.target.value}))} placeholder="Co-author email"/>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnBlack} onClick={handleSubmit} disabled={submitting||uploading}>
            {submitting?'Saving...':(isEdit?'Save changes':'Submit for review')}
          </button>
          <button className={styles.btnOutline} onClick={()=>{
            const draft={...form,tags,sources,coverImage,inlineImages,savedAt:Date.now()}
            localStorage.setItem('voice_draft',JSON.stringify(draft))
            setLastSaved(new Date());setIsDraft(true)
            alert('Draft saved!')
          }}>Save draft</button>
          <button className={styles.btnOutline} onClick={()=>navigate(-1)}>Cancel</button>
        </div>
      </div>
    </PageWrapper>
  )
}
