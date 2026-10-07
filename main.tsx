import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import './index.css'

type Result = { label: 'GENUINE' | 'DEEPFAKE'; confidence: number; filename: string; note?: string }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .25 }, transition: { duration: .6, ease: [.22,1,.36,1] } }

function Ticket({ result }: { result: Result | null }) {
  const [digits, setDigits] = useState<string[]>(['—','—','—','—'])
  useEffect(() => {
    if (!result) { setDigits(['—','—','—','—']); return }
    const value = String(Math.round(result.confidence * 100)).padStart(4, '0')
    value.split('').forEach((d, i) => setTimeout(() => setDigits(prev => { const n=[...prev]; n[i]=d; return n }), i * 60))
  }, [result])
  return <div className={`ticket ${result ? 'submitted' : ''} mx-auto`} aria-label={result ? `${result.label}, confidence ${Math.round(result.confidence*100)} percent` : 'No analysis yet'}>
    <div className="absolute left-4 top-4 right-4 flex justify-between">
      <span className="meta">VERA EARLY ACCESS</span><span className="meta">AI MEDIA CHECK</span>
    </div>
    <div className="absolute left-[92px] md:left-[112px] top-[52px]">
      <div className="meta text-[#6B6B70]">CONFIDENCE</div>
      <div className="display text-[58px] md:text-[72px] tracking-[-.06em] leading-none mt-2 overflow-hidden h-[72px] md:h-[80px] flex gap-1">
        {digits.map((d,i)=><motion.span key={i} initial={false} animate={{y:0, opacity:1}} transition={{delay:i*.06,duration:.35,ease:[.22,1,.36,1]}}>{d}</motion.span>)}
      </div>
    </div>
    <div className="absolute left-4 bottom-4">
      <div className="meta">{result ? result.label : 'AWAITING IMAGE'}</div>
    </div>
    <div className="ticket-line" />
  </div>
}

