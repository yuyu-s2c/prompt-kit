/**
 * Robust JSON extraction from LLM output.
 */

import { safeJsonParse, stripMarkdownCodeBlocks } from './utils.js'

export interface ExtractJsonOptions {
  /** Try to recover JSON by searching for the first `{` or `[` if parsing fails. */
  repair?: boolean
  /** Strip Markdown fences before parsing. */
  stripFences?: boolean
}

function findJsonCandidate(text: string): string {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')

  let start = -1
  let endChar = ''
  if (objectStart >= 0 && arrayStart >= 0) {
    start = Math.min(objectStart, arrayStart)
    endChar = start === objectStart ? '}' : ']'
  } else if (objectStart >= 0) {
    start = objectStart
    endChar = '}'
  } else if (arrayStart >= 0) {
    start = arrayStart
    endChar = ']'
  }

  if (start < 0) return text

  // Try progressively shorter end boundaries to drop trailing prose.
  let end = text.lastIndexOf(endChar)
  while (end > start) {
    const candidate = text.substring(start, end + 1)
    if (safeJsonParse<unknown>(candidate) !== null) {
      return candidate
    }
    end = text.lastIndexOf(endChar, end - 1)
  }

  return text.substring(start)
}

/**
 * Extract a JSON object or array from a string.
 *
 * Strips Markdown fences by default, then attempts to parse. If `repair` is
 * true, it falls back to the first `{` or `[` block it can find and strips
 * any trailing text outside the boundary.
 */
export function extractJson<T>(text: string, options?: ExtractJsonOptions): T | null {
  const prepared = options?.stripFences !== false ? stripMarkdownCodeBlocks(text) : text
  const trimmed = prepared.trim()

  const direct = safeJsonParse<T>(trimmed)
  if (direct !== null) return direct

  if (options?.repair) {
    return safeJsonParse<T>(findJsonCandidate(trimmed))
  }

  return null
}
