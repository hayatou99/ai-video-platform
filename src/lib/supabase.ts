import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Job = {
  id: string
  user_id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  original_prompt: string
  enhanced_prompt?: string
  provider: string
  provider_job_id?: string
  output_url?: string
  duration?: number
  credits_used: number
  error?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  email: string
  credits: number
  plan: string
  stripe_customer_id?: string
  created_at: string
}
