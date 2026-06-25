import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import axios from 'axios'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export async function downloadAndStoreVideo(sourceUrl: string, jobId: string): Promise<string> {
  const response = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
  })

  const buffer = Buffer.from(response.data)
  const key = `videos/${jobId}.mp4`

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
    CacheControl: 'public, max-age=31536000',
  }))

  return `${PUBLIC_URL}/${key}`
}

export async function getPresignedDownloadUrl(jobId: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `videos/${jobId}.mp4`,
  })
  return getSignedUrl(r2, command, { expiresIn: 86400 })
}
