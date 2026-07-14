import { describe, expect, it } from 'vitest'
import {
  extractTrailingInteger,
  safeJsonParse,
  stripMarkdownCodeBlocks,
  stripThinkTags,
} from '../src/utils.js'

describe('stripThinkTags', () => {
  it('removes a single think block', () => {
    const input = 'Hello <think>reasoning</think> world'
    expect(stripThinkTags(input)).toBe('Hello  world')
  })

  it('removes multiple think blocks', () => {
    const input = 'a <think>x</think> b <think>y</think> c'
    expect(stripThinkTags(input)).toBe('a  b  c')
  })

  it('handles unclosed think tags by stopping', () => {
    const input = 'a <think> b'
    expect(stripThinkTags(input)).toBe('a')
  })

  it('returns the original string when there are no think tags', () => {
    expect(stripThinkTags('plain text')).toBe('plain text')
  })
})

describe('extractTrailingInteger', () => {
  it('extracts a trailing integer', () => {
    const result = extractTrailingInteger('I like you\n5')
    expect(result.value).toBe(5)
    expect(result.content).toBe('I like you')
  })

  it('returns null when there is no trailing integer', () => {
    const result = extractTrailingInteger('no number')
    expect(result.value).toBeNull()
    expect(result.content).toBe('no number')
  })

  it('respects the numeric range', () => {
    expect(extractTrailingInteger('ok\n10', { min: -5, max: 5 }).value).toBeNull()
    expect(extractTrailingInteger('ok\n3', { min: -5, max: 5 }).value).toBe(3)
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('returns null for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull()
  })
})

describe('stripMarkdownCodeBlocks', () => {
  it('extracts fenced JSON', () => {
    const input = 'Some text\n```json\n{"a":1}\n```'
    expect(stripMarkdownCodeBlocks(input)).toBe('{"a":1}')
  })

  it('returns trimmed text when there is no fence', () => {
    expect(stripMarkdownCodeBlocks('  plain text  ')).toBe('plain text')
  })
})
