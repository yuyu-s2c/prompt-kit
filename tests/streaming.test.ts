import { describe, expect, it } from 'vitest'
import { parseSSEStream, readSSEChunks } from '../src/streaming.js'

function createStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  let index = 0

  const stream = new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index++
    },
  })

  return new Response(stream)
}

describe('parseSSEStream', () => {
  it('emits content and done callbacks', async () => {
    const contentChunks: string[] = []
    const done = vi.fn()

    const response = createStreamResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ])

    await parseSSEStream(response, {
      onContent: (chunk) => contentChunks.push(chunk),
      onDone: done,
    })

    expect(contentChunks).toEqual(['Hello', ' world'])
    expect(done).toHaveBeenCalled()
  })

  it('emits reasoning content via onThinking', async () => {
    const thinking: string[] = []

    const response = createStreamResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"Hmm"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"OK"}}]}\n\n',
      'data: [DONE]\n\n',
    ])

    await parseSSEStream(response, {
      onThinking: (chunk) => thinking.push(chunk),
      onContent: () => undefined,
    })

    expect(thinking).toEqual(['Hmm'])
  })

  it('calls onError when the body is missing', async () => {
    const error = vi.fn()
    const response = new Response()

    await parseSSEStream(response, { onError: error })
    expect(error).toHaveBeenCalled()
  })
})

describe('readSSEChunks', () => {
  it('yields parsed chunks', async () => {
    const response = createStreamResponse([
      'data: {"choices":[{"delta":{"content":"A"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"B"}}]}\n\n',
    ])

    const chunks: string[] = []
    for await (const chunk of readSSEChunks(response)) {
      chunks.push(chunk.choices[0]?.delta?.content ?? '')
    }

    expect(chunks).toEqual(['A', 'B'])
  })
})
