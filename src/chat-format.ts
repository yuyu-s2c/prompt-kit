/**
 * Runtime-agnostic message assembler for OpenAI/DeepSeek chat format.
 */

import type { ChatMessage } from './types.js'

export interface AssembleOptions {
  systemPrompt?: string
  history?: ChatMessage[]
  userMessage: string
  /** Appended to the user message, e.g. an immersion instruction. */
  appendInstruction?: string
}

/**
 * Assemble a chat message array in `[system, ...history, user]` order.
 * Does not mutate the provided inputs.
 */
export function assembleChatMessages(opts: AssembleOptions): ChatMessage[] {
  const messages: ChatMessage[] = []

  if (opts.systemPrompt && opts.systemPrompt.trim().length > 0) {
    messages.push({ role: 'system', content: opts.systemPrompt.trim() })
  }

  if (opts.history) {
    for (const msg of opts.history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  let userContent = opts.userMessage
  if (opts.appendInstruction && opts.appendInstruction.length > 0) {
    userContent += opts.appendInstruction
  }
  messages.push({ role: 'user', content: userContent })

  return messages
}
