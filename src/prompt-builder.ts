/**
 * Section-based System Prompt builder.
 *
 * The builder generalizes RPChat's `buildSystemPrompt` and
 * `buildGroupSystemPrompt` functions by accepting plain data maps instead of
 * domain-specific model classes.
 */

export interface PromptSection {
  /** Section key, used as a default label if no title is provided. */
  key: string
  /** Display title, e.g. "角色设定". */
  title?: string
  /** Section body. Strings are rendered as-is; arrays become bullet lists. */
  content: string | string[]
  /** If false, the section is skipped. Defaults to true. */
  enabled?: boolean
  /** Optional ordering hint (not yet implemented; reserved for future use). */
  order?: number
}

export interface SystemPromptContext {
  /** Optional opening paragraph that precedes all sections. */
  base?: string
  /** User/persona section. */
  persona?: Record<string, string | string[]>
  /** World/background section. */
  world?: Record<string, string | string[]>
  /** Character/agent section. */
  character?: Record<string, string | string[]>
  /** Ordered instruction list. */
  instructions?: string[]
  /** Ordered constraint list. */
  constraints?: string[]
  /** Group chat context. */
  group?: {
    speaker?: Record<string, string | string[]>
    others?: Record<string, string | string[]>[]
    mode?: 'all-answer' | 'single-answer'
  }
  /** Any additional sections rendered last. */
  custom?: Record<string, string | string[] | Record<string, string | string[]>>
}

export interface BuildPromptOptions {
  /** Separator between sections. Defaults to two newlines. */
  lineSeparator?: string
  /** Include fields whose values are empty strings. */
  includeEmpty?: boolean
  /** Wrappers around section titles. Defaults to Chinese brackets. */
  titleWrapper?: [string, string]
}

function formatSectionContent(
  fields: Record<string, string | string[]>,
  options: Required<Pick<BuildPromptOptions, 'includeEmpty'>>
): string {
  const lines: string[] = []

  for (const [key, raw] of Object.entries(fields)) {
    if (Array.isArray(raw)) {
      const items = options.includeEmpty ? raw : raw.filter((item) => item.trim().length > 0)
      if (items.length === 0) continue
      lines.push(`${key}：`)
      for (const item of items) {
        lines.push(`- ${item}`)
      }
    } else {
      if (!options.includeEmpty && raw.trim().length === 0) continue
      lines.push(`${key}：${raw}`)
    }
  }

  return lines.join('\n')
}

function renderSection(
  title: string,
  fields: Record<string, string | string[]> | undefined,
  options: Required<BuildPromptOptions>
): string {
  if (!fields || Object.keys(fields).length === 0) {
    return ''
  }

  const body = formatSectionContent(fields, { includeEmpty: options.includeEmpty })
  if (body.length === 0) {
    return ''
  }

  const [open, close] = options.titleWrapper
  return `${open}${title}${close}\n${body}`
}

function buildOptions(options?: BuildPromptOptions): Required<BuildPromptOptions> {
  return {
    lineSeparator: options?.lineSeparator ?? '\n\n',
    includeEmpty: options?.includeEmpty ?? false,
    titleWrapper: options?.titleWrapper ?? ['【', '】'],
  }
}

/**
 * Build a single-character System Prompt from a context map.
 */
export function buildSystemPrompt(ctx: SystemPromptContext, options?: BuildPromptOptions): string {
  const opts = buildOptions(options)
  const sections: string[] = []

  if (ctx.base && ctx.base.trim().length > 0) {
    sections.push(ctx.base.trim())
  }

  const persona = renderSection('用户设定', ctx.persona, opts)
  if (persona) sections.push(persona)

  const world = renderSection('世界观设定', ctx.world, opts)
  if (world) sections.push(world)

  const character = renderSection('角色设定', ctx.character, opts)
  if (character) sections.push(character)

  if (ctx.instructions && ctx.instructions.length > 0) {
    const items = opts.includeEmpty
      ? ctx.instructions
      : ctx.instructions.filter((item) => item.trim().length > 0)
    if (items.length > 0) {
      const [open, close] = opts.titleWrapper
      sections.push(`${open}指令${close}\n${items.map((item) => `- ${item}`).join('\n')}`)
    }
  }

  if (ctx.constraints && ctx.constraints.length > 0) {
    const items = opts.includeEmpty
      ? ctx.constraints
      : ctx.constraints.filter((item) => item.trim().length > 0)
    if (items.length > 0) {
      const [open, close] = opts.titleWrapper
      sections.push(`${open}约束${close}\n${items.map((item) => `- ${item}`).join('\n')}`)
    }
  }

  if (ctx.custom) {
    const [open, close] = opts.titleWrapper
    for (const [title, fields] of Object.entries(ctx.custom)) {
      let section = ''
      if (typeof fields === 'string') {
        section = `${open}${title}${close}\n${fields}`
      } else if (Array.isArray(fields)) {
        const items = opts.includeEmpty ? fields : fields.filter((item) => item.trim().length > 0)
        if (items.length > 0) {
          section = `${open}${title}${close}\n${items.map((item) => `- ${item}`).join('\n')}`
        }
      } else {
        section = renderSection(title, fields, opts)
      }
      if (section) sections.push(section)
    }
  }

  return sections.join(opts.lineSeparator)
}

