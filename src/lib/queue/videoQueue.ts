import { Queue } from 'bullmq'

export const VIDEO_QUEUE_NAME = 'video-generation'

export type VideoJobData = {
  jobId: string
  userId: string
  enhancedPrompt: string
  provider: 'kling' | 'veo' | 'seedance'
  duration: number
  style?: string
}

function getQueue() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) throw new Error('REDIS_URL is not set')

  return new Queue(VIDEO_QUEUE_NAME, {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  })
}

export async function enqueueVideoJob(data: VideoJobData) {
  const queue = getQueue()
  const job = await queue.add('generate', data, { jobId: data.jobId })
  await queue.close()
  return job
}
