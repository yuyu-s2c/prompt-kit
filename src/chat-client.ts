/**
 * Thin, provider-agnostic OpenAI-compatible chat client.
 */

import type { ChatCompletionResponse, ChatMessage, ChatOptions, StreamCallbacks } from './types.js'
import { createFallbackContent, parseSSEStream } from './streaming.js'
import { extractJson } from './json-extractor.js'
import { stripThinkTags } from './utils.js'

export interface ClientConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  fetch?: typeof globalThis.fetch
  defaultOptions?: ChatOptions
}

interface RequestBody {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  response_format?: { type: 'json_object' | 'text' }
  reasoning_effort?: 'low' | 'medium' | 'high' | 'max'
  [key: string]: unknown
}

const DEFAULT_BASE_URL = 'https://api.openai.com'

function buildRequestBody(
  messages: ChatMessage[],
  model: string,
  options?: ChatOptions
): RequestBody {
  const body: RequestBody = {
    model,
    messages,
  }

  if (options?.temperature !== undefined) body.temperature = options.temperature
  if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens
  if (options?.topP !== undefined) body.top_p = options.topP
  if (options?.stream !== undefined) body.stream = options.stream
  if (options?.responseFormat !== undefined) body.response_format = options.responseFormat
  if (options?.reasoningEffort !== undefined) body.reasoning_effort = options.reasoningEffort

  if (options?.extra) {
    for (const [key, value] of Object.entries(options.extra)) {
      if (body[key] === undefined) body[key] = value
    }
  }

  return body
}

function pickModel(requestOptions: ChatOptions | undefined, clientModel?: string): string {
  const model = requestOptions?.model ?? clientModel
  if (!model) {
    throw new Error('No model specified. Pass model to ChatClient or to the request options.')
  }
  return model
}

export class ChatClient {
  private apiKey: string
  private baseUrl: string
  private model?: string
  private fetchImpl: typeof globalThis.fetch
  private defaultOptions?: ChatOptions

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.model = config.model
    this.fetchImpl = config.fetch ?? globalThis.fetch
    this.defaultOptions = config.defaultOptions
  }

  setApiConfig(apiKey: string, baseUrl?: string, model?: string): void {
    this.apiKey = apiKey
    if (baseUrl) this.baseUrl = baseUrl
    if (model) this.model = model
  }

  private async post(messages: ChatMessage[], options?: ChatOptions): Promise<Response> {
    const merged: ChatOptions = { ...this.defaultOptions, ...options }
    const model = pickModel(merged, this.model)
    const body = buildRequestBody(messages, model, merged)

    const response = await this.fetchImpl(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    return response
  }

  /**
   * Return the raw OpenAI-compatible completion response.
   */
  async complete(messages: ChatMessage[], options?: ChatOptions): Promise<ChatCompletionResponse> {
    const response = await this.post(messages, { ...options, stream: false })
    return (await response.json()) as ChatCompletionResponse
  }

  /**
   * Return the assistant's reply as a plain string.
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const data = await this.complete(messages, options)
    const content = data.choices?.[0]?.message?.content ?? ''
    return stripThinkTags(content)
  }

  /**
   * Request a JSON object response and parse it.
   */
  async chatJson<T>(messages: ChatMessage[], options?: ChatOptions): Promise<T | null> {
    const lastMessage = messages[messages.length - 1]
    const needsReminder = lastMessage?.role === 'user' && !lastMessage.content.includes('JSON')

    const jsonMessages: ChatMessage[] = needsReminder
      ? [
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: `${lastMessage.content}\n\nPlease reply with valid JSON only.`,
          },
        ]
      : messages

    const data = await this.complete(jsonMessages, {
      ...options,
      responseFormat: { type: 'json_object' },
    })
    const raw = data.choices?.[0]?.message?.content ?? ''
    return extractJson<T>(raw, { stripFences: true, repair: true })
  }

  /**
   * Stream the assistant's reply.
   *
   * If the streaming request fails, automatically falls back to a non-streaming
   * call and emits the full content as a single chunk.
   */
  async chatStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: ChatOptions
  ): Promise<void> {
    try {
      const response = await this.post(messages, { ...options, stream: true })
      await parseSSEStream(response, callbacks)
    } catch {
      await createFallbackContent(() => this.chat(messages, options), callbacks)
    }
  }
}
