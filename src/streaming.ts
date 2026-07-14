/**
 * Server-Sent Events parsing for OpenAI-compatible streaming responses.
 */

import type { ChatCompletionChunk, StreamCallbacks } from './types.js'

/**
 * Parse a streaming `fetch` Response and invoke callbacks for each chunk.
 */
export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError?.(new Error('Response has no readable body'))
    return
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone?.()
          return
        }

        let chunk: ChatCompletionChunk | undefined
        try {
          chunk = JSON.parse(data) as ChatCompletionChunk
        } catch {
          // Malformed line; skip silently like RPChat does.
          continue
        }

        const delta = chunk.choices?.[0]?.delta
        const reasoning = (delta as Record<string, unknown> | undefined)?.reasoning_content
        if (typeof reasoning === 'string' && reasoning.length > 0) {
          callbacks.onThinking?.(reasoning)
        }
        if (typeof delta?.content === 'string' && delta.content.length > 0) {
          callbacks.onContent?.(delta.content)
        }
        if (chunk.choices?.[0]?.finish_reason) {
          callbacks.onDone?.()
        }
      }
    }
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
  } finally {
    reader.releaseLock()
    callbacks.onDone?.()
  }
}

/**
 * Read an SSE stream as an async generator of completion chunks.
 */
export async function* readSSEChunks(
  response: Response
): AsyncGenerator<ChatCompletionChunk, void, unknown> {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          yield JSON.parse(data) as ChatCompletionChunk
        } catch {
          // Ignore malformed lines.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Fallback helper: call a non-streaming chat function and emit the full reply
 * through the content callback.
 */
export async function createFallbackContent(
  chatFn: () => Promise<string>,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const content = await chatFn()
    if (content.length > 0) {
      callbacks.onContent?.(content)
    }
    callbacks.onDone?.()
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}
