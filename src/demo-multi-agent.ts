
// 多智能体协助
// 场景： 一个用户同时需要智能体A 和智能体B 的帮助，A负责提供信息 ，B负责执行任务， 两者需要协作完成用户的需求

import 'dotenv/config'
import {createZAgent, ZAgent} from './agent.js'
import { TavilySearch } from './tools/tavily-serach.js'

// 子智能体A：技术研究员： 负责探索和信息提供
async function researcherAgent(topic: string, search: TavilySearch): Promise<string> {
    console.log(`\n[Researcher研究员] 开始研究主题：${topic}`)
    const results = await search.search(topic, 3)
    const summary = results
        .map((r,i)=>`[${i + 1}] ${r.title}\n来源：${r.url}\n${r.content}`).join('\n\n')
    console.log(`[Researcher研究员] 研究完成，找到 ${results.length} 条相关信息`)
    return summary
}

// 子智能体B 内部分析师
async function analystAgent(agent: ZAgent, rawData: string, aspect: string): Promise<string> {
    console.log(`\n[Analyst分析师] ${aspect}`)
    const results = await agent.invoke(`请分析以下资料，提取关于 [${aspect}] 的核心观点，用简介的要点形式输出（3-5点）:
    ${rawData}
    输出格式：
    ## ${aspect}
    - 要点1
    - 要点2
    - 要点3
    `)
    console.log(`\n[Analyst分析师] 分析完成，提取了关于 [${aspect}] 的核心观点`)
    return results.content
}

// 子智能体C： 执行者 负责整合并输出最终结果 （生成一个报告 文件）
async function writerAgent(agent: ZAgent, sections: Record<string, string>, title: string): Promise<string> {
    console.log(`\n[writer写作者] 开始撰写报告：${title}`)
    const sectionsTest = Object.entries(sections).map(([key, value]) => `## ${key}\n${value}`).join('\n\n')

    const reportContent = await agent.invoke(`
    请根据以下各部分内容整合成一份完整、专业的技术调研报告。
    
    报告标题：${title}
    
    各部分内容：${sectionsTest}
    
    要求：
    1.输出完整 Markdown 格式
    2.包含摘要、正文、结论三部分
    3.语言专业简介
    4.将完整报告写入文件：
    \`\`\`
    filename:tech-research-report.md
    (完整报告内容)
    \`\`\`
    `)

    // 写入文件
    console.log(`[writer写作者] 报告已生成并写入 tech-research-report.md`)
    return reportContent.content
}

// 主智能体编排
async function main() {
    if(!process.env.TAVILY_API_KEY) {
        console.error('请设置 TAVILY_API_KEY 环境变量，跳过搜索功能')
    }

    const mainAgent = await createZAgent({
        name: 'ZAgent(deepseek) - 搜索 + 生成文件 写入文件',
        skillsDir: '.dw/skills',
        sandbox: {workspacePath: process.cwd(), outputDir: 'output', verbose: true},
        hitl: {
            enabled: false
        },
    })

    const search = process.env.TAVILY_API_KEY ? new TavilySearch(process.env.TAVILY_API_KEY) : null

    const reportTitle = '2026年前端 AI 智能体开发技术调研报告'
    console.log(`\n 主智能体开始 Planning：${reportTitle}`)
    console.log('任务解析：')
    console.log(` -> 子智能体 A （Researcher）：并行搜索各技术方向资料`)
    console.log(` -> 子智能体 B （Analyst）：并行分析各维度核心观点`)
    console.log(` -> 子智能体 C （Writer）：整合输出完整报告`)

    // Step 1 并行搜索
    console.log('\n' + '='.repeat(50))
    console.log('Step 1：并行搜索阶段')
    console.log('\n' + '='.repeat(50))

    let frameworkData = 'LangChain 是基础框架，LangGraph做状态编排，Deep Agent做通用智能体开箱即用'
    let scenarioData = '前端工程师做 AI 应用有天然优势：TypeScript 支持好，UI 能力强，工程化熟练'

    if (search) {
        [frameworkData, scenarioData] = await Promise.all([
            researcherAgent('LangChain LangGraph Deep Agent 框架对比 2026', search),
            researcherAgent('前端工程师 AI 应用开发 TypeScript 智能体 2026', search)
        ])
    }

    // Step 2 并行分析
    console.log('\n' + '='.repeat(50))
    console.log('Step 2：并行分析阶段')
    console.log('\n' + '='.repeat(50))

    const analystAgentInstance = await createZAgent({
        name: '分析师智能体 ZAgent',
        skillsDir: '.dw/skills',
        sandbox: {workspacePath: process.cwd(), outputDir: 'output', verbose: true},
        hitl: {
            enabled: false
        },
    })

    const [frameworkAnalyst, scenarioAnalyst] = await Promise.all([
        analystAgent(analystAgentInstance, frameworkData, '框架对比分析'),
        analystAgent(analystAgentInstance, scenarioData, '前端优势分析'),
    ])


    // Step 3 写作输出
    console.log('\n' + '='.repeat(50))
    console.log('Step 3：写作输出阶段')
    console.log('\n' + '='.repeat(50))

    await writerAgent(mainAgent, {
        '框架对比分析': frameworkAnalyst,
        '前端优势分析': scenarioAnalyst
    }, reportTitle)

    // 汇总结果
    const sandbox = mainAgent.getSendBox()
    if(sandbox) {
        const files = sandbox.listFiles()
        console.log('\n' + '='.repeat(50))
        console.log('多智能体协作完成！')
        console.log('\n' + '='.repeat(50))
        console.log('生成文件列表：')
        files.forEach(file=> {
            console.log(`- output/${file}`)
        })
        const report = sandbox.readFile('tech-research-report.md')

        if(report) {
            console.log(`\n报告内容预览：\n${report.slice(0,500)}……`) // 预览前500字符
            console.log('\n' + '-'.repeat(50))
        }
    }

}

main().catch(console.error)

