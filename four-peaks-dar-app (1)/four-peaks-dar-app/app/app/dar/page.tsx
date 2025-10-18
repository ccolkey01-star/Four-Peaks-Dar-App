'use client';
import { useState } from 'react';

export default function DARUploader() {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      const form = new FormData(e.target);
      form.set('metadata', JSON.stringify({
        officerName: 'Test Officer',
        badge: '001',
        site: 'San Travesia',
        category: 'Resident Interaction',
        description: 'Testing DAR upload form',
        notes: 'This is a test note',
        timestamp: new Date().toISOString(),
        bwcReferenced: false,
        shift: 'Day',
        patrolCycle: 'Cycle 1',
        coords: { lat: 33.4255, lng: -111.94, accuracy: 10 },
      }));

      const res = await fetch('/api/dar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: form,
      });

      const json = await res.json();
      setMsg(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setMsg('Upload failed: ' + err.message);
    }

    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Four Peaks DAR Upload</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Upload Photos: </label>
          <input type="file" name="photos" accept="image/*" multiple />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Upload Videos: </label>
          <input type="file" name="videos" accept="video/*" multiple />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#e63946',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Uploading…' : 'Submit DAR'}
        </button>
      </form>

      <pre
        style={{
          background: '#f1f1f1',
          marginTop: 20,
          padding: 10,
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg}
      </pre>
    </main>
  );
}
