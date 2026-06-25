import axios from 'axios'

const kling = axios.create({
  baseURL: process.env.KLING_API_BASE || 'https://api.klingai.com',
  headers: {
    Authorization: `Bearer ${process.env.KLING_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

export type KlingJobStatus = 'submitted' | 'processing' | 'succeed' | 'failed'

export type KlingGenerateParams = {
  prompt: string
  duration: 5 | 10
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  mode?: 'std' | 'pro'
  negative_prompt?: string
  cfg_scale?: number
}

export async function klingGenerateVideo(params: KlingGenerateParams): Promise<string> {
  const res = await kling.post('/v1/videos/text2video', {
    prompt: params.prompt,
    duration: String(params.duration),
    aspect_ratio: params.aspect_ratio || '9:16',
    mode: params.mode || 'std',
    negative_prompt: params.negative_prompt || 'blurry, low quality, watermark, text overlay',
    cfg_scale: params.cfg_scale ?? 0.5,
  })

  if (res.data.code !== 0) throw new Error(`Kling API error: ${res.data.message}`)
  return res.data.data.task_id
}

export async function klingGetJobStatus(taskId: string) {
  const res = await kling.get(`/v1/videos/text2video/${taskId}`)
  if (res.data.code !== 0) throw new Error(`Kling status error: ${res.data.message}`)
  return res.data.data
}
