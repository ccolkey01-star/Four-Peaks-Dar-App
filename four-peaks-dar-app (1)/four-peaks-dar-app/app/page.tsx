import DARUploader from '@/components/DARUploader'

export default function Page(){
  return (
    <main>
      <DARUploader />
      <div style={{marginTop:24, fontSize:12, color:'#666'}}>
        Tip: use your corporate email and click the magic link to sign in.
      </div>
    </main>
  )
}
