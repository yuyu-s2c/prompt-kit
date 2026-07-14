import { describe, expect, it } from 'vitest'
import { buildGroupSystemPrompt, buildSystemPrompt, PromptTemplate } from '../src/prompt-builder.js'

describe('buildSystemPrompt', () => {
  it('builds a single-character prompt', () => {
    const prompt = buildSystemPrompt({
      base: 'You are a helpful assistant.',
      character: {
        name: 'Aria',
        personality: 'calm and curious',
      },
      instructions: ['Reply in 1-3 sentences.'],
    })

    expect(prompt).toContain('You are a helpful assistant.')
    expect(prompt).toContain('【角色设定】')
    expect(prompt).toContain('name：Aria')
    expect(prompt).toContain('personality：calm and curious')
    expect(prompt).toContain('【指令】')
    expect(prompt).toContain('- Reply in 1-3 sentences.')
  })

  it('skips empty sections', () => {
    const prompt = buildSystemPrompt({
      character: { name: 'Aria' },
    })

    expect(prompt).not.toContain('【用户设定】')
    expect(prompt).not.toContain('【世界观设定】')
    expect(prompt).toContain('【角色设定】')
  })

  it('renders array fields as bullet lists', () => {
    const prompt = buildSystemPrompt({
      character: { hobbies: ['reading', 'coding'] },
    })

    expect(prompt).toContain('hobbies：')
    expect(prompt).toContain('- reading')
    expect(prompt).toContain('- coding')
  })

  it('respects custom title wrappers', () => {
    const prompt = buildSystemPrompt(
      {
        character: { name: 'Aria' },
      },
      { titleWrapper: ['[', ']'] }
    )

    expect(prompt).toContain('[角色设定]')
  })

  it('renders custom sections', () => {
    const prompt = buildSystemPrompt({
      custom: {
        插件说明: 'This is a plugin context.',
      },
    })

    expect(prompt).toContain('【插件说明】')
    expect(prompt).toContain('This is a plugin context.')
  })
})

describe('buildGroupSystemPrompt', () => {
  it('includes speaker and others', () => {
    const prompt = buildGroupSystemPrompt({
      group: {
        speaker: { name: 'Alice' },
        others: [{ name: 'Bob' }, { name: 'Carol' }],
      },
    })

    expect(prompt).toContain('【当前发言角色】')
    expect(prompt).toContain('【在场角色】')
    expect(prompt).toContain('角色 1：')
    expect(prompt).toContain('name：Bob')
  })
})

describe('PromptTemplate', () => {
  it('renders sections with placeholders', () => {
    const template = new PromptTemplate([
      { key: 'greeting', title: '问候', content: 'Hello {{name}}!' },
    ])

    const result = template.render({ name: 'World' })
    expect(result).toContain('【问候】')
    expect(result).toContain('Hello World!')
  })

  it('skips disabled sections', () => {
    const template = new PromptTemplate([
      { key: 'a', content: 'visible' },
      { key: 'b', content: 'hidden', enabled: false },
    ])

    expect(template.render({})).toBe('【a】\nvisible')
  })
})
