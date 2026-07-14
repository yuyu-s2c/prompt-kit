/**
 * Adapter helpers for HarmonyOS ArkTS.
 *
 * ArkTS strict mode is stricter about object shapes and callback types. This
 * adapter layer provides concrete classes and a fetch-compatible contract so
 * `prompt-kit` can be consumed from ArkTS without pulling `@kit` dependencies.
 */

import type { StreamCallbacks } from '../types.js'

export class ArkTSStreamCallbacks implements StreamCallbacks {
  onThinking: (chunk: string) => void
  onContent: (chunk: string) => void
  onDone: () => void
  onError: (err: Error) => void

  constructor(options: Partial<StreamCallbacks> = {}) {
    this.onThinking = options.onThinking ?? (() => undefined)
    this.onContent = options.onContent ?? (() => undefined)
    this.onDone = options.onDone ?? (() => undefined)
    this.onError = options.onError ?? (() => undefined)
  }
}

/**
 * Minimal request shape that ArkTS `http.request` or `rcp.fetch` can satisfy.
 */
export interface ArkTSRequestResult {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

export type ArkTSRequest = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<ArkTSRequestResult>

/**
 * Wrap an ArkTS request implementation into a `fetch`-compatible function.
 */
export function createArkTSFetchAdapter(request: ArkTSRequest): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()
    const headers: Record<string, string> = {}

    if (init?.headers) {
      const raw = init.headers
      if (typeof raw === 'object' && raw !== null) {
        if (Symbol.iterator in raw) {
          for (const [key, value] of raw as Iterable<[string, string]>) {
            headers[key] = value
          }
        } else {
          for (const [key, value] of Object.entries(raw)) {
            if (value !== undefined) headers[key] = String(value)
          }
        }
      }
    }

    const result = await request(url, {
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : '',
    })

    return new Response(await result.text(), {
      status: result.status,
      statusText: result.ok ? 'OK' : 'Error',
    })
  }
}
