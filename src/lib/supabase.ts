import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vkuqtalvnjwuusyfspyu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdXF0YWx2bmp3dXVzeWZzcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTMyMDYsImV4cCI6MjA5NzkyOTIwNn0.4aUC1-cywZQdWwtOOopjhNZhqsqBlM1VA1PGERqGfwU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey)
}

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
