import { NextRequest, NextResponse } from 'next/server'
import { enhancePrompt } from '@/lib/ai/claude'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const enhanced = await enhancePrompt(prompt.trim())
    return NextResponse.json({ enhanced })
  } catch (err) {
    console.error('Enhance prompt error:', err)
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 })
  }
}
