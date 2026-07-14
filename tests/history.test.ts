import { describe, expect, it } from 'vitest'
import { RollingSummarizer, windowHistory } from '../src/history.js'

describe('windowHistory', () => {
  it('keeps only recent messages', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `msg-${i}`,
    }))

    const windowed = windowHistory(messages, { maxRecentMessages: 4 })
    expect(windowed).toHaveLength(4)
    expect(windowed[0].content).toBe('msg-6')
    expect(windowed[3].content).toBe('msg-9')
  })

  it('prepends a summary as a system message', () => {
    const messages = [
      { role: 'user' as const, content: 'a' },
      { role: 'assistant' as const, content: 'b' },
    ]

    const windowed = windowHistory(messages, {
      maxRecentMessages: 2,
      summary: 'They talked about tests.',
    })

    expect(windowed[0]).toEqual({
      role: 'system',
      content: '【对话历史摘要】\nThey talked about tests.',
    })
  })

  it('preserves system messages when requested', () => {
    const messages = [
      { role: 'system' as const, content: 'You are Aria.' },
      { role: 'user' as const, content: 'u1' },
      { role: 'assistant' as const, content: 'a1' },
      { role: 'user' as const, content: 'u2' },
    ]

    const windowed = windowHistory(messages, { maxRecentMessages: 1, preserveSystem: true })
    expect(windowed).toContainEqual({ role: 'system', content: 'You are Aria.' })
    expect(windowed.filter((m) => m.role === 'user')).toHaveLength(1)
  })
})

describe('RollingSummarizer', () => {
  it('summarizes when the threshold is reached', async () => {
    const summarizer = new RollingSummarizer({
      threshold: 2,
      summarize: async (text) => `summary: ${text.length}`,
    })

    const messages = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ]

    expect(summarizer.shouldSummarize(messages)).toBe(true)
    const result = await summarizer.maybeSummarize(messages)
    expect(result.updated).toBe(true)
    expect(result.summary).toContain('summary:')
  })

  it('merges with an existing summary', async () => {
    const summarizer = new RollingSummarizer({
      threshold: 2,
      summarize: async (text) => `new(${text.length})`,
      merge: async (existing, recent) => `${existing}\n${recent}`,
    })

    const messages = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ]

    const result = await summarizer.maybeSummarize(messages, 'old')
    expect(result.updated).toBe(true)
    expect(result.summary).toBe('old\nnew(25)')
  })

  it('does nothing before the threshold', async () => {
    const summarizer = new RollingSummarizer({
      threshold: 5,
      summarize: async () => 'summary',
    })

    const messages = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ]

    expect(summarizer.shouldSummarize(messages)).toBe(false)
    const result = await summarizer.maybeSummarize(messages)
    expect(result.updated).toBe(false)
    expect(result.summary).toBe('')
  })
})
