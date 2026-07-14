# prompt-kit

[![npm version](https://img.shields.io/npm/v/prompt-kit.svg)](https://www.npmjs.com/package/prompt-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Gitee Actions](https://img.shields.io/badge/Gitee%20Actions-CI-blue)](https://gitee.com/yu9929/prompt-kit/actions)

一套从 RPChat 里拆出来的、可移植的 prompt 工程小工具。

prompt-kit 把 RPChat 中反复出现的 prompt 拼接、消息组装、SSE 流式解析、标签提取等模式抽象成零依赖的 TypeScript 函数和类，能在 Node.js、浏览器以及 HarmonyOS ArkTS（通过一个薄适配器）里复用。

## 特性

- 🧩 **段落式 System Prompt 构建器**：世界观、角色、用户设定、指令按需拼接
- 💬 **OpenAI / DeepSeek 消息组装**：支持 system + history + user + 追加指令
- 🤖 **轻量 ChatClient**：普通对话、JSON 结构化输出、SSE 流式输出、流式失败自动 fallback
- 🧹 **文本清理工具**：`<think>` 标签剥离、末尾数字标记提取、Markdown 代码块剥离
- 🏷️ **标签映射器**：情绪/风格标签转自然语言指令，内置中文情绪词表
- 🕐 **历史窗口与滚动摘要**：按消息数滑窗、周期性触发摘要合并
- 📦 **零运行时依赖**

## 安装

```bash
npm install prompt-kit
```

## 快速开始

```ts
import {
  buildSystemPrompt,
  assembleChatMessages,
  ChatClient,
  TagMapper,
} from 'prompt-kit'

const system = buildSystemPrompt({
  base: 'You are a helpful assistant.',
  character: { name: 'Aria', personality: 'calm and curious' },
  instructions: ['Reply in 1-3 sentences.', 'Use Markdown lightly.'],
})

const messages = assembleChatMessages({
  systemPrompt: system,
  history: [{ role: 'user', content: 'Hi!' }],
  userMessage: 'Tell me a secret.',
})

const client = new ChatClient({
  apiKey: process.env.API_KEY!,
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
})

const reply = await client.chat(messages)
console.log(reply)

const mapper = new TagMapper()
const instructions = mapper.map(['温柔', '内心独白'])
console.log(instructions)
```

## 在 HarmonyOS ArkTS 中使用

```ts
import { ChatClient } from 'prompt-kit'
import { ArkTSStreamCallbacks, createArkTSFetchAdapter } from 'prompt-kit/arkts'

const client = new ChatClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  fetch: createArkTSFetchAdapter(harmonyOSFetchAdapter),
})

await client.chatStream(messages, new ArkTSStreamCallbacks({
  onContent: (chunk) => console.log(chunk),
}))
```

## API 概览

| 模块 | 主要导出 |
|------|---------|
| `prompt-builder` | `buildSystemPrompt`, `buildGroupSystemPrompt`, `PromptTemplate` |
| `chat-format` | `assembleChatMessages` |
| `chat-client` | `ChatClient` |
| `streaming` | `parseSSEStream`, `readSSEChunks` |
| `tag-mapper` | `TagMapper`, `DEFAULT_CHINESE_EMOTION_MAP` |
| `history` | `windowHistory`, `RollingSummarizer` |
| `utils` | `stripThinkTags`, `extractTrailingInteger` |
| `json-extractor` | `extractJson` |
| `adapters/arkts` | `ArkTSStreamCallbacks`, `createArkTSFetchAdapter` |

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
npm run lint
npm run format:check
npm run coverage
```

## CI / 自动发布

每次 `push` 到 `main` 分支或提交 PR 时，Gitee Actions 会自动运行：

```text
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

### 发布到 npm

1. 在 Gitee 仓库设置里添加 Secret：`NPM_TOKEN`。
2. 更新 `package.json` 中的版本号，例如 `0.1.1`。
3. 提交并推送 tag：

```bash
git add package.json
git commit -m "chore: bump version to 0.1.1"
git tag v0.1.1
git push origin main v0.1.1
```

推送 tag 后，CI 会自动将包发布到 npm。

## 许可

[MIT](LICENSE)
