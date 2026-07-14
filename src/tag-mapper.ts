/**
 * Label-to-instruction mapping, extracted from RPChat's emotion context map.
 */

export type TagDictionary = Record<string, string>

export interface TagMapperOptions {
  /** Called when a label has no matching dictionary entry. */
  fallback?: (label: string) => string
  /** Prepended to every mapped instruction. */
  prefix?: string
  /** Appended to every mapped instruction. */
  suffix?: string
}

/**
 * Default Chinese emotion → TTS/prompt instruction map.
 */
export const DEFAULT_CHINESE_EMOTION_MAP: TagDictionary = {
  温柔: '用温柔的语气说，声音柔和、语调温暖',
  开心: '用开心兴奋的语气说，语调轻快上扬',
  悲伤: '用悲伤低落的语气说，语速缓慢、声音低沉',
  愤怒: '用愤怒的语气说，语速加快、语调加重',
  惊讶: '用惊讶的语气说，语调上扬、语速稍快',
  害羞: '用害羞内敛的语气说，声音轻柔、断断续续',
  冷酷: '用冷酷平静的语气说，语调平稳、不带感情',
  调皮: '用调皮活泼的语气说，语调轻快、略带俏皮',
  成熟: '用成熟稳重的语气说，语速适中、语调低沉',
  可爱: '用可爱撒娇的语气说，语调软糯、尾音上扬',
  严肃: '用严肃认真的语气说，语速放慢、语调平稳',
  疲惫: '用疲惫无力的语气说，语速缓慢、声音低沉',
  兴奋: '用兴奋激动的语气说，语速加快、语调高亢',
  平静: '用平静淡然的语气说，语速均匀、语调自然',
}

/**
 * Prefix for inner-voice / self-talk style instructions.
 */
export const INNER_VOICE_PREFIX = '用内心独白的语气说，声音轻柔、内敛、仿佛自言自语'

/**
 * Map a list of labels to natural-language instructions.
 */
export class TagMapper {
  private dict: TagDictionary
  private fallback?: (label: string) => string
  private prefix: string
  private suffix: string

  constructor(dict: TagDictionary = DEFAULT_CHINESE_EMOTION_MAP, options: TagMapperOptions = {}) {
    this.dict = { ...dict }
    this.fallback = options.fallback
    this.prefix = options.prefix ?? ''
    this.suffix = options.suffix ?? ''
  }

  map(labels: string[]): string[] {
    const result: string[] = []
    for (const label of labels) {
      const trimmed = label.trim()
      if (trimmed.length === 0) continue

      const instruction = this.dict[trimmed] ?? this.fallback?.(trimmed)
      if (instruction !== undefined) {
        result.push(`${this.prefix}${instruction}${this.suffix}`)
      }
    }
    return result
  }

  mapJoined(labels: string[], separator = '\n'): string {
    return this.map(labels).join(separator)
  }

  add(label: string, instruction: string): void {
    this.dict[label] = instruction
  }

  remove(label: string): void {
    delete this.dict[label]
  }
}
