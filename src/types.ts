/**
 * Primitive types shared across prompt-kit.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessage {
  role: Role
  content: string
  name?: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  responseFormat?: { type: 'json_object' | 'text' }
  reasoningEffort?: 'low' | 'medium' | 'high' | 'max'
  thinking?: boolean
  extra?: Record<string, unknown>
}

export interface StreamCallbacks {
  onThinking?: (chunk: string) => void
  onContent?: (chunk: string) => void
  onDone?: () => void
  onError?: (err: Error) => void
}

export interface ChatCompletionResponse {
  choices: Array<{ message: ChatMessage; finish_reason?: string }>
  usage?: Record<string, number | undefined>
}

export interface ChatCompletionChunk {
  choices: Array<{ delta: Partial<ChatMessage>; finish_reason?: string }>
}
