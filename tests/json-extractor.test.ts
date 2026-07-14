import { describe, expect, it } from 'vitest'
import { extractJson } from '../src/json-extractor.js'

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips Markdown fences by default', () => {
    const input = '```json\n{"a":1}\n```'
    expect(extractJson<{ a: number }>(input)).toEqual({ a: 1 })
  })

  it('repairs JSON embedded in text when repair is true', () => {
    const input = 'Here is the result:\n{"a":1}\nHope that helps.'
    expect(extractJson<{ a: number }>(input, { repair: true })).toEqual({ a: 1 })
  })

  it('returns null for unrecoverable text', () => {
    expect(extractJson('plain text')).toBeNull()
  })

  it('returns null when repair cannot find a JSON boundary', () => {
    expect(extractJson('no braces', { repair: true })).toBeNull()
  })
})