/**
 * Build a group-chat System Prompt where multiple characters share a scene.
 */
export function buildGroupSystemPrompt(
  ctx: SystemPromptContext,
  options?: BuildPromptOptions
): string {
  const opts = buildOptions(options)
  const sections: string[] = []

  if (ctx.base && ctx.base.trim().length > 0) {
    sections.push(ctx.base.trim())
  }

  const persona = renderSection('用户设定', ctx.persona, opts)
  if (persona) sections.push(persona)

  const world = renderSection('世界观设定', ctx.world, opts)
  if (world) sections.push(world)

  const speaker = renderSection('当前发言角色', ctx.group?.speaker, opts)
  if (speaker) sections.push(speaker)

  const others = ctx.group?.others
  if (others && others.length > 0) {
    const [open, close] = opts.titleWrapper
    const lines: string[] = [`${open}在场角色${close}`]
    for (let i = 0; i < others.length; i++) {
      const body = formatSectionContent(others[i] ?? {}, { includeEmpty: opts.includeEmpty })
      if (body.length > 0) {
        lines.push(`角色 ${i + 1}：`)
        lines.push(
          body
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n')
        )
      }
    }
    sections.push(lines.join('\n'))
  }

  const character = renderSection('角色设定', ctx.character, opts)
  if (character) sections.push(character)

  if (ctx.instructions && ctx.instructions.length > 0) {
    const items = opts.includeEmpty
      ? ctx.instructions
      : ctx.instructions.filter((item) => item.trim().length > 0)
    if (items.length > 0) {
      const [open, close] = opts.titleWrapper
      sections.push(`${open}指令${close}\n${items.map((item) => `- ${item}`).join('\n')}`)
    }
  }

  if (ctx.constraints && ctx.constraints.length > 0) {
    const items = opts.includeEmpty
      ? ctx.constraints
      : ctx.constraints.filter((item) => item.trim().length > 0)
    if (items.length > 0) {
      const [open, close] = opts.titleWrapper
      sections.push(`${open}约束${close}\n${items.map((item) => `- ${item}`).join('\n')}`)
    }
  }

  if (ctx.custom) {
    const [open, close] = opts.titleWrapper
    for (const [title, fields] of Object.entries(ctx.custom)) {
      let section = ''
      if (typeof fields === 'string') {
        section = `${open}${title}${close}\n${fields}`
      } else if (Array.isArray(fields)) {
        const items = opts.includeEmpty ? fields : fields.filter((item) => item.trim().length > 0)
        if (items.length > 0) {
          section = `${open}${title}${close}\n${items.map((item) => `- ${item}`).join('\n')}`
        }
      } else {
        section = renderSection(title, fields, opts)
      }
      if (section) sections.push(section)
    }
  }

  return sections.join(opts.lineSeparator)
}

/**
 * A reusable, ordered list of prompt sections.
 */
export class PromptTemplate {
  private sections: PromptSection[]

  constructor(sections: PromptSection[] = []) {
    this.sections = [...sections]
  }

  add(section: PromptSection): void {
    this.sections.push(section)
  }

  render(ctx: Record<string, string | string[]>, options?: BuildPromptOptions): string {
    const opts = buildOptions(options)
    const [open, close] = opts.titleWrapper
    const parts: string[] = []

    for (const section of this.sections) {
      if (section.enabled === false) continue

      const title = section.title ?? section.key
      const content =
        typeof section.content === 'string' ? section.content : section.content.join('\n')

      if (!opts.includeEmpty && content.trim().length === 0) continue

      // Replace `{{key}}` placeholders with values from ctx.
      let resolved = content
      for (const [key, value] of Object.entries(ctx)) {
        const replacement = Array.isArray(value) ? value.join('\n') : value
        resolved = resolved.split(`{{${key}}}`).join(replacement)
      }

      parts.push(`${open}${title}${close}\n${resolved}`)
    }

    return parts.join(opts.lineSeparator)
  }
}
