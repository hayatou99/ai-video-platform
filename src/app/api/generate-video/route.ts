import { NextRequest, NextResponse } from 'next/server'
import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { enhancePrompt } from '@/lib/ai/claude'
import { enqueueVideoJob } from '@/lib/queue/videoQueue'

const CREDITS_PER_VIDEO = 1

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prompt, provider = 'kling', duration = 5, style } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if ((profile as any).credits < CREDITS_PER_VIDEO) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    await admin
      .from('profiles')
      .update({ credits: (profile as any).credits - CREDITS_PER_VIDEO })
      .eq('id', user.id)

    let enhancedPrompt: string
    try {
      enhancedPrompt = await enhancePrompt(prompt)
    } catch {
      enhancedPrompt = prompt
    }

    const { data: job, error: jobError } = await admin
      .from('jobs')
      .insert({
        user_id: user.id,
        status: 'queued',
        original_prompt: prompt,
        enhanced_prompt: enhancedPrompt,
        provider,
        duration,
        credits_used: CREDITS_PER_VIDEO,
        metadata: { style },
      })
      .select()
      .single()

    if (jobError || !job) {
      await admin
        .from('profiles')
        .update({ credits: (profile as any).credits })
        .eq('id', user.id)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    await enqueueVideoJob({
      jobId: (job as any).id,
      userId: user.id,
      enhancedPrompt,
      provider,
      duration,
      style,
    })

    return NextResponse.json({
      jobId: (job as any).id,
      status: 'queued',
      enhancedPrompt,
    })
  } catch (err) {
    console.error('Generate video error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
