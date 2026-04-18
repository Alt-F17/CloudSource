import { NextRequest, NextResponse } from 'next/server'

import { DEFAULT_GOOGLE_INFERENCE_MODEL } from '@/lib/prompts/models'
import {
  buildNimbusContextPrompt,
  NIMBUS_SYSTEM_PROMPT,
} from '@/lib/prompts/nimbus'

type NimbusRole = 'user' | 'assistant'

type NimbusMessage = {
  role: NimbusRole
  content: string
}

type NimbusRequestBody = {
  messages?: NimbusMessage[]
  destination?: string
  preferences?: Record<string, unknown>
}

type GeminiPart = {
  text?: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
  }>
}

const MODEL = process.env.GOOGLE_NIMBUS_MODEL || DEFAULT_GOOGLE_INFERENCE_MODEL

function toGeminiRole(role: NimbusRole) {
  return role === 'assistant' ? 'model' : 'user'
}

function sanitizeMessages(messages: NimbusMessage[]) {
  return messages
    .filter((msg) => typeof msg.content === 'string' && msg.content.trim().length > 0)
    .slice(-14)
    .map((msg) => ({
      role: toGeminiRole(msg.role),
      parts: [{ text: msg.content.trim() }],
    }))
}

function extractGeminiText(data: GeminiResponse) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  )
}

function chunkText(text: string, chunkSize = 32) {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
  }

  let body: NimbusRequestBody
  try {
    body = (await req.json()) as NimbusRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const destination = body.destination?.trim() || 'Tokyo, Japan'
  const preferences = body.preferences ?? {}
  const messages = sanitizeMessages(body.messages ?? [])

  const contextBlock = buildNimbusContextPrompt(destination, preferences)

  let geminiResp: Response
  try {
    geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: NIMBUS_SYSTEM_PROMPT }],
          },
          contents: [
            { role: 'user', parts: [{ text: contextBlock }] },
            ...messages,
          ],
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 1024,
          },
        }),
      }
    )
  } catch (error) {
    console.error('Nimbus Gemini network error:', error)
    return NextResponse.json({ error: 'Unable to reach Gemini API' }, { status: 502 })
  }

  if (!geminiResp.ok) {
    const detail = await geminiResp.text()
    console.error('Nimbus Gemini error:', detail)
    return NextResponse.json({ error: 'Gemini inference failed', detail }, { status: 502 })
  }

  let responseData: GeminiResponse
  try {
    responseData = (await geminiResp.json()) as GeminiResponse
  } catch {
    return NextResponse.json({ error: 'Invalid Gemini response format' }, { status: 502 })
  }

  const fullText = extractGeminiText(responseData)
  if (!fullText) {
    return NextResponse.json({ error: 'Gemini returned empty output' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of chunkText(fullText, 34)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          )
          await sleep(14)
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Streaming interrupted' })}\n\n`
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        console.error('Nimbus stream error:', error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
