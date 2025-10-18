'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const CATEGORIES = [
  'Resident Interactions',
  'Guest Interactions',
  'Trespassers / Vagrants',
  'Lockouts',
  'Parking Violations',
  'Safety Hazards',
  'Emergency Responders',
  'Suspicious Activity',
  'Other',
]

const STORAGE_KEY = 'fps_dar_queue_v1'

function nowISO(){ return new Date().toISOString() }

function loadQueue(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveQueue(q:any[]){ localStorage.setItem(STORAGE_KEY, JSON.stringify(q)) }

export default function DARUploader(){
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [queue, setQueue] = useState<any[]>([])
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState<any>(null)

  // form
  const [officerName, setOfficerName] = useState('')
  const [badge, setBadge] = useState('')
  const [site, setSite] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [bwcReferenced, setBwcReferenced] = useState(true)
  const [timestamp, setTimestamp] = useState(nowISO())
  const [shift, setShift] = useState('')
  const [patrolCycle, setPatrolCycle] = useState('')
  const [coords, setCoords] = useState<any>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])

  useEffect(()=>{ setQueue(loadQueue()) },[])
  useEffect(()=>{ saveQueue(queue) },[queue])
  useEffect(()=>{
    const t = setInterval(()=> setTimestamp(nowISO()), 1000)
    const on = ()=> setIsOnline(true)
    const off = ()=> setIsOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return ()=>{ clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  },[])

  useEffect(()=>{
    supabase.auth.getSession().then(({ data })=> setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, sess)=> setSession(sess))
    return ()=> { listener.subscription.unsubscribe() }
  },[])

  function resetForm(){
    setCategory(CATEGORIES[0]); setDescription(''); setNotes('')
    setPhotos([]); setVideos([]); setCoords(null); setPatrolCycle('')
  }

  function captureLocation(){
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(pos=> {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
    }, err=> alert('Location error: '+ err.message), { enableHighAccuracy:true, timeout:10000, maximumAge:30000 })
  }

  function onSelectPhotos(e:React.ChangeEvent<HTMLInputElement>){
    const files = Array.from(e.target.files || [])
    setPhotos(prev => [...prev, ...files].slice(0,10) as File[])
  }
  function onSelectVideos(e:React.ChangeEvent<HTMLInputElement>){
    const files = Array.from(e.target.files || [])
    setVideos(prev => [...prev, ...files].slice(0,5) as File[])
  }

  function buildRec(){
    return {
      id: crypto.randomUUID(),
      officerName, badge, site, category, description, notes, bwcReferenced,
      timestamp, shift, patrolCycle, coords,
      files: { photos: photos.map(f=>({name:f.name, size:f.size, type:f.type})), videos: videos.map(f=>({name:f.name, size:f.size, type:f.type})) }
    }
  }

  async function serializeFormData(form: FormData){
    const obj:any = { fields:[], files:[] }
    for (const [key, value] of form.entries()){
      if (value instanceof File){
        const buf = await value.arrayBuffer()
        obj.files.push({ key, name: value.name, type: value.type, data: Array.from(new Uint8Array(buf)) })
      } else {
        obj.fields.push({ key, value: typeof value === 'string' ? value : await (value as File).text() })
      }
    }
    return obj
  }
  async function deserializeFormData(obj:any){
    const form = new FormData()
    for (const f of obj.fields) form.append(f.key, f.value)
    for (const file of obj.files){
      const u8 = new Uint8Array(file.data)
      const blob = new Blob([u8], { type: file.type || 'application/octet-stream' })
      form.append(file.key, new File([blob], file.name || 'file.bin', { type: file.type }))
    }
    return form
  }

  async function submitReport(){
    if (!session) { alert('Please sign in first'); return }
    if (!officerName || !site || !description){ alert('Officer Name, Site, Description are required'); return }
    const rec = buildRec()
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(rec)], { type: 'application/json' }))
    photos.forEach((f,i)=> form.append('photos', f, f.name || `photo_${i}.jpg`))
    videos.forEach((f,i)=> form.append('videos', f, f.name || `video_${i}.mp4`))

    if (!isOnline){
      const serialized = await serializeFormData(form)
      setQueue(q => [{ id: rec.id, formData: serialized, createdAt: Date.now() }, ...q])
      resetForm()
      alert('Offline — saved locally. Tap Sync when back online.')
      return
    }
    try{
      setSubmitting(true); setProgress(20)
      const res = await fetch('/api/dar', {
        method:'POST',
        headers: { Authorization: 'Bearer ' + session.access_token },
        body: form
      })
      if (!res.ok) throw new Error('Upload failed')
      setProgress(100)
      setTimeout(()=> setProgress(0), 600)
      resetForm()
      alert('Report submitted.')
    } catch(e:any){
      const serialized = await serializeFormData(form)
      setQueue(q => [{ id: rec.id, formData: serialized, createdAt: Date.now() }, ...q])
      alert('Network/server error — saved locally for later sync.')
    } finally {
      setSubmitting(false)
    }
  }

  async function syncQueue(){
    if (!session) { alert('Sign in first'); return }
    if (queue.length === 0){ alert('No pending items'); return }
    setSubmitting(true)
    let ok = 0
    for (const item of [...queue].reverse()){
      const form = await deserializeFormData(item.formData)
      const res = await fetch('/api/dar', { method:'POST', headers: { Authorization: 'Bearer ' + session.access_token }, body: form })
      if (!res.ok) break
      ok++
      setQueue(q => q.filter(x => x.id !== item.id))
    }
    setSubmitting(false)
    alert(`Synced ${ok} report(s).`)
  }

  async function signIn(email:string){
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) alert(error.message); else alert('Magic link sent. Check your email.')
  }

  async function signOut(){ await supabase.auth.signOut() }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ padding:16, borderRadius:12, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{marginTop:0}}>Sign in</h3>
        {session ? (
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{fontSize:12, color:'#555'}}>Signed in</div>
            <button onClick={signOut} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#f8f8f8'}}>Sign out</button>
          </div>
        ) : (
          <form onSubmit={(e)=>{e.preventDefault(); const email=(e.target as any).email.value; signIn(email)}}>
            <input name="email" type="email" placeholder="guard@fourpeaks.com" required
              style={{padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, width:'260px', marginRight:8}} />
            <button type="submit" style={{padding:'10px 12px', borderRadius:8, border:'1px solid #0a0', background:'#0a0', color:'#fff'}}>Send magic link</button>
          </form>
        )}
      </div>

      <div style={{ padding:16, borderRadius:12, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{marginTop:0}}>Officer & Shift</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12}}>
          <input placeholder="Officer Name" value={officerName} onChange={e=>setOfficerName(e.target.value)} style={s.input}/>
          <input placeholder="Badge #" value={badge} onChange={e=>setBadge(e.target.value)} style={s.input}/>
          <input placeholder="Site / Community" value={site} onChange={e=>setSite(e.target.value)} style={s.input}/>
          <input placeholder="Shift (e.g., 18:00–02:00)" value={shift} onChange={e=>setShift(e.target.value)} style={s.input}/>
          <input placeholder="Patrol Cycle # (e.g., 3 of 8)" value={patrolCycle} onChange={e=>setPatrolCycle(e.target.value)} style={s.input}/>
          <div style={{fontSize:12, color:'#666', alignSelf:'center'}}>Time: {new Date(timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding:16, borderRadius:12, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{marginTop:0}}>Incident Details</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:12}}>
          <div>
            <label style={s.label}>Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={s.input}>
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Description</label>
            <textarea rows={6} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Who, what, where, when, why. Unit #s, plates, policy references, actions taken." style={{...s.input, resize:'vertical'}}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={bwcReferenced} onChange={e=>setBwcReferenced(e.target.checked)}/> <span style={{fontSize:14}}>BWC footage referenced</span>
          </div>
          <div>
            <label style={s.label}>Internal Notes (not in client DAR)</label>
            <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} style={{...s.input, resize:'vertical'}}/>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={captureLocation} style={s.button}>Get GPS</button>
            {coords && <span style={{fontSize:12, color:'#555'}}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} ±{Math.round(coords.accuracy)}m</span>}
          </div>
          <div>
            <label style={s.label}>Photos (max 10)</label>
            <input type="file" accept="image/*" multiple onChange={onSelectPhotos} />
          </div>
          <div>
            <label style={s.label}>BWC Clips / Videos (max 5)</label>
            <input type="file" accept="video/*" multiple onChange={onSelectVideos} />
          </div>
          {submitting && (
            <div style={{fontSize:12, color:'#555'}}>Uploading… {progress}%</div>
          )}
        </div>
      </div>

      <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
        <button onClick={submitReport} disabled={submitting} style={s.buttonPrimary}>Submit</button>
        <button onClick={()=>{
          const rec = buildRec();
          setQueue(q=>[{ id: rec.id, formData: { metaOnly: rec }, createdAt: Date.now() }, ...q]);
          resetForm();
          alert('Saved draft locally.');
        }} style={s.button}>Save Draft (Local)</button>
        <button onClick={syncQueue} disabled={submitting || queue.length===0} style={s.button}>Sync Pending ({queue.length})</button>
        {queue.length>0 && <button onClick={()=>{ if(confirm('Clear all pending?')) setQueue([]) }} style={{...s.button, background:'#fee', borderColor:'#f99'}}>Clear Pending</button>}
        <div style={{fontSize:12, color:'#666', alignSelf:'center'}}>{isOnline ? 'Online' : 'Offline'}</div>
      </div>
    </div>
  )
}

const s:any = {
  input: { padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, width:'100%', background:'#fff' },
  label: { fontSize:12, color:'#555', display:'block', marginBottom:6 },
  button: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd', background:'#f7f7f7' },
  buttonPrimary: { padding:'10px 12px', borderRadius:8, border:'1px solid #0b5', background:'#0b5', color:'#fff' }
}
