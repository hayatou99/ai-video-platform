'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type JobStatus = 'idle' | 'enhancing' | 'queued' | 'processing' | 'done' | 'failed'

type Job = {
  id: string
  status: string
  original_prompt: string
  enhanced_prompt?: string
  output_url?: string
  error?: string
}

const STATUS_COLORS: Record<string, string> = {
  queued: '#EF9F27',
  processing: '#378ADD',
  done: '#1D9E75',
  failed: '#E24B4A',
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued — waiting for worker',
  processing: 'Generating your video...',
  done: 'Video ready',
  failed: 'Generation failed',
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [provider, setProvider] = useState('kling')
  const [duration, setDuration] = useState(5)
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle')
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadCredits()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadCredits() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
    if (data) setCredits(data.credits)
  }

  async function handleEnhance() {
    if (!prompt.trim()) return
    setJobStatus('enhancing')
    setError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEnhancedPrompt(data.enhanced)
      setJobStatus('idle')
    } catch (err: any) {
      setError(err.message)
      setJobStatus('idle')
    }
  }

  async function handleGenerate() {
    setError('')
    setJobStatus('queued')
    setCurrentJob(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: enhancedPrompt || prompt, provider, duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentJob({ id: data.jobId, status: 'queued', original_prompt: prompt, enhanced_prompt: data.enhancedPrompt })
      setCredits(c => (c !== null ? c - 1 : null))
      startPolling(data.jobId, token!)
    } catch (err: any) {
      setError(err.message)
      setJobStatus('idle')
    }
  }

  function startPolling(jobId: string, token: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/job-status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const job = await res.json()
        setCurrentJob(job)
        setJobStatus(job.status as JobStatus)
        if (job.status === 'done' || job.status === 'failed') {
          clearInterval(pollRef.current!)
        }
      } catch {}
    }, 5000)
  }

  const isLoading = ['enhancing', 'queued', 'processing'].includes(jobStatus)

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>Generate video</h1>
        {credits !== null && (
          <span style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {credits} credits
          </span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Describe your video</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. lime being cut in half, slow motion, dark background"
          rows={3}
          disabled={isLoading}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={handleEnhance}
        disabled={isLoading || !prompt.trim()}
        style={{ marginBottom: '1rem', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer' }}
      >
        {jobStatus === 'enhancing' ? 'Enhancing...' : 'Enhance with Claude'}
      </button>

      {enhancedPrompt && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Enhanced prompt (editable)</label>
          <textarea
            value={enhancedPrompt}
            onChange={e => setEnhancedPrompt(e.target.value)}
            rows={5}
            disabled={isLoading}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Provider</label>
          <select value={provider} onChange={e => setProvider(e.target.value)} disabled={isLoading}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14 }}>
            <option value="kling">Kling 3.0</option>
            <option value="veo">Veo 3.1</option>
            <option value="seedance">Seedance 2.0</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Duration</label>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={isLoading}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 14 }}>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading || (!prompt.trim() && !enhancedPrompt.trim()) || credits === 0}
        style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: isLoading ? 'var(--color-border-secondary)' : '#534AB7', color: '#fff', fontSize: 15, fontWeight: 500, cursor: isLoading ? 'not-allowed' : 'pointer' }}
      >
        {isLoading ? (jobStatus === 'queued' ? 'Queued...' : 'Generating...') : 'Generate video (1 credit)'}
      </button>

      {error && <p style={{ marginTop: 12, color: 'var(--color-text-danger)', fontSize: 13 }}>{error}</p>}

      {currentJob && (
        <div style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: 10, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[currentJob.status] || '#888' }} />
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {STATUS_LABELS[currentJob.status] || currentJob.status}
            </span>
          </div>
          {currentJob.status === 'processing' && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Usually takes 1–3 minutes. This page updates automatically.</p>
          )}
          {currentJob.status === 'done' && currentJob.output_url && (
            <div>
              <video src={currentJob.output_url} controls autoPlay loop style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
              <a href={currentJob.output_url} download style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 13, textDecoration: 'none' }}>
                Download MP4
              </a>
            </div>
          )}
          {currentJob.status === 'failed' && (
            <p style={{ fontSize: 13, color: 'var(--color-text-danger)', margin: 0 }}>{currentJob.error || 'Generation failed. Please try again.'}</p>
          )}
        </div>
      )}
    </main>
  )
}
