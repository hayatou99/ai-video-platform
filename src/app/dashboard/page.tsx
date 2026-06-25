'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
    const interval = setInterval(() => {
      if (jobs.some(j => j.status === 'queued' || j.status === 'processing')) loadJobs()
    }, 10_000)
    return () => clearInterval(interval)
  }, [jobs])

  async function loadJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error && data) setJobs(data as Job[])
    setLoading(false)
  }

  if (loading) return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading your videos...</p>
    </main>
  )

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>Your videos</h1>
        <Link href="/generate" style={{ padding: '8px 16px', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
          New video
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--color-border-secondary)', borderRadius: 12 }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>No videos yet. Generate your first one!</p>
          <Link href="/generate" style={{ color: '#534AB7', fontSize: 14 }}>Generate a video</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {jobs.map(job => (
            <div key={job.id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden', background: 'var(--color-background-secondary)' }}>
              {job.status === 'done' && job.output_url ? (
                <video
                  src={job.output_url}
                  style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block' }}
                  muted loop
                  onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                  onMouseLeave={e => (e.target as HTMLVideoElement).pause()}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '9/16', background: 'var(--color-background-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {job.status === 'processing' ? 'Generating...' : job.status}
                  </span>
                </div>
              )}
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-primary)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.original_prompt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: { done: '#1D9E75', processing: '#378ADD', queued: '#EF9F27', failed: '#E24B4A' }[job.status] || '#888', fontWeight: 500 }}>
                    {job.status}
                  </span>
                  {job.status === 'done' && job.output_url && (
                    <a href={job.output_url} download style={{ fontSize: 11, color: '#534AB7', textDecoration: 'none' }}>Download</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
