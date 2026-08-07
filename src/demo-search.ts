
// 搜索 + 生成文件 写入文件 完整链路

import 'dotenv/config'
import { createZAgent } from './agent.js'
import { TavilySearch } from './tools/tavily-serach.js'

async function main() {
    if(!process.env.TAVILY_API_KEY) {
        console.error('请设置 TAVILY_API_KEY 环境变量')
        process.exit(1) // 控制台退出执行
    }

    const search = new TavilySearch(process.env.TAVILY_API_KEY)

    const agent = await createZAgent({
        name: 'ZAgent(deepseek) - 搜索 + 生成文件 写入文件',
        skillsDir: '.dw/skills',
        sandbox: {workspacePath: process.cwd(), outputDir: 'output', verbose: true},
        hitl: {enabled: false},
        systemPrompt: `
        你是一个具备网络搜索能力的 AI 助手，由 Deepseek 驱动
        需要写文件时，使用以下格式：
        \`\`\`\`filename:文件名.md
        文件内容
        \`\`\`\`
        `,
    })

    const query = 'LangChain Deep Agent 快速入门教程 2026'

    console.log(`\n用户查询：${query}\n`)

    const searchResults = await search.search(query)
    console.log(`搜索结果：获取到 ${searchResults.length} 条结果`)

    const humanMessage = `请根据以下搜索结果，总结 LangChain Deep Agent 的核心概念和快速入门步骤，
    输出一份清晰的中文学习笔记，并保存到文件 deep-agent-notes.md。
    
    搜索结果：
    ${searchResults.map((r,i)=>`[${i + 1}] ${r.title}\n来源：${r.url}\n摘要：${r.content}`).join('\n---\n')}
    
    要求：
    1.用简洁的中午总结
    2.包含核心概念解释
    3.包含快速入门步骤
    4.写入文件 deep-agent-notes.md
    `

    const results = await agent.invokeStream(humanMessage)
    if (results.filesWritten.length === 0) {
        const sandbox = agent.getSendBox()
        if (sandbox) {
            await sandbox.writeFile('deep-agent-notes.md', results.content)
            console.log('\n文件 deep-agent-notes.md 已写入沙箱输出目录 output/')
        }
    }
}

main().catch(console.error)
