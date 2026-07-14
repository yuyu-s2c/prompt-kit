import { describe, expect, it, vi } from 'vitest'
import { ChatClient } from '../src/chat-client.js'

describe('ChatClient', () => {
  it('complete returns the raw response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'Hi!' } }],
      }),
      text: async () => '',
    })

    const client = new ChatClient({
      apiKey: 'test',
      baseUrl: 'https://api.test',
      model: 'test-model',
      fetch: fetchMock,
    })

    const response = await client.complete([{ role: 'user', content: 'Hello' }])

    expect(response.choices[0]?.message?.content).toBe('Hi!')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"test-model"'),
      })
    )
  })

  it('chat returns stripped content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '<think>thinking</think>Answer',
            },
          },
        ],
      }),
      text: async () => '',
    })

    const client = new ChatClient({
      apiKey: 'test',
      model: 'test-model',
      fetch: fetchMock,
    })

    const reply = await client.chat([{ role: 'user', content: 'Q' }])
    expect(reply).toBe('Answer')
  })

  it('chatJson parses JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '```json\n{"a":1}\n```',
            },
          },
        ],
      }),
      text: async () => '',
    })

    const client = new ChatClient({
      apiKey: 'test',
      model: 'test-model',
      fetch: fetchMock,
    })

    const data = await client.chatJson<{ a: number }>([{ role: 'user', content: 'Give me JSON.' }])
    expect(data).toEqual({ a: 1 })
  })

  it('chatJson returns null when parsing fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'not json' } }],
      }),
      text: async () => '',
    })

    const client = new ChatClient({
      apiKey: 'test',
      model: 'test-model',
      fetch: fetchMock,
    })

    const data = await client.chatJson<unknown>([{ role: 'user', content: 'JSON?' }])
    expect(data).toBeNull()
  })

  it('throws when no model is configured', async () => {
    const client = new ChatClient({ apiKey: 'test' })
    await expect(client.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('No model')
  })

  it('chatStream falls back on fetch failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))

    const client = new ChatClient({
      apiKey: 'test',
      model: 'test-model',
      fetch: fetchMock,
    })

    const fallback = vi.fn()
    const chatSpy = vi.spyOn(client, 'chat').mockResolvedValue('fallback reply')

    await client.chatStream([{ role: 'user', content: 'Hi' }], { onContent: fallback })

    expect(fallback).toHaveBeenCalledWith('fallback reply')
    chatSpy.mockRestore()
  })
})
