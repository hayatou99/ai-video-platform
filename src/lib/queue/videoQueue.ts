import { Queue } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL!,
}

export const VIDEO_QUEUE_NAME = 'video-generation'

export const videoQueue = new Queue(VIDEO_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export type VideoJobData = {
  jobId: string
  userId: string
  enhancedPrompt: string
  provider: 'kling' | 'veo' | 'seedance'
  duration: number
  style?: string
}

export async function enqueueVideoJob(data: VideoJobData) {
  const job = await videoQueue.add('generate', data, {
    jobId: data.jobId,
  })
  return job
}
