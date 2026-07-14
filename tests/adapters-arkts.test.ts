import { describe, expect, it, vi } from 'vitest'
import { ArkTSStreamCallbacks, createArkTSFetchAdapter } from '../src/adapters/arkts.js'

describe('ArkTSStreamCallbacks', () => {
  it('uses no-op defaults when no callbacks are provided', () => {
    const cb = new ArkTSStreamCallbacks()
    expect(() => {
      cb.onContent('x')
      cb.onThinking('x')
      cb.onDone()
      cb.onError(new Error('x'))
    }).not.toThrow()
  })

  it('forwards provided callbacks', () => {
    const onContent = vi.fn()
    const cb = new ArkTSStreamCallbacks({ onContent })
    cb.onContent('hello')
    expect(onContent).toHaveBeenCalledWith('hello')
  })
})

describe('createArkTSFetchAdapter', () => {
  it('wraps an ArkTS request into a fetch-compatible call', async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'ok' }),
      text: async () => '{"result":"ok"}',
    })

    const fetch = createArkTSFetchAdapter(request)
    const response = await fetch('https://api.test/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"model":"test"}',
    })

    expect(request).toHaveBeenCalledWith('https://api.test/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"model":"test"}',
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ result: 'ok' })
  })
})