function UploadAnalyzer({ onResult }: { onResult: (r: Result) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const selectFile = (f?: File) => {
    if (!f) return
    setError('')
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('Image must be 10 MB or smaller.'); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }
  const analyze = async () => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const body = new FormData(); body.append('file', file)
      const res = await fetch(`${API_URL}/predict`, { method:'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'The detector could not analyze this image.')
      onResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed.') }
    finally { setBusy(false) }
  }
  return <div className="grid md:grid-cols-[1fr_340px] border-t border-[var(--line)]">
    <div className="p-6 md:p-10 md:border-r border-[var(--line)]">
      <div className={`dropzone min-h-[360px] flex flex-col items-center justify-center text-center p-8 ${drag?'active':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);selectFile(e.dataTransfer.files?.[0])}} onClick={()=>inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>selectFile(e.target.files?.[0])}/>
        {preview ? <img src={preview} className="max-h-[270px] max-w-full object-contain" alt="Selected media"/> : <>
          <div className="meta mb-3 text-[var(--accent)]">INPUT / IMAGE</div>
          <div className="display text-4xl mb-3">Drop an image here.</div>
          <p className="max-w-md text-sm text-[var(--muted)]">JPG, PNG or WebP. The image is sent to the local detector for analysis.</p>
        </>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button className="wipe bg-[var(--accent)] text-white px-5 py-3 rounded-[8px] meta disabled:opacity-40 disabled:cursor-not-allowed" disabled={!file||busy} onClick={e=>{e.stopPropagation();analyze()}}>{busy?'ANALYZING…':'Analyze image'}</button>
        {file && <button className="px-5 py-3 border border-[var(--line)] rounded-[8px] meta" onClick={()=>{setFile(null);setPreview('');setError('')}}>Clear</button>}
      </div>
      {error && <p className="mt-4 text-sm text-[#b42318]">{error}</p>}
    </div>
    <div className="p-6 md:p-10 bg-white">
      <div className="meta mb-5">RESULT / LIVE</div>
      <div className="display text-5xl md:text-6xl mb-4">{busy?'Checking…':file?'Ready.':'Upload first.'}</div>
      <p className="text-sm text-[var(--muted)] leading-6">The API returns the model classification and confidence. The interface never invents a result when the trained weights are unavailable.</p>
    </div>
  </div>
}

function App(){
  const reduced = useReducedMotion();
  const [result,setResult] = useState<Result|null>(null)
  const [apiStatus,setApiStatus] = useState('CHECKING')
  useEffect(()=>{ fetch(`${API_URL}/health`).then(r=>r.json()).then(d=>setApiStatus(d.model_loaded?'MODEL READY':'MODEL NOT LOADED')).catch(()=>setApiStatus('API OFFLINE')) },[])
  const motionProps = reduced ? {} : { variants: fadeUp }
  return <div className="min-h-screen bg-[var(--paper)]">
    <nav className="h-[68px] border-b border-[var(--line)] flex items-center justify-between px-5 md:px-10">
      <div className="display text-xl tracking-[-.03em]">VERA.</div><div className="meta">AI DEEPFAKE DETECTION / {apiStatus}</div>
    </nav>

    <section className="grid-sheet min-h-[clamp(520px,76vh,780px)] border-b border-[var(--line)] px-5 md:px-10 py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-2 meta pt-2">000/ VERA</div>
        <div className="md:col-span-9 md:col-start-4">
          <motion.div {...motionProps} className="display text-[44px] md:text-[72px] lg:text-[100px] max-w-[1000px]">Know what you are looking at.</motion.div>
          <motion.p {...motionProps} transition={{delay:.12,duration:.6,ease:[.22,1,.36,1]}} className="mt-7 max-w-[700px] text-lg md:text-xl leading-7">An AI powered image check for manipulated facial media. Upload an image, run the detector, and get a clear classification with confidence.</motion.p>
          <div className="mt-10 max-w-[700px]"><a href="#analyze" className="wipe inline-flex bg-[var(--ink)] text-white px-6 py-4 rounded-[8px] meta">Analyze an image ↓</a></div>
          <div className="meta text-[var(--muted)] mt-4">VISUAL ANALYSIS. SPATIAL PATTERNS. MODEL CONFIDENCE.</div>
        </div>
      </div>
    </section>

    <section className="py-20 md:py-28 px-5 md:px-10 border-b border-[var(--line)] text-center">
      <motion.div {...motionProps}><Ticket result={result}/><p className="meta text-[var(--muted)] mt-5">{result ? `Result for ${result.filename}. Confidence shown above.` : 'Your result. The confidence appears here after analysis.'}</p></motion.div>
    </section>

    <section className="py-20 md:py-28 px-5 md:px-10 border-b border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-8"><div className="md:col-span-2 meta">001/ WHY</div><motion.p {...motionProps} className="md:col-span-9 md:col-start-4 display text-[30px] md:text-[42px] lg:text-[50px]">Synthetic media can look convincing in a single frame. VERA looks for visual evidence of manipulation and separates that signal from the simple question of whether a registered file has changed.</motion.p></div>
    </section>

    <section className="bg-[var(--surface)] py-20 md:py-28 px-5 md:px-10 border-b border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto">
        {[['01','Visual patterns','An enhanced CNN based on the MesoNet family learns fine grained patterns associated with manipulated facial media.'],['02','Spatial and temporal clues','The research approach considers facial irregularities and changes across frames where video is available.'],['03','Authentication layer','A cryptographic fingerprint can be recorded on a blockchain so registered media can later be checked for changes.']].map(([n,t,d])=><motion.div {...motionProps} key={n} className="grid md:grid-cols-12 gap-5 py-7 border-t border-[var(--line)]"><div className="meta md:col-span-2">{n}</div><div className="display text-3xl md:col-span-4">{t}</div><p className="md:col-span-5 md:col-start-8 text-[15px] leading-6 text-[var(--muted)]">{d}</p></motion.div>)}
      </div>
    </section>

    <section id="analyze" className="bg-[var(--ink)] text-white py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto"><div className="meta text-white/60 mb-5">002/ ANALYZE</div><div className="display text-5xl md:text-7xl max-w-4xl mb-10">One image. One clear answer.</div><div className="bg-white text-[var(--ink)] rounded-[24px] overflow-hidden"><UploadAnalyzer onResult={setResult}/></div><p className="meta text-white/50 mt-5">DEMO LIMIT: 10 MB / JPG, PNG, WEBP / MODEL OUTPUT ONLY</p></div>
    </section>

    <section className="py-20 md:py-28 px-5 md:px-10 border-b border-[var(--line)]"><div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-8"><div className="md:col-span-2 meta">003/ FOR</div><div className="md:col-span-5">{['Researchers and students','Digital investigators','Content moderation teams','Anyone verifying an image'].map((x,i)=><div key={x} className="display text-3xl md:text-4xl py-4 border-t border-[var(--line)]">{x}</div>)}</div><div className="md:col-span-4 md:col-start-9 text-sm leading-6 text-[var(--muted)] pt-2">Designed around the research paper’s detection and authentication framing. Benchmark performance is not a guarantee of accuracy on every real world image.</div></div></section>

    <section className="py-20 md:py-28 px-5 md:px-10 border-b border-[var(--line)]"><div className="max-w-[1200px] mx-auto"><div className="meta mb-8">004/ STATUS</div>{[['Detection model','MesoNet based CNN pipeline','MODEL'],['Benchmark evaluation','94.3% to 98.3% on evaluated benchmark data','PAPER'],['New AI media','Lower performance reported on Perchance AI','PAPER'],['Generalization','Needs broader datasets and newer synthetic media tests','NEXT']].map(([a,b,c])=><div key={a} className="grid grid-cols-[1fr_1.5fr_auto] gap-5 py-5 border-t border-[var(--line)]"><div className="display text-xl md:text-2xl">{a}</div><div className="text-sm text-[var(--muted)]">{b}</div><div className="meta text-right">{c}</div></div>)}</div></section>

    <section className="bg-[var(--surface)] py-20 md:py-28 px-5 md:px-10"><motion.blockquote {...motionProps} className="max-w-[900px] mx-auto text-center display text-[30px] md:text-[44px]">“The system combines deepfake detection with media authentication to provide a more complete approach to digital media verification.”<footer className="meta text-[var(--muted)] mt-7">RESEARCH PAPER / CONCLUSION</footer></motion.blockquote></section>

    <section className="bg-[var(--accent)] text-white py-20 md:py-28 px-5 md:px-10"><div className="max-w-[1200px] mx-auto"><div className="display text-4xl md:text-6xl max-w-3xl">Put an image through the detector.</div><a href="#analyze" className="wipe mt-8 inline-flex bg-white text-[var(--ink)] px-6 py-4 rounded-[8px] meta">Upload an image</a><div className="meta text-white/75 mt-5">FAST LOCAL API. NO CLAIMS BEYOND THE MODEL OUTPUT.</div></div></section>

    <footer className="px-5 md:px-10 py-10"><div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-7 items-start"><div className="display text-xl md:col-span-3">VERA.</div><p className="text-sm text-[var(--muted)] md:col-span-5">AI powered deepfake detection and media authentication, adapted from the supplied research paper.</p><div className="meta md:col-span-4 md:text-right">MESH / CNN / MEDIA AUTHENTICATION</div></div></footer>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
