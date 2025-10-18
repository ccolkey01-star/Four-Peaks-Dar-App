import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest){
  try{
    const form = await req.formData()
    const meta = form.get('metadata')
    if (!meta) return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    const metadata = JSON.parse(typeof meta === 'string' ? meta : await (meta as File).text())

    // Verify token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    const { data: userInfo, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userInfo.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const user = userInfo.user

    const reportId = metadata.id || crypto.randomUUID()
    const photoUrls:any[] = []
    const videoUrls:any[] = []
    const fileHashes:any[] = []

    const putFile = async (bucket: 'dar-photos' | 'dar-videos', f: File) => {
  // Read once
  const ab = await f.arrayBuffer();
  const u8 = new Uint8Array(ab);

  // Hash (works on Vercel)
  const hash = crypto.createHash('sha256').update(u8).digest('hex');

  // Buffer for upload
  const buf = Buffer.from(u8);

  const ext = (f.name?.split('.').pop() || 'bin').toLowerCase();
  const path = `${user.id}/${reportId}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buf, {
      contentType: (f as any).type || 'application/octet-stream',
    });
  if (upErr) throw upErr;

  const { data: signed } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  return { url: signed?.signedUrl, path, hash };
};

    for (const [key, val] of form.entries()){
      if (val instanceof File){
        if (key === 'photos'){
          const { url, path, hash } = await putFile('dar-photos', val)
          photoUrls.push({ url, path }); fileHashes.push({ path, sha256: hash })
        } else if (key === 'videos'){
          const { url, path, hash } = await putFile('dar-videos', val)
          videoUrls.push({ url, path }); fileHashes.push({ path, sha256: hash })
        }
      }
    }

    const rec = {
      created_by: user.id,
      officer_name: metadata.officerName,
      badge: metadata.badge,
      site: metadata.site,
      category: metadata.category,
      description: metadata.description,
      notes: metadata.notes,
      bwc_referenced: !!metadata.bwcReferenced,
      ts_client: metadata.timestamp ? new Date(metadata.timestamp).toISOString() : null,
      shift: metadata.shift,
      patrol_cycle: metadata.patrolCycle,
      lat: metadata.coords?.lat ?? null,
      lng: metadata.coords?.lng ?? null,
      accuracy_m: metadata.coords?.accuracy ? Math.round(metadata.coords.accuracy) : null,
      photo_urls: photoUrls,
      video_urls: videoUrls,
      file_hashes: fileHashes
    }

    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data, error } = await db.from('dar_reports').insert(rec).select().single()
    if (error) throw error

    return NextResponse.json({ ok: true, report: data })
  } catch(e:any){
    console.error(e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
