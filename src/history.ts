/**
 * History windowing and rolling summarization helpers.
 */

import type { ChatMessage } from './types.js'

export interface HistoryWindowOptions {
  /** Maximum number of recent messages to keep. Defaults to 20. */
  maxRecentMessages?: number
  /** Optional summary to prepend as a system message. */
  summary?: string
  /** Header used when injecting the summary. Defaults to "【对话历史摘要】". */
  summaryHeader?: string
  /** Preserve system messages regardless of the window size. */
  preserveSystem?: boolean
}

/**
 * Keep only the most recent messages and optionally prepend a summary.
 *
 * System messages are preserved when `preserveSystem` is true.
 */
export function windowHistory(
  messages: ChatMessage[],
  options?: HistoryWindowOptions
): ChatMessage[] {
  const max = options?.maxRecentMessages ?? 20
  const preserveSystem = options?.preserveSystem ?? true
  const summaryHeader = options?.summaryHeader ?? '【对话历史摘要】'

  let systemMessages: ChatMessage[] = []
  let others: ChatMessage[] = messages

  if (preserveSystem) {
    systemMessages = messages.filter((m) => m.role === 'system')
    others = messages.filter((m) => m.role !== 'system')
  }

  const recent = others.slice(-max)
  const result: ChatMessage[] = [...systemMessages]

  if (options?.summary && options.summary.trim().length > 0) {
    result.push({ role: 'system', content: `${summaryHeader}\n${options.summary.trim()}` })
  }

  result.push(...recent)
  return result
}

export interface RollingSummaryOptions {
  /** Trigger a summary every N user/assistant messages. */
  threshold: number
  /** Summarize a block of conversation text. */
  summarize: (text: string) => Promise<string>
  /** Merge an existing summary with new text. Defaults to concatenation. */
  merge?: (existing: string, recent: string) => Promise<string>
}

/**
 * Periodically summarize a conversation so context can stay within model limits.
 */
export class RollingSummarizer {
  private threshold: number
  private summarizeFn: (text: string) => Promise<string>
  private mergeFn: (existing: string, recent: string) => Promise<string>

  constructor(options: RollingSummaryOptions) {
    this.threshold = options.threshold
    this.summarizeFn = options.summarize
    this.mergeFn = options.merge ?? (async (existing, recent) => `${existing}\n\n${recent}`.trim())
  }

  /**
   * Decide whether the current message list has reached a summary boundary.
   */
  shouldSummarize(messages: ChatMessage[], _currentSummary?: string): boolean {
    const nonSystem = messages.filter((m) => m.role !== 'system')
    return nonSystem.length >= this.threshold && nonSystem.length % this.threshold === 0
  }

  /**
   * Produce a new summary.
   */
  async summarize(messages: ChatMessage[], currentSummary?: string): Promise<string> {
    const nonSystem = messages.filter((m) => m.role !== 'system')
    const window = nonSystem.slice(-this.threshold)
    const text = window.map((m) => `${m.role}: ${m.content}`).join('\n')

    if (currentSummary && currentSummary.trim().length > 0) {
      const recent = await this.summarizeFn(text)
      return this.mergeFn(currentSummary, recent)
    }

    return this.summarizeFn(text)
  }

  /**
   * Summarize only if the boundary has been reached.
   */
  async maybeSummarize(
    messages: ChatMessage[],
    currentSummary?: string
  ): Promise<{ summary: string; updated: boolean }> {
    if (!this.shouldSummarize(messages, currentSummary)) {
      return { summary: currentSummary ?? '', updated: false }
    }

    const summary = await this.summarize(messages, currentSummary)
    return { summary, updated: true }
  }
}
