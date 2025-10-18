export const metadata = {
  title: 'Four Peaks — DAR Uploader',
  description: 'Reports You Can Trust — Even in Court'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif', background:'#f7f7f8' }}>
        <div style={{maxWidth: 1100, margin: '0 auto', padding: '20px 16px'}}>
          <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              <div style={{height:40, width:40, borderRadius:12, background:'#111', color:'#fff', display:'grid', placeItems:'center', fontWeight:800}}>4P</div>
              <div>
                <h1 style={{margin:0, fontSize:24}}>Four Peaks — DAR Uploader</h1>
                <div style={{fontSize:12, color:'#666'}}>Elite Protection. Unmatched Accountability.</div>
              </div>
            </div>
          </header>
          {children}
          <footer style={{fontSize:12, color:'#777', textAlign:'center', padding:'24px 0'}}>© {new Date().getFullYear()} Four Peaks Security</footer>
        </div>
      </body>
    </html>
  )
}
