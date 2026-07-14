import { describe, expect, it } from 'vitest'
import * as promptKit from '../src/index.js'

describe('index exports', () => {
  it('exports the expected public API', () => {
    expect(typeof promptKit.buildSystemPrompt).toBe('function')
    expect(typeof promptKit.assembleChatMessages).toBe('function')
    expect(typeof promptKit.ChatClient).toBe('function')
    expect(typeof promptKit.TagMapper).toBe('function')
    expect(typeof promptKit.windowHistory).toBe('function')
    expect(typeof promptKit.extractJson).toBe('function')
  })
})
