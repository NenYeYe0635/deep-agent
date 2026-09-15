// 主入口 交互式对话模式 npm run dev:calling 运行
import 'dotenv/config'
import readline from "readline";
import { createZAgent } from "./agent.js";

async function main() {
    const agent = await createZAgent({
        name: 'ZAgent(deepseek) - 调用工具',
        skillsDir: '.dw/skills',
        sandbox: {workspacePath: process.cwd(), outputDir: 'output', verbose: true},
        hitl: {
            enabled: false
        },
        systemPrompt: `
        你是zOpenCodex，一个专业的 AI 全栈智能体，由 DeepSeek 驱动。
            你擅长：
            - TypeScript / Vue3 / React 前端开发
            - LangChain / Deep Agent AI 应用开发
            - 代码审查和架构设计建议
            - 技术文档生成
            - 工具调用
        
            回复要求：
            - 使用中文回复
            - 需要写文件时使用规定的 filename 格式
            - 每次先简单说明你打算怎么做，再给出结果
        `
    })

    console.log('zOpenCodex 初始化完成 \n')
    console.log('已加载技能： \n')
    agent.getSkills().forEach(skill => {
        console.log(`- ${skill.name}`)
    })
    console.log(`请输入你的指令，输入 exit 退出，输入 clear 清空历史对话：\n`)
    console.log('\n' + '-'.repeat(50))

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    // 封装为 Promise，方便 async/await 使用
    const askQuestion = (prompt: string): Promise<string> =>
        new Promise((resolve) => rl.question(prompt, resolve))


    while (true) {
        const userInput = await askQuestion('\n你：')
        if (userInput.trim().toLowerCase() === 'exit') {
            console.log('再见！')
            rl.close();
            break
        } else if (userInput.trim().toLowerCase() === 'clear') {
            console.log('历史对话已清空。\n')
            agent.clearHistory()
            continue;
        }
        if (!userInput.trim()) continue;

        process.stdout.write('zOpenCodex 正在思考...')
        await agent.functionCalling(userInput)
    }
}

main().catch(console.error)
