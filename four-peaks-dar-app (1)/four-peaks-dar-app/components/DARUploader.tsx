'use client'

import { useState } from 'react'

export default function DARUploader() {
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [officerName, setOfficerName] = useState('')
  const [badge, setBadge] = useState('')
  const [site, setSite] = useState('')
  const [category, setCategory] = useState('Incident')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [shift, setShift] = useState('')
  const [patrolCycle, setPatrolCycle] = useState('')
  const [bwcReferenced, setBwcReferenced] = useState(true)
  const [token, setToken] = useState('') // paste a Supabase auth token when testing
  const [status, setStatus] = useState<string>('')

  const onPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []))
  }
  const onVideos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideos(Array.from(e.target.files || []))
  }

  async function submit() {
    setStatus('Uploading...')
    try {
      // collect GPS if available
      let coords: { lat?: number; lng?: number; accuracy?: number } = {}
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        )
        coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
      } catch (_) {}

      const metadata = {
        id: undefined,
        officerName,
        badge,
        site,
        category,
        description,
        notes,
        bwcReferenced,
        timestamp: new Date().toISOString(),
        shift,
        patrolCycle,
        coords,
      }

      const form = new FormData()
      form.append('metadata', JSON.stringify(metadata))

      for (const f of photos) form.append('photos', f)
      for (const f of videos) form.append('videos', f)

      const res = await fetch('/api/dar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setStatus('✅ Submitted')
    } catch (e: any) {
      setStatus(`❌ ${e.message || 'Upload failed'}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-xl font-semibold">Daily Activity Report</h1>

      <input className="w-full border p-2 rounded" placeholder="Officer Name" value={officerName} onChange={e => setOfficerName(e.target.value)} />
      <input className="w-full border p-2 rounded" placeholder="Badge" value={badge} onChange={e => setBadge(e.target.value)} />
      <input className="w-full border p-2 rounded" placeholder="Site" value={site} onChange={e => setSite(e.target.value)} />

      <select className="w-full border p-2 rounded" value={category} onChange={e => setCategory(e.target.value)}>
        <option>Incident</option>
        <option>Patrol</option>
        <option>Report</option>
        <option>Maintenance</option>
      </select>

      <textarea className="w-full border p-2 rounded" rows={5} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <textarea className="w-full border p-2 rounded" rows={3} placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

      <div className="grid grid-cols-2 gap-2">
        <input className="border p-2 rounded" placeholder="Shift" value={shift} onChange={e => setShift(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Patrol Cycle" value={patrolCycle} onChange={e => setPatrolCycle(e.target.value)} />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={bwcReferenced} onChange={e => setBwcReferenced(e.target.checked)} />
        Reference BWC in narrative
      </label>

      <div className="space-y-2">
        <label className="block font-medium">Photos</label>
        <input type="file" multiple accept="image/*" onChange={onPhotos} />
        <label className="block font-medium mt-2">Videos (BWC clips)</label>
        <input type="file" multiple accept="video/*" onChange={onVideos} />
      </div>

      <input className="w-full border p-2 rounded" placeholder="(Testing) Paste Supabase user JWT token" value={token} onChange={e => setToken(e.target.value)} />

      <button onClick={submit} className="w-full border p-2 rounded font-semibold">
        Submit DAR
      </button>

      {status && <p className="text-sm">{status}</p>}
    </div>
  )
}

