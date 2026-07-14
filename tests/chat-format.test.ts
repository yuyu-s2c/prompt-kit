import { describe, expect, it } from 'vitest'
import { assembleChatMessages } from '../src/chat-format.js'

describe('assembleChatMessages', () => {
  it('assembles system + history + user', () => {
    const messages = assembleChatMessages({
      systemPrompt: 'You are Aria.',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
      userMessage: 'How are you?',
    })

    expect(messages).toEqual([
      { role: 'system', content: 'You are Aria.' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'How are you?' },
    ])
  })

  it('appends an instruction to the user message', () => {
    const messages = assembleChatMessages({
      userMessage: 'Tell me a secret.',
      appendInstruction: '\n\nBe concise.',
    })

    expect(messages[messages.length - 1]).toEqual({
      role: 'user',
      content: 'Tell me a secret.\n\nBe concise.',
    })
  })

  it('does not mutate the history', () => {
    const history = [{ role: 'user' as const, content: 'Hi' }]
    assembleChatMessages({ history, userMessage: 'Bye' })
    expect(history).toHaveLength(1)
  })
})
