require('dotenv').config({ path: '.env.local' })

const { Worker } = require('bullmq')
const IORedis = require('ioredis')

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
})

async function startWorker() {
  const { createClient } = require('@supabase/supabase-js')
  const axios = require('axios')
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  async function updateJobStatus(jobId, updates) {
    await supabaseAdmin.from('jobs').update(updates).eq('id', jobId)
  }

  async function downloadAndUploadToR2(sourceUrl, jobId) {
    console.log(`[${jobId}] Downloading from provider...`)
    const response = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 120_000 })
    const buffer = Buffer.from(response.data)
    const key = `videos/${jobId}.mp4`
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL}/${key}`
  }

  async function generateWithKling(jobId, prompt, duration) {
    const klingBase = process.env.KLING_API_BASE || 'https://api.klingai.com'
    console.log(`[${jobId}] Submitting to Kling...`)
    const submitRes = await axios.post(
      `${klingBase}/v1/videos/text2video`,
      { prompt, duration: String(duration), aspect_ratio: '9:16', mode: 'std', negative_prompt: 'blurry, low quality, watermark', cfg_scale: 0.5 },
      { headers: { Authorization: `Bearer ${process.env.KLING_API_KEY}`, 'Content-Type': 'application/json' } }
    )
    if (submitRes.data.code !== 0) throw new Error(`Kling error: ${submitRes.data.message}`)

    const taskId = submitRes.data.data.task_id
    console.log(`[${jobId}] Kling task: ${taskId}`)
    await updateJobStatus(jobId, { provider_job_id: taskId, status: 'processing' })

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 10_000))
      const statusRes = await axios.get(
        `${klingBase}/v1/videos/text2video/${taskId}`,
        { headers: { Authorization: `Bearer ${process.env.KLING_API_KEY}` } }
      )
      const task = statusRes.data.data
      console.log(`[${jobId}] Poll ${i + 1}: ${task.task_status}`)
      if (task.task_status === 'succeed') return task.task_result.videos[0].url
      if (task.task_status === 'failed') throw new Error(`Kling failed: ${task.task_status_msg}`)
    }
    throw new Error('Kling timed out')
  }

  const worker = new Worker(
    'video-generation',
    async (job) => {
      const { jobId, enhancedPrompt, provider, duration } = job.data
      console.log(`\n[${jobId}] Starting | Provider: ${provider}`)
      try {
        await updateJobStatus(jobId, { status: 'processing' })
        let providerVideoUrl
        if (provider === 'kling') {
          providerVideoUrl = await generateWithKling(jobId, enhancedPrompt, duration)
        } else {
          throw new Error(`Provider "${provider}" not yet implemented`)
        }
        const outputUrl = await downloadAndUploadToR2(providerVideoUrl, jobId)
        await updateJobStatus(jobId, { status: 'done', output_url: outputUrl })
        console.log(`[${jobId}] Done! ${outputUrl}`)
        return { outputUrl }
      } catch (err) {
        console.error(`[${jobId}] Failed:`, err.message)
        await updateJobStatus(jobId, { status: 'failed', error: err.message })
        throw err
      }
    },
    { connection, concurrency: 3 }
  )

  worker.on('completed', job => console.log(`Job ${job.id} completed`))
  worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message))
  console.log('Worker started, waiting for jobs...')
}

startWorker().catch(console.error)
