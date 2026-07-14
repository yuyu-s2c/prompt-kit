/**
 * Pure text utilities extracted from RPChat.
 *
 * These helpers are intentionally written with simple string operations so they
 * remain easy to port to ArkTS/HarmonyOS if needed.
 */

export interface ExtractedMarker {
  /** Text with the trailing marker removed. */
  content: string
  /** Parsed numeric value, or null if no valid marker was found. */
  value: number | null
}

/**
 * Remove `<think>...</think>` blocks from a string.
 * Some providers return reasoning inside the content field; this normalizes it.
 */
export function stripThinkTags(content: string): string {
  let result = ''
  let remaining = content

  while (remaining.length > 0) {
    const thinkStart = remaining.indexOf('<think>')
    if (thinkStart < 0) {
      result += remaining
      break
    }

    result += remaining.substring(0, thinkStart)
    const afterStart = remaining.substring(thinkStart + 7)
    const thinkEnd = afterStart.indexOf('</think>')
    if (thinkEnd < 0) {
      break
    }
    remaining = afterStart.substring(thinkEnd + 8)
  }

  return result.trim()
}

/**
 * Parse an integer that appears as the last line of the text.
 *
 * This generalizes RPChat's affection-delta parser. The caller can optionally
 * constrain the accepted range.
 */
export function extractTrailingInteger(
  text: string,
  range?: { min?: number; max?: number }
): ExtractedMarker {
  const lines = text.split('\n')
  const last = lines[lines.length - 1].trim()
  const num = Number.parseInt(last, 10)

  if (Number.isNaN(num)) {
    return { content: text, value: null }
  }

  const min = range?.min ?? Number.MIN_SAFE_INTEGER
  const max = range?.max ?? Number.MAX_SAFE_INTEGER
  if (num < min || num > max) {
    return { content: text, value: null }
  }

  const content = lines
    .slice(0, lines.length - 1)
    .join('\n')
    .trimEnd()
  return { content, value: num }
}

/**
 * A defensive JSON.parse wrapper that returns null on failure.
 */
export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Remove Markdown fenced code blocks (```json ... ```) from text.
 * Returns the content of the first fenced block if one is found, otherwise
 * returns the original text.
 */
export function stripMarkdownCodeBlocks(text: string): string {
  const match = text.match(/```[a-zA-Z]*\n?([\s\S]*?)```/)
  return match?.[1]?.trim() ?? text.trim()
}
