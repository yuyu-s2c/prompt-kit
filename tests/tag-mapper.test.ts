import { describe, expect, it } from 'vitest'
import { DEFAULT_CHINESE_EMOTION_MAP, TagMapper } from '../src/tag-mapper.js'

describe('TagMapper', () => {
  it('maps known labels to instructions', () => {
    const mapper = new TagMapper(DEFAULT_CHINESE_EMOTION_MAP)
    const result = mapper.map(['温柔', '开心'])

    expect(result).toHaveLength(2)
    expect(result[0]).toContain('温柔的语气')
    expect(result[1]).toContain('开心兴奋的语气')
  })

  it('uses the fallback for unknown labels', () => {
    const mapper = new TagMapper(DEFAULT_CHINESE_EMOTION_MAP, {
      fallback: (label) => `Use a ${label} tone.`,
    })

    expect(mapper.map(['mysterious'])).toEqual(['Use a mysterious tone.'])
  })

  it('ignores unknown labels when no fallback is provided', () => {
    const mapper = new TagMapper(DEFAULT_CHINESE_EMOTION_MAP)
    expect(mapper.map(['unknown'])).toEqual([])
  })

  it('applies prefix and suffix', () => {
    const mapper = new TagMapper({ a: 'A' }, { prefix: '(', suffix: ')' })
    expect(mapper.map(['a'])).toEqual(['(A)'])
  })

  it('supports add and remove', () => {
    const mapper = new TagMapper()
    mapper.add('x', 'X-style')
    expect(mapper.map(['x'])).toEqual(['X-style'])

    mapper.remove('x')
    expect(mapper.map(['x'])).toEqual([])
  })

  it('joins mapped instructions', () => {
    const mapper = new TagMapper({ a: 'A', b: 'B' })
    expect(mapper.mapJoined(['a', 'b'], ' / ')).toBe('A / B')
  })
})
