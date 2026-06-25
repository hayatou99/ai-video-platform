import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are a cinematic AI video prompt engineer specializing in hyper-realistic, 
ASMR-style food and nature videos. Your job is to transform simple user prompts into detailed, 
cinematically precise generation prompts optimized for AI video models like Kling, Veo, and Seedance.

Rules:
- Always include: camera angle, lighting description, texture details, motion style, background
- For food: emphasize glossy textures, moisture, color contrast, and slow-motion moments
- Keep prompts under 200 words
- Output ONLY the enhanced prompt — no explanation, no preamble`

export async function enhancePrompt(userPrompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Enhance this video prompt: "${userPrompt}"` }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text.trim()
}

export async function generateVideoMetadata(prompt: string): Promise<{
  title: string
  description: string
  tags: string[]
}> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: 'You generate YouTube metadata for AI-generated ASMR videos. Respond only with valid JSON.',
    messages: [{
      role: 'user',
      content: `Generate YouTube title, description (2-3 sentences), and 10 tags for a video with this prompt: "${prompt}". 
      Return JSON: { "title": "...", "description": "...", "tags": ["...", ...] }`,
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  const clean = content.text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
