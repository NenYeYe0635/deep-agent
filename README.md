# deep-agent

> 简易通用型agent。
> 基于openai库，可适配任意支持openai的LLM
> 本地运行

![demo](./assets/demo.gif)

## ✨ 功能

- 💬 多轮对话
- 🛠 Function Calling / 工具调用
- 📄 流式输出
- 🧠 上下文记忆
- 🔌 支持 OpenAI / Claude / 本地模型

## 🚀 快速开始

### 1. 克隆并安装

\`\`\`bash
git clone https://github.com/NenYeYe0635/deep-agent.git
cd deep-agent
npm install
\`\`\`

### 2. 配置环境变量

\`\`\`bash
# .env
# DeepSeek API Key（必填）
# 获取地址：https://platform.deepseek.com/
DEEPSEEK_API_KEY=

# DeepSeek 模型选择（可选，默认 deepseek-chat）
# deepseek-chat     → DeepSeek-V3，速度快，价格低，日常任务首选
# deepseek-reasoner → DeepSeek-R1，带推理链，适合复杂逻辑任务
DEEPSEEK_MODEL=

# Tavily 搜索 API Key（可选，demo-search 和 demo-multi 需要）
# 获取地址：https://app.tavily.com/
# 免费额度：每月 1000 次搜索
TAVILY_API_KEY=

# 温度参数（可选，默认 0.7）
# 0   = 完全精确，几乎无随机性（代码生成推荐）
# 0.7 = 均衡，日常任务推荐
# 1.0 = 高度发散，内容创作推荐
DEEPSEEK_TEMPERATURE=0.7
\`\`\`

### 3. 启动

\`\`\`bash
# 普通对话+文档编写
npm run dev 
# 对话+文档编写+工具调用
npm run dev:calling
\`\`\`


## 🧩 核心代码示例

\`\`\`ts
// 流式调用 + 工具调用累加
const toolCallsAcc = []

for await (const chunk of stream) {
const delta = chunk.choices?.[0]?.delta
if (delta?.tool_calls) {
for (const tc of delta.tool_calls) {
const i = tc.index ?? 0
toolCallsAcc[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
if (tc.id) toolCallsAcc[i].id = tc.id
if (tc.function?.name) toolCallsAcc[i].function.name += tc.function.name
if (tc.function?.arguments) toolCallsAcc[i].function.arguments += tc.function.arguments
}
}
}
\`\`\`


## 📄 License

MIT