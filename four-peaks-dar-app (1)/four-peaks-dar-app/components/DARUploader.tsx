'use client';

import { useState } from 'react';

export default function DARUploader() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    try {
      const formEl = e.currentTarget;
      const fd = new FormData(formEl);

      // build a metadata object from the form fields you have in the page
      const metadata = {
        officerName: (formEl.querySelector('[name="officerName"]') as HTMLInputElement)?.value || '',
        badge: (formEl.querySelector('[name="badge"]') as HTMLInputElement)?.value || '',
        site: (formEl.querySelector('[name="site"]') as HTMLInputElement)?.value || '',
        category: (formEl.querySelector('[name="category"]') as HTMLInputElement)?.value || '',
        description: (formEl.querySelector('[name="description"]') as HTMLTextAreaElement)?.value || '',
        notes: (formEl.querySelector('[name="notes"]') as HTMLTextAreaElement)?.value || '',
        bwcReferenced: (formEl.querySelector('[name="bwcReferenced"]') as HTMLInputElement)?.checked || false,
        timestamp: (formEl.querySelector('[name="timestamp"]') as HTMLInputElement)?.value || '',
        shift: (formEl.querySelector('[name="shift"]') as HTMLInputElement)?.value || '',
        patrolCycle: (formEl.querySelector('[name="patrolCycle"]') as HTMLInputElement)?.value || '',
        coords: undefined as
          | { lat: number; lng: number; accuracy: number }
          | undefined,
      };

      // if you have lat/lng inputs, include them
      const latEl = formEl.querySelector('[name="lat"]') as HTMLInputElement | null;
      const lngEl = formEl.querySelector('[name="lng"]') as HTMLInputElement | null;
      const accEl = formEl.querySelector('[name="accuracy"]') as HTMLInputElement | null;
      if (latEl && lngEl && latEl.value && lngEl.value) {
        metadata.coords = {
          lat: Number(latEl.value),
          lng: Number(lngEl.value),
          accuracy: accEl ? Number(accEl.value || 0) : 0,
        };
      }

      // attach metadata JSON
      fd.set('metadata', JSON.stringify(metadata));

      // SAFELY iterate form entries (no TS issues)
      const pairs = Array.from(fd.entries());
      const fdSend = new FormData();
      for (let i = 0; i < pairs.length; i++) {
        const [key, val] = pairs[i];
        fdSend.append(key, val);
      }

      // your auth token (replace with your real token flow)
      const token = (window as any).__USER_BEARER_TOKEN__ || '';

      const res = await fetch('/api/dar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fdSend,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setMsg('Submitted ✔');
      formEl.reset();
    } catch (err: any) {
      setMsg(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* Your real inputs go here; these are examples */}
      <input name="officerName" placeholder="Officer Name" className="border p-2 w-full" />
      <input name="badge" placeholder="Badge" className="border p-2 w-full" />
      <input name="site" placeholder="Site" className="border p-2 w-full" />
      <input name="category" placeholder="Category" className="border p-2 w-full" />
      <textarea name="description" placeholder="Description" className="border p-2 w-full" />
      <textarea name="notes" placeholder="Notes" className="border p-2 w-full" />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="bwcReferenced" />
        BWC Referenced
      </label>
      <input type="datetime-local" name="timestamp" className="border p-2 w-full" />
      {/* photo & video inputs */}
      <input type="file" name="photos" multiple accept="image/*" className="border p-2 w-full" />
      <input type="file" name="videos" multiple accept="video/*" className="border p-2 w-full" />

      <button
        type="submit"
        disabled={busy}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit DAR'}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
