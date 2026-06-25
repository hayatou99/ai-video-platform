'use client'

export default function GeneratePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <main style={{ padding: '2rem', color: 'white', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1>Debug</h1>
      <p>URL: {url || 'MISSING'}</p>
      <p>KEY: {key ? key.slice(0, 20) + '...' : 'MISSING'}</p>
    </main>
  )
}
